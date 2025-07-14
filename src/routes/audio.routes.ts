import { Router } from 'express';
import { audioCacheService } from '../services/audio-cache.service';
import { prisma } from '../database/client';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { audioStreamingLimit, bandwidthLimitMiddleware, qualityBasedLimit } from '../middleware/audio-rate-limit';

const router = Router();

// Stream audio file with caching
router.get('/stream/:audioFileId', 
  audioStreamingLimit, 
  bandwidthLimitMiddleware(5), 
  qualityBasedLimit,
  async (req, res, next) => {
  try {
    const { audioFileId } = req.params;
    const { quality = 'medium' } = req.query;
    logger.debug(`Audio streaming quality: ${quality}`);

    // Get cached audio file
    const cachedAudio = await audioCacheService.getCachedAudioFile(audioFileId);
    
    if (!cachedAudio) {
      return next(createError('Audio file not found', 404));
    }

    // Set caching headers
    res.set({
      'Content-Type': cachedAudio.contentType,
      'Content-Length': cachedAudio.size.toString(),
      'ETag': cachedAudio.etag,
      'Cache-Control': 'public, max-age=3600', // 1 hour cache
      'Accept-Ranges': 'bytes',
    });

    // Handle range requests for streaming
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : cachedAudio.size - 1;
      const chunkSize = (end - start) + 1;

      res.status(206);
      res.set({
        'Content-Range': `bytes ${start}-${end}/${cachedAudio.size}`,
        'Content-Length': chunkSize.toString(),
      });

      res.end(cachedAudio.buffer.slice(start, end + 1));
    } else {
      res.end(cachedAudio.buffer);
    }

    logger.debug(`Audio streamed: ${audioFileId}, size: ${cachedAudio.size}`);
  } catch (error) {
    logger.error('Audio streaming failed:', error);
    next(error);
  }
});

// Get audio file metadata with caching
router.get('/metadata/:audioFileId', async (req, res, next) => {
  try {
    const { audioFileId } = req.params;
    
    // Check cache first
    const cacheKey = `metadata_${audioFileId}`;
    let metadata = await audioCacheService.getCachedMetadata(cacheKey);
    
    if (!metadata) {
      // Get from database
      const audioFile = await prisma.audioFile.findUnique({
        where: { id: audioFileId },
        include: {
          book: {
            select: { id: true, title: true, author: true },
          },
          chapters: {
            select: { id: true, title: true, chapterNumber: true },
          },
        },
      });

      if (!audioFile) {
        return next(createError('Audio file not found', 404));
      }

      metadata = {
        id: audioFile.id,
        duration: audioFile.durationSeconds,
        size: audioFile.fileSizeBytes,
        voice: audioFile.voiceUsed,
        language: audioFile.languageCode,
        provider: audioFile.ttsProvider,
        quality: {
          sampleRate: audioFile.sampleRate,
          bitRate: audioFile.bitRate,
          format: audioFile.format,
        },
        book: audioFile.book,
        chapters: audioFile.chapters,
        createdAt: audioFile.createdAt,
      };

      // Cache for future requests
      await audioCacheService.cacheAudioMetadata(cacheKey, metadata);
    }

    res.json({
      success: true,
      metadata,
    });
  } catch (error) {
    logger.error('Failed to get audio metadata:', error);
    next(error);
  }
});

// Get audio segments for text synchronization
router.get('/segments/:audioFileId', async (req, res, next) => {
  try {
    const { audioFileId } = req.params;
    
    // Check cache first
    const cacheKey = `segments_${audioFileId}`;
    let segments = await audioCacheService.getCachedMetadata(cacheKey);
    
    if (!segments) {
      // Get audio file and chapter content
      const audioFile = await prisma.audioFile.findUnique({
        where: { id: audioFileId },
        include: {
          chapters: true,
        },
      });

      if (!audioFile || audioFile.chapters.length === 0) {
        return next(createError('Audio file or chapter not found', 404));
      }

      // Generate segments
      const chapter = audioFile.chapters[0];
      const segmentData = await audioCacheService.generateAudioSegments(
        audioFileId,
        chapter.content
      );
      
      segments = segmentData.segments;
    }

    res.json({
      success: true,
      audioFileId,
      segments,
    });
  } catch (error) {
    logger.error('Failed to get audio segments:', error);
    next(error);
  }
});

// Preload book audio files
router.post('/preload/:bookId', async (req, res, next) => {
  try {
    const { bookId } = req.params;
    
    // Verify book exists
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      return next(createError('Book not found', 404));
    }

    // Preload audio files
    await audioCacheService.preloadBookAudio(bookId);

    res.json({
      success: true,
      message: 'Book audio files preloaded',
      bookId,
    });
  } catch (error) {
    logger.error('Failed to preload book audio:', error);
    next(error);
  }
});

// Get cache statistics
router.get('/cache/stats', async (_req, res) => {
  try {
    const stats = audioCacheService.getCacheStats();
    
    // Add database statistics
    const [totalAudioFiles, totalAudioSize] = await Promise.all([
      prisma.audioFile.count(),
      prisma.audioFile.aggregate({
        _sum: { fileSizeBytes: true },
      }),
    ]);

    const enhancedStats = {
      ...stats,
      database: {
        totalFiles: totalAudioFiles,
        totalSizeBytes: totalAudioSize._sum.fileSizeBytes || 0,
      },
      hitRates: {
        metadata: stats.metadataHits / (stats.metadataHits + stats.metadataMisses) || 0,
        files: stats.fileHits / (stats.fileHits + stats.fileMisses) || 0,
      },
    };

    res.json({
      success: true,
      stats: enhancedStats,
    });
  } catch (error) {
    logger.error('Failed to get cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics',
    });
  }
});

// Clear cache (admin endpoint)
router.post('/cache/clear', async (_req, res) => {
  try {
    audioCacheService.clearCache();
    
    res.json({
      success: true,
      message: 'Audio cache cleared',
    });
  } catch (error) {
    logger.error('Failed to clear cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
    });
  }
});

// Optimize audio file
router.post('/optimize/:audioFileId', async (req, res, next) => {
  try {
    const { audioFileId } = req.params;
    const { quality = 'medium', bitrate, sampleRate } = req.body;

    const audioFile = await prisma.audioFile.findUnique({
      where: { id: audioFileId },
    });

    if (!audioFile) {
      return next(createError('Audio file not found', 404));
    }

    // Generate optimized file path
    const optimizedPath = audioFile.filePath.replace('.mp3', `_${quality}.mp3`);
    
    // Optimize audio file
    const result = await audioCacheService.optimizeAudioFile(
      audioFile.filePath,
      optimizedPath,
      { quality, bitrate, sampleRate }
    );

    // Update database with optimized version
    await prisma.audioFile.update({
      where: { id: audioFileId },
      data: {
        filePath: optimizedPath,
        fileSizeBytes: result.size,
        durationSeconds: result.duration,
      },
    });

    res.json({
      success: true,
      audioFileId,
      originalSize: audioFile.fileSizeBytes,
      optimizedSize: result.size,
      savings: Number(audioFile.fileSizeBytes) - result.size,
      duration: result.duration,
    });
  } catch (error) {
    logger.error('Audio optimization failed:', error);
    next(error);
  }
});

// Warmup cache with specific audio files
router.post('/cache/warmup', async (req, res, next) => {
  try {
    const { audioFileIds } = req.body;

    if (!Array.isArray(audioFileIds)) {
      return next(createError('audioFileIds must be an array', 400));
    }

    await audioCacheService.warmupCache(audioFileIds);

    res.json({
      success: true,
      message: `Cache warmed up for ${audioFileIds.length} audio files`,
      audioFileIds,
    });
  } catch (error) {
    logger.error('Cache warmup failed:', error);
    next(error);
  }
});

export default router;