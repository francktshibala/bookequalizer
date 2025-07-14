import NodeCache from 'node-cache';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { config } from '../config/environment';
import { prisma } from '../database/client';

// In-memory cache for frequently accessed audio metadata (5 minutes TTL)
const metadataCache = new NodeCache({ stdTTL: 300 });

// Audio file cache for recently accessed files (15 minutes TTL)
const audioFileCache = new NodeCache({ stdTTL: 900, maxKeys: 50 });

export interface AudioCacheEntry {
  filePath: string;
  buffer: Buffer;
  contentType: string;
  lastAccessed: Date;
  size: number;
  etag: string;
}

export interface CacheStats {
  metadataHits: number;
  metadataMisses: number;
  fileHits: number;
  fileMisses: number;
  totalSize: number;
  entryCount: number;
}

export class AudioCacheService {
  private stats: CacheStats = {
    metadataHits: 0,
    metadataMisses: 0,
    fileHits: 0,
    fileMisses: 0,
    totalSize: 0,
    entryCount: 0,
  };

  constructor() {
    this.initializeDirectories();
    this.startCleanupScheduler();
  }

  private async initializeDirectories() {
    try {
      // Create audio storage directories
      await fs.mkdir(config.audioPath, { recursive: true });
      await fs.mkdir(path.join(config.audioPath, 'temp'), { recursive: true });
      await fs.mkdir(path.join(config.audioPath, 'processed'), { recursive: true });
      
      logger.info('📂 Audio cache directories initialized');
    } catch (error) {
      logger.error('Failed to initialize audio directories:', error);
    }
  }

  private startCleanupScheduler() {
    // Run cache cleanup every hour
    setInterval(() => {
      this.cleanupExpiredFiles();
    }, 3600000); // 1 hour
  }

  async cacheAudioFile(audioFileId: string, buffer: Buffer): Promise<AudioCacheEntry> {
    try {
      const etag = this.generateETag(buffer);
      const cacheKey = `audio_${audioFileId}`;
      
      // Check if already cached in memory
      const existing = audioFileCache.get<AudioCacheEntry>(cacheKey);
      if (existing && existing.etag === etag) {
        existing.lastAccessed = new Date();
        this.stats.fileHits++;
        return existing;
      }

      // Store in memory cache
      const entry: AudioCacheEntry = {
        filePath: `cached_${audioFileId}`,
        buffer,
        contentType: 'audio/mpeg',
        lastAccessed: new Date(),
        size: buffer.length,
        etag,
      };

      audioFileCache.set(cacheKey, entry);
      this.stats.fileMisses++;
      this.stats.totalSize += buffer.length;
      this.stats.entryCount++;

      logger.debug(`Audio file cached: ${audioFileId}, size: ${buffer.length} bytes`);
      return entry;
    } catch (error) {
      logger.error('Failed to cache audio file:', error);
      throw error;
    }
  }

  async getCachedAudioFile(audioFileId: string): Promise<AudioCacheEntry | null> {
    try {
      const cacheKey = `audio_${audioFileId}`;
      
      // Check memory cache first
      const cached = audioFileCache.get<AudioCacheEntry>(cacheKey);
      if (cached) {
        cached.lastAccessed = new Date();
        this.stats.fileHits++;
        return cached;
      }

      // Check database for file path
      const audioFile = await prisma.audioFile.findUnique({
        where: { id: audioFileId },
      });

      if (!audioFile) {
        this.stats.fileMisses++;
        return null;
      }

      // Load from disk and cache
      try {
        const buffer = await fs.readFile(audioFile.filePath);
        const entry = await this.cacheAudioFile(audioFileId, buffer);
        return entry;
      } catch (fileError) {
        logger.warn(`Audio file not found on disk: ${audioFile.filePath}`);
        this.stats.fileMisses++;
        return null;
      }
    } catch (error) {
      logger.error('Failed to get cached audio file:', error);
      this.stats.fileMisses++;
      return null;
    }
  }

  async cacheAudioMetadata(key: string, metadata: any): Promise<void> {
    try {
      metadataCache.set(key, metadata);
      logger.debug(`Metadata cached: ${key}`);
    } catch (error) {
      logger.error('Failed to cache metadata:', error);
    }
  }

  async getCachedMetadata<T>(key: string): Promise<T | null> {
    try {
      const cached = metadataCache.get<T>(key);
      if (cached) {
        this.stats.metadataHits++;
        return cached;
      } else {
        this.stats.metadataMisses++;
        return null;
      }
    } catch (error) {
      logger.error('Failed to get cached metadata:', error);
      this.stats.metadataMisses++;
      return null;
    }
  }

  async optimizeAudioFile(inputPath: string, outputPath: string, _options: {
    bitrate?: number;
    sampleRate?: number;
    quality?: 'low' | 'medium' | 'high';
  } = {}): Promise<{ size: number; duration: number }> {
    try {
      // For now, just copy the file - in production use ffmpeg
      const inputBuffer = await fs.readFile(inputPath);
      await fs.writeFile(outputPath, inputBuffer);
      
      const stats = await fs.stat(outputPath);
      
      // Rough duration estimate (1KB ≈ 0.125 seconds for MP3)
      const duration = Math.round((stats.size / 1024) * 0.125 * 100) / 100;
      
      logger.debug(`Audio optimized: ${inputPath} -> ${outputPath}, ${stats.size} bytes, ${duration}s`);
      
      return {
        size: stats.size,
        duration,
      };
    } catch (error) {
      logger.error('Audio optimization failed:', error);
      throw error;
    }
  }

  async preloadBookAudio(bookId: string): Promise<void> {
    try {
      // Get all audio files for the book
      const audioFiles = await prisma.audioFile.findMany({
        where: { bookId },
        include: { chapters: true },
      });

      // Preload first 3 chapters into cache
      const priorityFiles = audioFiles
        .filter(af => af.chapters.length > 0)
        .sort((a, b) => (a.chapters[0]?.chapterNumber || 0) - (b.chapters[0]?.chapterNumber || 0))
        .slice(0, 3);

      for (const audioFile of priorityFiles) {
        try {
          const buffer = await fs.readFile(audioFile.filePath);
          await this.cacheAudioFile(audioFile.id, buffer);
        } catch (error) {
          logger.warn(`Failed to preload audio file ${audioFile.id}:`, error);
        }
      }

      logger.info(`Preloaded ${priorityFiles.length} audio files for book ${bookId}`);
    } catch (error) {
      logger.error('Failed to preload book audio:', error);
    }
  }

  async generateAudioSegments(audioFileId: string, chapterText: string): Promise<{
    segments: Array<{ start: number; end: number; text: string }>;
    totalDuration: number;
  }> {
    try {
      // Simple segmentation by sentences
      const sentences = chapterText.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const segments = [];
      let currentTime = 0;
      
      for (const sentence of sentences) {
        const duration = this.estimateTextDuration(sentence.trim());
        segments.push({
          start: currentTime,
          end: currentTime + duration,
          text: sentence.trim(),
        });
        currentTime += duration;
      }

      // Cache segments for later use
      await this.cacheAudioMetadata(`segments_${audioFileId}`, segments);

      return {
        segments,
        totalDuration: currentTime,
      };
    } catch (error) {
      logger.error('Failed to generate audio segments:', error);
      throw error;
    }
  }

  private estimateTextDuration(text: string): number {
    // Rough estimate: 150 words per minute, average 5 characters per word
    const words = text.length / 5;
    const minutes = words / 150;
    return minutes * 60; // Convert to seconds
  }

  async cleanupExpiredFiles(): Promise<void> {
    try {
      logger.info('🧹 Starting audio cache cleanup...');

      // Clean expired files from database (older than cache TTL)
      const expiredFiles = await prisma.audioFile.findMany({
        where: {
          cacheExpiresAt: {
            lt: new Date(),
          },
        },
      });

      let deletedCount = 0;
      for (const file of expiredFiles) {
        try {
          await fs.unlink(file.filePath);
          await prisma.audioFile.delete({ where: { id: file.id } });
          deletedCount++;
        } catch (error) {
          logger.warn(`Failed to delete expired file ${file.filePath}:`, error);
        }
      }

      // Clean temporary files older than 1 hour
      const tempDir = path.join(config.audioPath, 'temp');
      try {
        const tempFiles = await fs.readdir(tempDir);
        const oneHourAgo = Date.now() - 3600000;

        for (const file of tempFiles) {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime.getTime() < oneHourAgo) {
            await fs.unlink(filePath);
            deletedCount++;
          }
        }
      } catch (error) {
        logger.warn('Failed to clean temp files:', error);
      }

      logger.info(`🧹 Cache cleanup completed: ${deletedCount} files deleted`);
    } catch (error) {
      logger.error('Cache cleanup failed:', error);
    }
  }

  getCacheStats(): CacheStats {
    return { ...this.stats };
  }

  clearCache(): void {
    audioFileCache.flushAll();
    metadataCache.flushAll();
    this.stats = {
      metadataHits: 0,
      metadataMisses: 0,
      fileHits: 0,
      fileMisses: 0,
      totalSize: 0,
      entryCount: 0,
    };
    logger.info('🗑️ Audio cache cleared');
  }

  private generateETag(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  async warmupCache(audioFileIds: string[]): Promise<void> {
    logger.info(`🔥 Warming up cache for ${audioFileIds.length} audio files...`);
    
    const promises = audioFileIds.map(id => 
      this.getCachedAudioFile(id).catch(error => 
        logger.warn(`Failed to warmup ${id}:`, error)
      )
    );
    
    await Promise.allSettled(promises);
    logger.info('🔥 Cache warmup completed');
  }
}

export const audioCacheService = new AudioCacheService();