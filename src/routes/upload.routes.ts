import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { epubService } from '../services/epub.service';
import { ttsService } from '../services/tts.service';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth.middleware';
import { config } from '../config/environment';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const uploadDir = path.join(config.uploadPath, 'epub');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const timestamp = Date.now();
    const userId = (req as any).user?.id || 'anonymous';
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${userId}_${timestamp}_${originalName}`;
    cb(null, filename);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check file type
  if (file.mimetype === 'application/epub+zip' || 
      path.extname(file.originalname).toLowerCase() === '.epub') {
    cb(null, true);
  } else {
    cb(new Error('Only EPUB files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSize, // 50MB
    files: 1,
  },
});

// Upload and process EPUB file
router.post('/epub', requireAuth, upload.single('epub'), async (req, res, next) => {
  try {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }

    if (!req.file) {
      return next(createError('No EPUB file provided', 400));
    }

    const { generateAudio, voice, language, provider } = req.body;

    logger.info(`📤 EPUB upload started: ${req.file.originalname} by user ${req.user.email}`);

    // Validate EPUB file
    const validation = await epubService.validateEPubFile(req.file.path);
    if (!validation.valid) {
      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(() => {});
      return next(createError(validation.error || 'Invalid EPUB file', 400));
    }

    // Process EPUB
    const processingResult = await epubService.processEPubFile(req.file.path, req.user.id);

    // Save to database
    const { bookId, chapterIds } = await epubService.saveToDatabase(processingResult, req.user.id);

    // Estimate TTS cost if audio generation requested
    let audioEstimate = null;
    if (generateAudio && voice) {
      try {
        const totalText = processingResult.chapters.map(c => c.content).join(' ');
        audioEstimate = await ttsService.estimateCost(totalText, voice);
      } catch (estimateError) {
        logger.warn('Failed to estimate TTS cost:', estimateError);
      }
    }

    logger.info(`✅ EPUB processed successfully: ${processingResult.metadata.title} (${chapterIds.length} chapters)`);

    res.json({
      success: true,
      book: {
        id: bookId,
        title: processingResult.metadata.title,
        author: processingResult.metadata.author,
        chapters: chapterIds.length,
        wordCount: processingResult.metadata.wordCount,
        totalPages: processingResult.metadata.totalPages,
        coverImage: processingResult.metadata.coverImage,
      },
      processing: {
        timeMs: processingResult.processingTime,
        fileSizeBytes: processingResult.fileSize,
      },
      audioEstimate,
    });

    // Generate audio in background if requested
    if (generateAudio && voice && audioEstimate && audioEstimate.cost < 2.0) {
      setImmediate(async () => {
        try {
          logger.info(`🔊 Starting background TTS generation for book ${bookId}`);
          
          // Process chapters in batches
          const batchSize = 3;
          for (let i = 0; i < chapterIds.length; i += batchSize) {
            const batch = chapterIds.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (chapterId) => {
              try {
                const chapter = await epubService.preprocessForAudio(
                  processingResult.chapters.find(c => c.order === chapterIds.indexOf(chapterId) + 1)?.content || ''
                );

                const ttsResult = await ttsService.generateSpeech({
                  text: chapter.processedText,
                  voice,
                  language: language || 'en-US',
                  provider,
                });

                // Save audio file record
                await req.app.locals.prisma.audioFile.create({
                  data: {
                    bookId,
                    chapterId,
                    filePath: ttsResult.filePath,
                    fileSizeBytes: ttsResult.audioBuffer.length,
                    durationSeconds: ttsResult.duration,
                    voiceUsed: voice,
                    languageCode: language || 'en-US',
                    ttsProvider: ttsResult.provider.toUpperCase(),
                    generationCostUsd: ttsResult.cost,
                  },
                });

                logger.debug(`Background TTS completed for chapter ${chapterId}`);
              } catch (chapterError) {
                logger.error(`Background TTS failed for chapter ${chapterId}:`, chapterError);
              }
            });

            await Promise.allSettled(batchPromises);
            
            // Small delay between batches
            if (i + batchSize < chapterIds.length) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }

          // Update book status
          await req.app.locals.prisma.book.update({
            where: { id: bookId },
            data: {
              hasAudio: true,
              audioGenerationStatus: 'COMPLETED',
              processingCompletedAt: new Date(),
            },
          });

          logger.info(`✅ Background TTS generation completed for book ${bookId}`);
        } catch (bgError) {
          logger.error(`Background TTS generation failed for book ${bookId}:`, bgError);
          
          // Update book status to failed
          await req.app.locals.prisma.book.update({
            where: { id: bookId },
            data: { audioGenerationStatus: 'FAILED' },
          }).catch(() => {});
        }
      });
    }
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    logger.error('EPUB upload failed:', error);
    next(error);
  }
});

// Get upload status
router.get('/status/:bookId', requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }

    const { bookId } = req.params;

    // Check if user has access to this book
    const session = await req.app.locals.prisma.readingSession.findFirst({
      where: {
        userId: req.user.id,
        bookId,
      },
    });

    if (!session) {
      return next(createError('Book not found or access denied', 404));
    }

    // Get book with processing status
    const book = await req.app.locals.prisma.book.findUnique({
      where: { id: bookId },
      include: {
        chapters: {
          select: { id: true, title: true, chapterNumber: true },
          orderBy: { chapterNumber: 'asc' },
        },
        audioFiles: {
          select: {
            id: true,
            chapterId: true,
            durationSeconds: true,
            generationCostUsd: true,
          },
        },
      },
    });

    if (!book) {
      return next(createError('Book not found', 404));
    }

    // Calculate processing statistics
    const totalChapters = book.chapters.length;
    const chaptersWithAudio = book.audioFiles.length;
    const totalAudioCost = book.audioFiles.reduce((sum: number, af: any) => sum + af.generationCostUsd, 0);
    const totalDuration = book.audioFiles.reduce((sum: number, af: any) => sum + af.durationSeconds, 0);

    res.json({
      success: true,
      book: {
        id: book.id,
        title: book.title,
        author: book.author,
        status: book.audioGenerationStatus,
        hasAudio: book.hasAudio,
        processingCompletedAt: book.processingCompletedAt,
      },
      progress: {
        totalChapters,
        chaptersWithAudio,
        percentage: totalChapters > 0 ? Math.round((chaptersWithAudio / totalChapters) * 100) : 0,
      },
      audio: {
        totalDurationSeconds: totalDuration,
        totalCostUsd: totalAudioCost,
        files: book.audioFiles.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get upload status:', error);
    next(error);
  }
});

// Get user's uploaded books
router.get('/books', requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }

    const { page = 1, limit = 10, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {
      readingSessions: {
        some: {
          userId: req.user.id,
        },
      },
    };

    if (status && status !== 'all') {
      where.audioGenerationStatus = status;
    }

    const [books, total] = await Promise.all([
      req.app.locals.prisma.book.findMany({
        where,
        include: {
          readingSessions: {
            where: { userId: req.user.id },
            select: {
              textPositionPercent: true,
              audioPositionSeconds: true,
              readingMode: true,
              lastAccessedAt: true,
              isActive: true,
            },
          },
          _count: {
            select: {
              chapters: true,
              audioFiles: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: Number(limit),
      }),
      req.app.locals.prisma.book.count({ where }),
    ]);

    res.json({
      success: true,
      books: books.map((book: any) => ({
        id: book.id,
        title: book.title,
        author: book.author,
        wordCount: book.wordCount,
        totalPages: book.totalPages,
        hasAudio: book.hasAudio,
        audioStatus: book.audioGenerationStatus,
        chapters: book._count.chapters,
        audioFiles: book._count.audioFiles,
        progress: book.readingSessions[0] || null,
        createdAt: book.createdAt,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Failed to get user books:', error);
    next(error);
  }
});

// Delete uploaded book
router.delete('/books/:bookId', requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }

    const { bookId } = req.params;

    // Check if user has access to this book
    const session = await req.app.locals.prisma.readingSession.findFirst({
      where: {
        userId: req.user.id,
        bookId,
      },
    });

    if (!session) {
      return next(createError('Book not found or access denied', 404));
    }

    // Get book with file paths for cleanup
    const book = await req.app.locals.prisma.book.findUnique({
      where: { id: bookId },
      include: {
        audioFiles: {
          select: { filePath: true },
        },
      },
    });

    if (!book) {
      return next(createError('Book not found', 404));
    }

    // Delete book (cascading deletes will handle related records)
    await req.app.locals.prisma.book.delete({
      where: { id: bookId },
    });

    // Clean up files in background
    setImmediate(async () => {
      try {
        // Delete EPUB file
        if (book.epubFilePath) {
          await fs.unlink(book.epubFilePath).catch(() => {});
        }

        // Delete audio files
        for (const audioFile of book.audioFiles) {
          await fs.unlink(audioFile.filePath).catch(() => {});
        }

        logger.info(`Files cleaned up for deleted book: ${book.title}`);
      } catch (cleanupError) {
        logger.warn('Failed to cleanup files for deleted book:', cleanupError);
      }
    });

    logger.info(`Book deleted by user ${req.user.email}: ${book.title}`);

    res.json({
      success: true,
      message: 'Book deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete book:', error);
    next(error);
  }
});

// Error handler for multer
router.use((error: any, _req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: `File too large. Maximum size is ${config.maxFileSize / 1024 / 1024}MB`,
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Only one file allowed',
      });
    }
  }
  
  if (error.message === 'Only EPUB files are allowed') {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type. Only EPUB files are supported',
    });
  }
  
  next(error);
});

export default router;