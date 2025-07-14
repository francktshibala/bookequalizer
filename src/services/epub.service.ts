import { promises as fs } from 'fs';
import path from 'path';
import EPub from 'epub2';
import * as cheerio from 'cheerio';
import mime from 'mime-types';
import sharp from 'sharp';
import { logger } from '../utils/logger';
import { config } from '../config/environment';
import { prisma } from '../database/client';

export interface EPubMetadata {
  title: string;
  author: string;
  isbn?: string;
  language?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  coverImage?: string;
  totalPages?: number;
  wordCount?: number;
}

export interface EPubChapter {
  id: string;
  title: string;
  content: string;
  order: number;
  wordCount: number;
  characterCount: number;
}

export interface EPubProcessingResult {
  metadata: EPubMetadata;
  chapters: EPubChapter[];
  filePath: string;
  fileSize: number;
  processingTime: number;
}

export class EPubService {
  private uploadsDir: string;
  private tempDir: string;

  constructor() {
    this.uploadsDir = config.uploadPath;
    this.tempDir = path.join(config.uploadPath, 'temp');
    this.initializeDirectories();
  }

  private async initializeDirectories() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
      logger.info('📂 EPUB directories initialized');
    } catch (error) {
      logger.error('Failed to initialize EPUB directories:', error);
    }
  }

  async processEPubFile(filePath: string, _userId: string): Promise<EPubProcessingResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`📖 Processing EPUB file: ${filePath}`);

      // Validate file exists and is readable
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        throw new Error('Invalid file path');
      }

      // Parse EPUB
      const epub = await this.parseEPub(filePath);
      const metadata = await this.extractMetadata(epub);
      const chapters = await this.extractChapters(epub);

      // Process cover image if available
      if (epub.metadata.cover) {
        try {
          metadata.coverImage = await this.processCoverImage(epub, filePath);
        } catch (coverError) {
          logger.warn('Failed to process cover image:', coverError);
        }
      }

      // Calculate total word count
      const totalWordCount = chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0);
      metadata.wordCount = totalWordCount;

      // Estimate page count (250 words per page average)
      metadata.totalPages = Math.ceil(totalWordCount / 250);

      const processingTime = Date.now() - startTime;

      logger.info(`✅ EPUB processed: ${metadata.title} (${chapters.length} chapters, ${totalWordCount} words, ${processingTime}ms)`);

      return {
        metadata,
        chapters,
        filePath,
        fileSize: stats.size,
        processingTime,
      };
    } catch (error) {
      logger.error('EPUB processing failed:', error);
      throw error;
    }
  }

  private async parseEPub(filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const epub = new EPub(filePath);
      
      epub.on('end', () => {
        resolve(epub);
      });

      epub.on('error', (error) => {
        reject(error);
      });

      epub.parse();
    });
  }

  private async extractMetadata(epub: any): Promise<EPubMetadata> {
    try {
      const metadata: EPubMetadata = {
        title: epub.metadata.title || 'Unknown Title',
        author: this.formatAuthor(epub.metadata.creator) || 'Unknown Author',
        isbn: epub.metadata.ISBN || epub.metadata.identifier,
        language: epub.metadata.language || 'en',
        publisher: epub.metadata.publisher,
        publishedDate: epub.metadata.date,
        description: epub.metadata.description,
      };

      return metadata;
    } catch (error) {
      logger.error('Failed to extract metadata:', error);
      throw error;
    }
  }

  private formatAuthor(creator: any): string {
    if (typeof creator === 'string') {
      return creator;
    }
    
    if (Array.isArray(creator)) {
      return creator.join(', ');
    }
    
    if (creator && typeof creator === 'object') {
      return creator.name || creator.value || 'Unknown Author';
    }
    
    return 'Unknown Author';
  }

  private async extractChapters(epub: any): Promise<EPubChapter[]> {
    try {
      const chapters: EPubChapter[] = [];
      const spine = epub.spine;

      for (let i = 0; i < spine.contents.length; i++) {
        const item = spine.contents[i];
        
        try {
          // Get chapter content
          const chapterContent = await this.getChapterContent(epub, item.id);
          
          if (!chapterContent || chapterContent.trim().length === 0) {
            continue; // Skip empty chapters
          }

          // Extract text content and clean HTML
          const cleanContent = this.cleanHtmlContent(chapterContent);
          
          if (cleanContent.length < 100) {
            continue; // Skip very short chapters (likely TOC or covers)
          }

          const chapter: EPubChapter = {
            id: item.id,
            title: item.title || `Chapter ${chapters.length + 1}`,
            content: cleanContent,
            order: chapters.length + 1,
            wordCount: this.countWords(cleanContent),
            characterCount: cleanContent.length,
          };

          chapters.push(chapter);
        } catch (chapterError) {
          logger.warn(`Failed to process chapter ${item.id}:`, chapterError);
          continue; // Skip problematic chapters
        }
      }

      if (chapters.length === 0) {
        throw new Error('No readable chapters found in EPUB');
      }

      return chapters;
    } catch (error) {
      logger.error('Failed to extract chapters:', error);
      throw error;
    }
  }

  private async getChapterContent(epub: any, chapterId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      epub.getChapter(chapterId, (error: any, content: string) => {
        if (error) {
          reject(error);
        } else {
          resolve(content);
        }
      });
    });
  }

  private cleanHtmlContent(htmlContent: string): string {
    try {
      const $ = cheerio.load(htmlContent);
      
      // Remove script and style elements
      $('script, style, noscript').remove();
      
      // Remove navigation elements
      $('nav, .nav, #nav, .navigation').remove();
      
      // Get text content and clean up
      let text = $.text();
      
      // Normalize whitespace
      text = text.replace(/\s+/g, ' ');
      text = text.replace(/\n\s*\n/g, '\n\n');
      text = text.trim();
      
      return text;
    } catch (error) {
      logger.warn('Failed to clean HTML content, using raw text:', error);
      // Fallback: simple HTML tag removal
      return htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private async processCoverImage(epub: any, _epubFilePath: string): Promise<string> {
    try {
      const coverItem = epub.metadata.cover;
      if (!coverItem) {
        return '';
      }

      // Get cover image data
      const imageData = await this.getCoverImageData(epub, coverItem);
      if (!imageData) {
        return '';
      }

      // Generate unique filename
      const timestamp = Date.now();
      const extension = this.getImageExtension(coverItem);
      const filename = `cover_${timestamp}.${extension}`;
      const outputPath = path.join(this.uploadsDir, 'covers', filename);

      // Ensure covers directory exists
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      // Resize and optimize cover image
      await sharp(imageData)
        .resize(400, 600, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .jpeg({ quality: 85 })
        .toFile(outputPath);

      return `/covers/${filename}`;
    } catch (error) {
      logger.warn('Failed to process cover image:', error);
      return '';
    }
  }

  private async getCoverImageData(epub: any, coverId: string): Promise<Buffer | null> {
    return new Promise((resolve, reject) => {
      epub.getImage(coverId, (error: any, data: Buffer, _mimeType: string) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
    });
  }

  private getImageExtension(coverItem: any): string {
    if (coverItem.extension) {
      return coverItem.extension;
    }
    
    if (coverItem.type) {
      const ext = mime.extension(coverItem.type);
      return ext || 'jpg';
    }
    
    return 'jpg';
  }

  async saveToDatabase(
    processingResult: EPubProcessingResult,
    userId: string
  ): Promise<{ bookId: string; chapterIds: string[] }> {
    try {
      logger.info(`💾 Saving EPUB to database: ${processingResult.metadata.title}`);

      // Create book record
      const book = await prisma.book.create({
        data: {
          title: processingResult.metadata.title,
          author: processingResult.metadata.author,
          isbn: processingResult.metadata.isbn || null,
          epubFilePath: processingResult.filePath,
          epubFileSize: processingResult.fileSize,
          totalPages: processingResult.metadata.totalPages || null,
          wordCount: processingResult.metadata.wordCount || null,
          hasAudio: false,
          audioGenerationStatus: 'PENDING',
        },
      });

      // Create chapters
      const chapterIds: string[] = [];
      for (const chapter of processingResult.chapters) {
        const dbChapter = await prisma.chapter.create({
          data: {
            bookId: book.id,
            chapterNumber: chapter.order,
            title: chapter.title,
            content: chapter.content,
            wordCount: chapter.wordCount,
            characterCount: chapter.characterCount,
          },
        });
        chapterIds.push(dbChapter.id);
      }

      // Create initial reading session for the user
      await prisma.readingSession.create({
        data: {
          userId,
          bookId: book.id,
          textPositionPercent: 0,
          audioPositionSeconds: 0,
          readingMode: 'TEXT',
          isActive: true,
        },
      });

      logger.info(`✅ EPUB saved to database: ${book.title} (${chapterIds.length} chapters)`);

      return {
        bookId: book.id,
        chapterIds,
      };
    } catch (error) {
      logger.error('Failed to save EPUB to database:', error);
      throw error;
    }
  }

  async preprocessForAudio(chapterContent: string): Promise<{
    processedText: string;
    segments: Array<{ text: string; start: number; end: number }>;
  }> {
    try {
      // Clean text for better TTS
      let processedText = chapterContent;
      
      // Fix common abbreviations for better pronunciation
      const abbreviations = {
        'Mr.': 'Mister',
        'Mrs.': 'Missus',
        'Ms.': 'Miss',
        'Dr.': 'Doctor',
        'Prof.': 'Professor',
        'St.': 'Street',
        'Ave.': 'Avenue',
        'Blvd.': 'Boulevard',
        'etc.': 'et cetera',
        'vs.': 'versus',
        'i.e.': 'that is',
        'e.g.': 'for example',
      };

      for (const [abbrev, full] of Object.entries(abbreviations)) {
        const regex = new RegExp(`\\b${abbrev.replace('.', '\\.')}`, 'g');
        processedText = processedText.replace(regex, full);
      }

      // Split into sentences for better audio segmentation
      const sentences = processedText.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const segments = [];
      let currentPosition = 0;

      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (trimmed.length > 0) {
          segments.push({
            text: trimmed,
            start: currentPosition,
            end: currentPosition + trimmed.length,
          });
          currentPosition += trimmed.length + 1; // +1 for punctuation
        }
      }

      return {
        processedText,
        segments,
      };
    } catch (error) {
      logger.error('Failed to preprocess text for audio:', error);
      throw error;
    }
  }

  async validateEPubFile(filePath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check file size (max 50MB)
      const stats = await fs.stat(filePath);
      if (stats.size > config.maxFileSize) {
        return {
          valid: false,
          error: `File too large. Maximum size is ${config.maxFileSize / 1024 / 1024}MB`,
        };
      }

      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.epub') {
        return {
          valid: false,
          error: 'Invalid file type. Only EPUB files are supported',
        };
      }

      // Try to parse EPUB
      try {
        await this.parseEPub(filePath);
      } catch (parseError) {
        return {
          valid: false,
          error: 'Invalid EPUB file format',
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: 'Failed to validate file',
      };
    }
  }

  async cleanupTempFiles(maxAge: number = 3600000): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      const cutoff = Date.now() - maxAge;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoff) {
          await fs.unlink(filePath);
          logger.debug(`Cleaned up temp file: ${file}`);
        }
      }
    } catch (error) {
      logger.warn('Failed to cleanup temp files:', error);
    }
  }
}

export const epubService = new EPubService();