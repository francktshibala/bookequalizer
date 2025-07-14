import { Router } from 'express';
import { prisma } from '../database/client';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Get current user profile
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return next(createError('User not found', 404));
    }

    // Get user with reading statistics
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        readingSessions: {
          include: {
            book: {
              select: {
                id: true,
                title: true,
                author: true,
                hasAudio: true,
              },
            },
          },
          orderBy: { lastAccessedAt: 'desc' },
          take: 5, // Last 5 books
        },
        audioPreferences: {
          orderBy: [
            { isFavorite: 'desc' },
            { usageCount: 'desc' },
          ],
          take: 10,
        },
      },
    });

    if (!user) {
      return next(createError('User not found', 404));
    }

    // Calculate reading statistics
    const stats = await prisma.readingSession.aggregate({
      where: { userId: user.id },
      _sum: {
        totalReadingTimeMinutes: true,
        totalAudioTimeMinutes: true,
        pagesRead: true,
      },
      _count: {
        id: true,
      },
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        preferences: {
          voice: user.preferredVoice,
          speed: user.playbackSpeed,
          language: user.preferredLanguage,
          volume: user.volumeLevel,
        },
        statistics: {
          totalBooks: stats._count.id,
          totalReadingTimeMinutes: stats._sum.totalReadingTimeMinutes || 0,
          totalAudioTimeMinutes: stats._sum.totalAudioTimeMinutes || 0,
          totalPagesRead: stats._sum.pagesRead || 0,
        },
        recentBooks: user.readingSessions,
        audioPreferences: user.audioPreferences,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    logger.error('Failed to get user profile:', error);
    next(error);
  }
});

// Update user preferences
router.patch('/me/preferences', requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return next(createError('User not found', 404));
    }

    const {
      preferredVoice,
      playbackSpeed,
      preferredLanguage,
      volumeLevel,
    } = req.body;

    // Validate preferences
    if (playbackSpeed && (playbackSpeed < 0.5 || playbackSpeed > 2.0)) {
      return next(createError('Playback speed must be between 0.5 and 2.0', 400));
    }

    if (volumeLevel && (volumeLevel < 0.0 || volumeLevel > 1.0)) {
      return next(createError('Volume level must be between 0.0 and 1.0', 400));
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(preferredVoice && { preferredVoice }),
        ...(playbackSpeed && { playbackSpeed }),
        ...(preferredLanguage && { preferredLanguage }),
        ...(volumeLevel !== undefined && { volumeLevel }),
      },
    });

    logger.info(`User preferences updated: ${req.user.email}`);

    res.json({
      success: true,
      preferences: {
        voice: updatedUser.preferredVoice,
        speed: updatedUser.playbackSpeed,
        language: updatedUser.preferredLanguage,
        volume: updatedUser.volumeLevel,
      },
    });
  } catch (error) {
    logger.error('Failed to update user preferences:', error);
    next(error);
  }
});

// Create or update audio preference
router.post('/me/audio-preferences', requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return next(createError('User not found', 404));
    }

    const {
      voiceId,
      voiceName,
      languageCode,
      gender,
      accent,
      defaultSpeed,
      pitchAdjustment,
      volumeAdjustment,
      isFavorite,
    } = req.body;

    if (!voiceId || !voiceName || !languageCode) {
      return next(createError('voiceId, voiceName, and languageCode are required', 400));
    }

    // Check if preference already exists
    const existing = await prisma.audioPreference.findFirst({
      where: {
        userId: req.user.id,
        voiceId,
      },
    });

    let audioPreference;

    if (existing) {
      // Update existing preference
      audioPreference = await prisma.audioPreference.update({
        where: { id: existing.id },
        data: {
          voiceName,
          languageCode,
          gender,
          accent,
          defaultSpeed: defaultSpeed || 1.0,
          pitchAdjustment: pitchAdjustment || 1.0,
          volumeAdjustment: volumeAdjustment || 1.0,
          isFavorite: isFavorite || false,
          usageCount: { increment: 1 },
        },
      });
    } else {
      // Create new preference
      audioPreference = await prisma.audioPreference.create({
        data: {
          userId: req.user.id,
          voiceId,
          voiceName,
          languageCode,
          gender,
          accent,
          defaultSpeed: defaultSpeed || 1.0,
          pitchAdjustment: pitchAdjustment || 1.0,
          volumeAdjustment: volumeAdjustment || 1.0,
          isFavorite: isFavorite || false,
          usageCount: 1,
        },
      });
    }

    res.json({
      success: true,
      audioPreference,
    });
  } catch (error) {
    logger.error('Failed to create/update audio preference:', error);
    next(error);
  }
});

// Get user's reading sessions
router.get('/me/reading-sessions', requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return next(createError('User not found', 404));
    }

    const { page = 1, limit = 10, active = 'all' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = { userId: req.user.id };
    if (active === 'true') {
      where.isActive = true;
    } else if (active === 'false') {
      where.isActive = false;
    }

    const [sessions, total] = await Promise.all([
      prisma.readingSession.findMany({
        where,
        include: {
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              hasAudio: true,
              audioGenerationStatus: true,
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
        skip: offset,
        take: Number(limit),
      }),
      prisma.readingSession.count({ where }),
    ]);

    res.json({
      success: true,
      sessions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Failed to get reading sessions:', error);
    next(error);
  }
});

// Delete user account (GDPR compliance)
router.delete('/me', requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return next(createError('User not found', 404));
    }

    // Delete user and all related data (cascading deletes)
    await prisma.user.delete({
      where: { id: req.user.id },
    });

    logger.info(`User account deleted: ${req.user.email} (${req.user.id})`);

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete user account:', error);
    next(error);
  }
});

// Admin endpoints
router.get('/admin/users', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: String(search), mode: 'insensitive' } },
        { firstName: { contains: String(search), mode: 'insensitive' } },
        { lastName: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          _count: {
            select: {
              readingSessions: true,
              audioPreferences: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: Number(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Failed to get users (admin):', error);
    next(error);
  }
});

// Admin user statistics
router.get('/admin/stats', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const [
      totalUsers,
      totalBooks,
      totalSessions,
      audioFiles,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.book.count(),
      prisma.readingSession.count(),
      prisma.audioFile.aggregate({
        _count: { id: true },
        _sum: { fileSizeBytes: true, generationCostUsd: true },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          recentSignups: recentUsers,
        },
        books: {
          total: totalBooks,
        },
        sessions: {
          total: totalSessions,
        },
        audio: {
          totalFiles: audioFiles._count.id,
          totalSizeBytes: audioFiles._sum.fileSizeBytes || 0,
          totalCostUsd: audioFiles._sum.generationCostUsd || 0,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to get admin stats:', error);
    next(error);
  }
});

export default router;