import { prisma } from './client';
import { logger } from '../utils/logger';

async function seedDatabase() {
  try {
    logger.info('🌱 Starting database seeding...');

    // Create test user
    const testUser = await prisma.user.upsert({
      where: { clerkUserId: 'test_user_123' },
      update: {},
      create: {
        clerkUserId: 'test_user_123',
        email: 'test@bookequalizer.com',
        firstName: 'Test',
        lastName: 'User',
        preferredVoice: 'en-US-Standard-A',
        playbackSpeed: 1.0,
        preferredLanguage: 'en-US',
        volumeLevel: 0.8,
      },
    });

    logger.info(`👤 Created test user: ${testUser.email}`);

    // Create test book
    const testBook = await prisma.book.upsert({
      where: { id: testUser.id }, // Using user ID as placeholder
      update: {},
      create: {
        title: 'Pride and Prejudice',
        author: 'Jane Austen',
        isbn: '978-0-14-143951-8',
        epubFilePath: '/uploads/test/pride-and-prejudice.epub',
        epubFileSize: 645120,
        totalPages: 432,
        wordCount: 122189,
        hasAudio: false,
        audioGenerationStatus: 'PENDING',
        audioCostUsd: 0.0,
      },
    });

    logger.info(`📚 Created test book: ${testBook.title}`);

    // Create test chapters
    const chapters = [
      {
        chapterNumber: 1,
        title: 'Chapter 1',
        content: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
        wordCount: 22,
        characterCount: 124,
      },
      {
        chapterNumber: 2,
        title: 'Chapter 2',
        content: 'Mr. Bennet was among the earliest of those who waited on Mr. Bingley. He had always intended to visit him, though to the last always assuring his wife that he should not go.',
        wordCount: 34,
        characterCount: 186,
      },
    ];

    for (const chapterData of chapters) {
      const chapter = await prisma.chapter.upsert({
        where: {
          bookId_chapterNumber: {
            bookId: testBook.id,
            chapterNumber: chapterData.chapterNumber,
          },
        },
        update: {},
        create: {
          ...chapterData,
          bookId: testBook.id,
        },
      });

      logger.info(`📄 Created chapter: ${chapter.title}`);
    }

    // Create reading session
    await prisma.readingSession.upsert({
      where: {
        userId_bookId: {
          userId: testUser.id,
          bookId: testBook.id,
        },
      },
      update: {},
      create: {
        userId: testUser.id,
        bookId: testBook.id,
        textPositionPercent: 15.5,
        audioPositionSeconds: 0.0,
        readingMode: 'TEXT',
        isActive: true,
        totalReadingTimeMinutes: 45,
        totalAudioTimeMinutes: 0,
        pagesRead: 67,
      },
    });

    logger.info(`📖 Created reading session for user`);

    // Create audio preferences
    const audioPreference = await prisma.audioPreference.create({
      data: {
        userId: testUser.id,
        voiceId: 'en-US-Standard-A',
        voiceName: 'English (US) - Standard A',
        languageCode: 'en-US',
        gender: 'FEMALE',
        accent: 'American',
        defaultSpeed: 1.2,
        pitchAdjustment: 1.0,
        volumeAdjustment: 0.9,
        usageCount: 5,
        isFavorite: true,
      },
    });

    logger.info(`🔊 Created audio preference: ${audioPreference.voiceName}`);

    // Log summary
    const stats = await Promise.all([
      prisma.user.count(),
      prisma.book.count(),
      prisma.chapter.count(),
      prisma.audioPreference.count(),
      prisma.readingSession.count(),
    ]);

    logger.info('✅ Database seeding completed successfully!');
    logger.info(`📊 Database stats:`);
    logger.info(`   Users: ${stats[0]}`);
    logger.info(`   Books: ${stats[1]}`);
    logger.info(`   Chapters: ${stats[2]}`);
    logger.info(`   Audio Preferences: ${stats[3]}`);
    logger.info(`   Reading Sessions: ${stats[4]}`);

  } catch (error) {
    logger.error('❌ Database seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seedDatabase };