import { Router } from 'express';
import { prisma } from '../database/client';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { requireAuth, requireResourceOwnership } from '../middleware/auth.middleware';

const router = Router();

// Update reading progress
router.put('/:bookId/progress', requireAuth, requireResourceOwnership('book'), async (req, res, next) => {
  try {
    if (!req.user) {
      return next(createError('User not found', 404));
    }

    const { bookId } = req.params;
    const {
      currentChapterId,
      textPositionPercent,
      audioPositionSeconds,
      readingMode,
      sessionTimeMinutes,
      pagesRead,
    } = req.body;

    // Validate book exists
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      return next(createError('Book not found', 404));
    }

    // Validate chapter belongs to book if provided
    if (currentChapterId) {
      const chapter = await prisma.chapter.findFirst({
        where: {
          id: currentChapterId,
          bookId,
        },
      });

      if (!chapter) {
        return next(createError('Chapter not found in this book', 404));
      }
    }

    // Update or create reading session
    const session = await prisma.readingSession.upsert({
      where: {
        userId_bookId: {
          userId: req.user.id,
          bookId,
        },
      },
      update: {
        ...(currentChapterId && { currentChapterId }),
        ...(textPositionPercent !== undefined && { textPositionPercent }),
        ...(audioPositionSeconds !== undefined && { audioPositionSeconds }),
        ...(readingMode && { readingMode }),
        lastAccessedAt: new Date(),
        ...(sessionTimeMinutes && {
          totalReadingTimeMinutes: { increment: sessionTimeMinutes },
        }),
        ...(pagesRead && {
          pagesRead: { increment: pagesRead },
        }),
      },
      create: {
        userId: req.user.id,
        bookId,
        currentChapterId,
        textPositionPercent: textPositionPercent || 0,
        audioPositionSeconds: audioPositionSeconds || 0,
        readingMode: readingMode || 'TEXT',
        totalReadingTimeMinutes: sessionTimeMinutes || 0,
        pagesRead: pagesRead || 0,
        lastAccessedAt: new Date(),
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
          },
        },
        currentChapter: {
          select: {
            id: true,
            title: true,
            chapterNumber: true,
          },
        },
      },
    });

    logger.debug(`Progress updated for user ${req.user.id}, book ${bookId}`);

    res.json({
      success: true,
      session,
    });
  } catch (error) {
    logger.error('Failed to update reading progress:', error);
    next(error);
  }
});

// Get reading progress for a book
router.get('/:bookId/progress', requireAuth, requireResourceOwnership('book'), async (req, res, next) => {
  try {
    if (!req.user) {
      return next(createError('User not found', 404));
    }

    const { bookId } = req.params;

    const session = await prisma.readingSession.findUnique({
      where: {
        userId_bookId: {
          userId: req.user.id,
          bookId,
        },
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            totalPages: true,
            hasAudio: true,
            totalAudioDurationSeconds: true,
          },
        },
        currentChapter: {
          select: {
            id: true,
            title: true,
            chapterNumber: true,
          },
        },
      },
    });

    if (!session) {
      return next(createError('Reading session not found', 404));
    }

    res.json({
      success: true,
      progress: session,
    });
  } catch (error) {
    logger.error('Failed to get reading progress:', error);
    next(error);
  }
});

// Sync progress across devices
router.post('/sync', requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return next(createError('User not found', 404));
    }

    const { deviceId, progressUpdates } = req.body;

    if (!Array.isArray(progressUpdates)) {
      return next(createError('progressUpdates must be an array', 400));
    }

    const syncResults = [];

    // Process each progress update
    for (const update of progressUpdates) {
      try {
        const {
          bookId,
          currentChapterId,
          textPositionPercent,
          audioPositionSeconds,
          readingMode,
          lastAccessedAt,
        } = update;

        // Get current server-side progress
        const serverSession = await prisma.readingSession.findUnique({
          where: {
            userId_bookId: {
              userId: req.user.id,
              bookId,
            },
          },
        });

        let shouldUpdate = true;
        let conflictResolution = 'client_wins';

        // Conflict resolution: use most recent timestamp
        if (serverSession && lastAccessedAt) {
          const clientTimestamp = new Date(lastAccessedAt);
          const serverTimestamp = serverSession.lastAccessedAt;

          if (serverTimestamp > clientTimestamp) {
            shouldUpdate = false;
            conflictResolution = 'server_wins';
          }
        }

        if (shouldUpdate) {
          const updatedSession = await prisma.readingSession.upsert({
            where: {
              userId_bookId: {
                userId: req.user.id,
                bookId,
              },
            },
            update: {
              ...(currentChapterId && { currentChapterId }),
              ...(textPositionPercent !== undefined && { textPositionPercent }),
              ...(audioPositionSeconds !== undefined && { audioPositionSeconds }),
              ...(readingMode && { readingMode }),
              lastAccessedAt: new Date(),
            },
            create: {
              userId: req.user.id,
              bookId,
              currentChapterId,
              textPositionPercent: textPositionPercent || 0,
              audioPositionSeconds: audioPositionSeconds || 0,
              readingMode: readingMode || 'TEXT',
              lastAccessedAt: new Date(),
            },
          });

          syncResults.push({
            bookId,
            status: 'updated',
            conflictResolution,
            session: updatedSession,
          });
        } else {
          syncResults.push({
            bookId,
            status: 'skipped',
            conflictResolution,
            session: serverSession,
          });
        }
      } catch (updateError) {
        logger.error(`Failed to sync progress for book ${update.bookId}:`, updateError);
        syncResults.push({
          bookId: update.bookId,
          status: 'error',
          error: updateError instanceof Error ? updateError.message : 'Unknown error',
        });
      }
    }

    logger.info(`Progress synced for user ${req.user.id}, device ${deviceId}: ${syncResults.length} updates`);

    res.json({
      success: true,
      deviceId,
      syncResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to sync progress:', error);
    next(error);
  }
});

// Get progress for all books
router.get('/all', requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return next(createError('User not found', 404));
    }

    const sessions = await prisma.readingSession.findMany({
      where: { userId: req.user.id },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            totalPages: true,
            hasAudio: true,
            totalAudioDurationSeconds: true,
          },
        },
        currentChapter: {
          select: {
            id: true,
            title: true,
            chapterNumber: true,
          },
        },
      },
      orderBy: { lastAccessedAt: 'desc' },
    });

    res.json({
      success: true,
      progress: sessions,
    });
  } catch (error) {
    logger.error('Failed to get all progress:', error);
    next(error);
  }
});

// Mark book as completed
router.post('/:bookId/complete', requireAuth, requireResourceOwnership('book'), async (req, res, next) => {
  try {
    if (!req.user) {
      return next(createError('User not found', 404));
    }

    const { bookId } = req.params;
    const { completionTimeMinutes } = req.body;

    const session = await prisma.readingSession.update({
      where: {
        userId_bookId: {
          userId: req.user.id,
          bookId,
        },
      },
      data: {
        textPositionPercent: 100.0,
        isActive: false,
        ...(completionTimeMinutes && {
          totalReadingTimeMinutes: { increment: completionTimeMinutes },
        }),
        lastAccessedAt: new Date(),
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
          },
        },
      },
    });

    logger.info(`Book completed by user ${req.user.id}: ${session.book.title}`);

    res.json({
      success: true,
      message: 'Book marked as completed',
      session,
    });
  } catch (error) {
    logger.error('Failed to mark book as completed:', error);
    next(error);
  }
});

export default router;