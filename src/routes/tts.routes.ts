import { Router } from 'express';
import { ttsService } from '../services/tts.service';
import { prisma } from '../database/client';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { ttsGenerationLimit, costLimitMiddleware, updateCostTracking } from '../middleware/audio-rate-limit';

const router = Router();

// Generate TTS for a chapter
router.post('/books/:bookId/chapters/:chapterId/audio', 
  ttsGenerationLimit, 
  costLimitMiddleware(0.50), 
  async (req, res, next) => {
  try {
    const { bookId, chapterId } = req.params;
    const { voice, language, speed, provider } = req.body;

    // Get chapter content
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { book: true },
    });

    if (!chapter || chapter.bookId !== bookId) {
      return next(createError('Chapter not found', 404));
    }

    // Check if audio already exists
    const existingAudio = await prisma.audioFile.findFirst({
      where: {
        bookId,
        chapterId,
        voiceUsed: voice,
      },
    });

    if (existingAudio) {
      return res.json({
        success: true,
        audioFile: existingAudio,
        message: 'Audio already exists',
      });
    }

    // Estimate cost
    const costEstimate = await ttsService.estimateCost(chapter.content, voice);
    
    // Check if cost is reasonable (< $0.10 per chapter)
    if (costEstimate.cost > 0.10) {
      return next(createError('Chapter too long for TTS generation. Cost would exceed $0.10', 400));
    }

    // Generate TTS
    const ttsResult = await ttsService.generateSpeech({
      text: chapter.content,
      voice,
      language: language || 'en-US',
      speed: speed || 1.0,
      provider,
    });

    // Save audio file record
    const audioFile = await prisma.audioFile.create({
      data: {
        bookId,
        chapterId,
        filePath: ttsResult.filePath,
        fileSizeBytes: ttsResult.audioBuffer.length,
        durationSeconds: ttsResult.duration,
        voiceUsed: voice,
        languageCode: language || 'en-US',
        ttsProvider: ttsResult.provider.toUpperCase() as 'GOOGLE' | 'AZURE' | 'AMAZON',
        generationCostUsd: ttsResult.cost,
        sampleRate: 22050,
        bitRate: 64000,
        format: 'mp3',
      },
    });

    // Update book audio status
    await prisma.book.update({
      where: { id: bookId },
      data: {
        hasAudio: true,
        audioGenerationStatus: 'COMPLETED',
        audioCostUsd: {
          increment: ttsResult.cost,
        },
      },
    });

    // Update cost tracking
    updateCostTracking(req, ttsResult.cost);

    logger.info(`TTS generated for chapter ${chapterId}: ${ttsResult.duration}s, $${ttsResult.cost}`);

    res.json({
      success: true,
      audioFile,
      cost: ttsResult.cost,
      duration: ttsResult.duration,
      provider: ttsResult.provider,
    });
  } catch (error) {
    logger.error('TTS generation failed:', error);
    next(error);
  }
});

// Generate TTS for entire book
router.post('/books/:bookId/audio/generate', 
  ttsGenerationLimit, 
  costLimitMiddleware(2.00), 
  async (req, res, next) => {
  try {
    const { bookId } = req.params;
    const { voice, language, speed, provider } = req.body;

    // Get book with chapters
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        chapters: {
          orderBy: { chapterNumber: 'asc' },
        },
      },
    });

    if (!book) {
      return next(createError('Book not found', 404));
    }

    // Estimate total cost
    let totalCost = 0;
    for (const chapter of book.chapters) {
      const estimate = await ttsService.estimateCost(chapter.content, voice);
      totalCost += estimate.cost;
    }

    // Check if total cost is reasonable (< $1.00 per book)
    if (totalCost > 1.00) {
      return next(createError(`Book too long for TTS generation. Total cost would be $${totalCost.toFixed(4)}`, 400));
    }

    // Update book status to processing
    await prisma.book.update({
      where: { id: bookId },
      data: { audioGenerationStatus: 'PROCESSING' },
    });

    // Process chapters in batches to avoid overwhelming TTS APIs
    const batchSize = 3;
    const results = [];
    
    for (let i = 0; i < book.chapters.length; i += batchSize) {
      const batch = book.chapters.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (chapter) => {
        try {
          // Check if audio already exists
          const existingAudio = await prisma.audioFile.findFirst({
            where: {
              bookId,
              chapterId: chapter.id,
              voiceUsed: voice,
            },
          });

          if (existingAudio) {
            return { chapterId: chapter.id, status: 'exists', audioFile: existingAudio };
          }

          // Generate TTS
          const ttsResult = await ttsService.generateSpeech({
            text: chapter.content,
            voice,
            language: language || 'en-US',
            speed: speed || 1.0,
            provider,
          });

          // Save audio file record
          const audioFile = await prisma.audioFile.create({
            data: {
              bookId,
              chapterId: chapter.id,
              filePath: ttsResult.filePath,
              fileSizeBytes: ttsResult.audioBuffer.length,
              durationSeconds: ttsResult.duration,
              voiceUsed: voice,
              languageCode: language || 'en-US',
              ttsProvider: ttsResult.provider.toUpperCase() as 'GOOGLE' | 'AZURE' | 'AMAZON',
              generationCostUsd: ttsResult.cost,
              sampleRate: 22050,
              bitRate: 64000,
              format: 'mp3',
            },
          });

          return { 
            chapterId: chapter.id, 
            status: 'generated', 
            audioFile, 
            cost: ttsResult.cost, 
            duration: ttsResult.duration 
          };
        } catch (error) {
          logger.error(`Failed to generate TTS for chapter ${chapter.id}:`, error);
          return { chapterId: chapter.id, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to respect API limits
      if (i + batchSize < book.chapters.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Calculate final statistics
    const successful = results.filter(r => r.status === 'generated');
    const failed = results.filter(r => r.status === 'failed');
    const totalActualCost = successful.reduce((sum, r) => sum + (r.cost || 0), 0);
    const totalDuration = successful.reduce((sum, r) => sum + (r.duration || 0), 0);

    // Update book final status
    await prisma.book.update({
      where: { id: bookId },
      data: {
        hasAudio: successful.length > 0,
        audioGenerationStatus: failed.length === 0 ? 'COMPLETED' : 'COMPLETED',
        audioCostUsd: totalActualCost,
        totalAudioDurationSeconds: Math.round(totalDuration),
        processingCompletedAt: new Date(),
      },
    });

    logger.info(`Book TTS generation completed: ${successful.length} chapters, $${totalActualCost.toFixed(4)}, ${totalDuration}s`);

    res.json({
      success: true,
      bookId,
      chaptersProcessed: results.length,
      successful: successful.length,
      failed: failed.length,
      totalCost: totalActualCost,
      totalDuration,
      results,
    });
  } catch (error) {
    // Update book status to failed
    await prisma.book.update({
      where: { id: req.params.bookId },
      data: { audioGenerationStatus: 'FAILED' },
    }).catch(() => {}); // Ignore errors in error handler

    logger.error('Book TTS generation failed:', error);
    next(error);
  }
});

// Get available voices
router.get('/voices', async (_req, res, next) => {
  try {
    const voices = await ttsService.getAvailableVoices();
    res.json({
      success: true,
      voices,
    });
  } catch (error) {
    logger.error('Failed to get available voices:', error);
    next(error);
  }
});

// Estimate TTS cost
router.post('/estimate-cost', async (req, res, next) => {
  try {
    const { text, voice } = req.body;

    if (!text || !voice) {
      return next(createError('Text and voice are required', 400));
    }

    const estimate = await ttsService.estimateCost(text, voice);
    
    res.json({
      success: true,
      characters: text.length,
      estimatedCost: estimate.cost,
      provider: estimate.provider,
    });
  } catch (error) {
    logger.error('Cost estimation failed:', error);
    next(error);
  }
});

export default router;