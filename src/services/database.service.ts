import { prisma } from '../database/client';
import { logger } from '../utils/logger';
import type { 
  User, 
  Book, 
  Chapter, 
  AudioFile, 
  ReadingSession,
  AudioPreference 
} from '@prisma/client';

export class DatabaseService {
  // User operations
  async createUser(userData: {
    clerkUserId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    preferredVoice?: string;
    playbackSpeed?: number;
    preferredLanguage?: string;
    volumeLevel?: number;
  }): Promise<User> {
    try {
      const user = await prisma.user.create({
        data: userData,
      });
      logger.info(`User created: ${user.email}`);
      return user;
    } catch (error) {
      logger.error('Failed to create user:', error);
      throw error;
    }
  }

  async getUserByClerkId(clerkUserId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { clerkUserId },
    });
  }

  // Book operations
  async createBook(bookData: {
    title: string;
    author: string;
    isbn?: string;
    epubFilePath: string;
    epubFileSize: number;
    totalPages?: number;
    wordCount?: number;
  }): Promise<Book> {
    try {
      const book = await prisma.book.create({
        data: bookData,
      });
      logger.info(`Book created: ${book.title} by ${book.author}`);
      return book;
    } catch (error) {
      logger.error('Failed to create book:', error);
      throw error;
    }
  }

  async getBookWithChapters(bookId: string): Promise<(Book & { chapters: Chapter[] }) | null> {
    return prisma.book.findUnique({
      where: { id: bookId },
      include: {
        chapters: {
          orderBy: { chapterNumber: 'asc' },
        },
      },
    });
  }

  async getBooksWithAudioStatus(userId: string): Promise<(Book & { readingSessions: ReadingSession[] })[]> {
    return prisma.book.findMany({
      include: {
        readingSessions: {
          where: { userId },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Chapter operations
  async createChapter(chapterData: {
    bookId: string;
    chapterNumber: number;
    title?: string;
    content: string;
    wordCount: number;
    characterCount: number;
    contentEmbedding?: string;
  }): Promise<Chapter> {
    try {
      const chapter = await prisma.chapter.create({
        data: chapterData,
      });
      logger.info(`Chapter created: ${chapter.title || `Chapter ${chapter.chapterNumber}`}`);
      return chapter;
    } catch (error) {
      logger.error('Failed to create chapter:', error);
      throw error;
    }
  }

  async getChapterWithAudio(chapterId: string): Promise<(Chapter & { audioFile: AudioFile | null; book: Book }) | null> {
    return prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        audioFile: true,
        book: true,
      },
    });
  }

  // Audio file operations
  async createAudioFile(audioData: {
    bookId: string;
    chapterId?: string;
    filePath: string;
    fileSizeBytes: number;
    durationSeconds: number;
    voiceUsed: string;
    languageCode: string;
    ttsProvider: 'GOOGLE' | 'AZURE' | 'AMAZON';
    generationCostUsd?: number;
    sampleRate?: number;
    bitRate?: number;
    format?: string;
    cdnUrl?: string;
  }): Promise<AudioFile> {
    try {
      const audioFile = await prisma.audioFile.create({
        data: audioData,
      });
      logger.info(`Audio file created: ${audioFile.filePath}`);
      return audioFile;
    } catch (error) {
      logger.error('Failed to create audio file:', error);
      throw error;
    }
  }

  // Reading session operations
  async updateReadingProgress(
    userId: string,
    bookId: string,
    progressData: {
      currentChapterId?: string;
      textPositionPercent?: number;
      audioPositionSeconds?: number;
      readingMode?: 'TEXT' | 'AUDIO' | 'HYBRID';
      totalReadingTimeMinutes?: number;
      totalAudioTimeMinutes?: number;
      pagesRead?: number;
    }
  ): Promise<ReadingSession> {
    try {
      const session = await prisma.readingSession.upsert({
        where: {
          userId_bookId: { userId, bookId },
        },
        update: {
          ...progressData,
          lastAccessedAt: new Date(),
        },
        create: {
          userId,
          bookId,
          ...progressData,
          lastAccessedAt: new Date(),
        },
      });
      logger.debug(`Reading progress updated for user ${userId}, book ${bookId}`);
      return session;
    } catch (error) {
      logger.error('Failed to update reading progress:', error);
      throw error;
    }
  }

  async getReadingSession(userId: string, bookId: string): Promise<ReadingSession | null> {
    return prisma.readingSession.findUnique({
      where: {
        userId_bookId: { userId, bookId },
      },
    });
  }

  // Audio preferences operations
  async createAudioPreference(preferenceData: {
    userId: string;
    voiceId: string;
    voiceName: string;
    languageCode: string;
    gender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
    accent?: string;
    defaultSpeed?: number;
    pitchAdjustment?: number;
    volumeAdjustment?: number;
  }): Promise<AudioPreference> {
    try {
      const preference = await prisma.audioPreference.create({
        data: preferenceData,
      });
      logger.info(`Audio preference created: ${preference.voiceName}`);
      return preference;
    } catch (error) {
      logger.error('Failed to create audio preference:', error);
      throw error;
    }
  }

  async getUserAudioPreferences(userId: string): Promise<AudioPreference[]> {
    return prisma.audioPreference.findMany({
      where: { userId },
      orderBy: [
        { isFavorite: 'desc' },
        { usageCount: 'desc' },
      ],
    });
  }

  // Vector search operations (for AI features)
  async searchSimilarChapters(
    bookId: string,
    embedding: string,
    limit: number = 5
  ): Promise<Chapter[]> {
    // Using raw SQL for vector similarity search
    return prisma.$queryRaw`
      SELECT * FROM chapters 
      WHERE book_id = ${bookId}::uuid 
        AND content_embedding IS NOT NULL
      ORDER BY content_embedding <-> ${embedding}::vector
      LIMIT ${limit}
    `;
  }

  // Health check operations
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const [userCount, bookCount, chapterCount] = await Promise.all([
        prisma.user.count(),
        prisma.book.count(),
        prisma.chapter.count(),
      ]);

      return {
        status: 'healthy',
        details: {
          users: userCount,
          books: bookCount,
          chapters: chapterCount,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }
}

export const databaseService = new DatabaseService();