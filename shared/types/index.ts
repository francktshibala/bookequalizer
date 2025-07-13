/**
 * BookEqualizer - Shared TypeScript Types
 * Cross-agent type definitions for type safety
 */

// ================================
// USER TYPES
// ================================

export interface User {
  id: string;
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  preferences: UserPreferences;
  subscription: UserSubscription;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  audio: AudioPreferences;
  reading: ReadingPreferences;
  ai: AIPreferences;
}

export interface AudioPreferences {
  defaultVoice: string;
  defaultSpeed: number; // 0.5 to 2.0
  defaultQuality: AudioQuality;
  autoplay: boolean;
  volume: number; // 0.0 to 1.0
}

export interface ReadingPreferences {
  fontSize: FontSize;
  theme: Theme;
  highlightColor: string;
  lineHeight: number;
  fontFamily: string;
}

export interface AIPreferences {
  responseLength: 'short' | 'medium' | 'detailed';
  includeContext: boolean;
  autoSuggest: boolean;
}

export interface UserSubscription {
  plan: 'free' | 'premium' | 'educational';
  status: 'active' | 'inactive' | 'canceled';
  usage: UsageStats;
  limits: UsageLimits;
}

export interface UsageStats {
  booksProcessed: number;
  audioMinutesGenerated: number;
  questionsAsked: number;
  currentPeriodStart: Date;
}

export interface UsageLimits {
  maxBooks: number;
  maxAudioMinutes: number;
  maxQuestions: number;
}

// ================================
// BOOK TYPES
// ================================

export interface Book {
  id: string;
  userId: string;
  title: string;
  author: string;
  language: string;
  isbn?: string;
  coverImage?: string;
  metadata: BookMetadata;
  chapters: Chapter[];
  processingStatus: ProcessingStatus;
  audioGeneration: AudioGenerationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookMetadata {
  publisher?: string;
  publishedDate?: string;
  description?: string;
  genre?: string[];
  wordCount: number;
  estimatedReadingTime: number; // minutes
}

export interface Chapter {
  id: string;
  bookId: string;
  title: string;
  order: number;
  content: string;
  textLength: number;
  audioFile?: AudioFile;
  embeddings?: Embedding[];
}

export interface AudioFile {
  id: string;
  chapterId: string;
  url: string;
  format: AudioFormat;
  quality: AudioQuality;
  duration: number; // seconds
  fileSize: number; // bytes
  voice: string;
  speed: number;
  generatedAt: Date;
}

export interface Embedding {
  id: string;
  chapterId: string;
  textChunk: string;
  vector: number[];
  startPosition: number;
  endPosition: number;
}

// ================================
// AUDIO TYPES
// ================================

export interface AudioGenerationJob {
  id: string;
  bookId: string;
  chapterId: string;
  status: JobStatus;
  progress: number; // 0 to 100
  voice: string;
  speed: number;
  quality: AudioQuality;
  estimatedTime?: number; // seconds
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export interface AudioGenerationStatus {
  overallStatus: ProcessingStatus;
  totalChapters: number;
  completedChapters: number;
  jobs: AudioGenerationJob[];
  estimatedTotalTime: number;
}

export interface TTS_Voice {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  premium: boolean;
  sampleUrl?: string;
}

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  speed: number;
  currentChapter: string;
  currentSentence?: number;
}

// ================================
// READING PROGRESS TYPES
// ================================

export interface ReadingProgress {
  id: string;
  userId: string;
  bookId: string;
  chapterId: string;
  position: ReadingPosition;
  mode: ReadingMode;
  sessionStart: Date;
  lastUpdated: Date;
}

export interface ReadingPosition {
  text: TextPosition;
  audio?: AudioPosition;
}

export interface TextPosition {
  characterOffset: number;
  paragraph: number;
  sentence?: number;
  wordCount: number;
}

export interface AudioPosition {
  currentTime: number;
  duration: number;
  chapterProgress: number; // 0 to 1
}

export interface ReadingSession {
  id: string;
  userId: string;
  bookId: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // seconds
  mode: ReadingMode;
  chaptersRead: string[];
  progressMade: number; // characters or seconds
}

// ================================
// AI CHAT TYPES
// ================================

export interface ChatMessage {
  id: string;
  userId: string;
  bookId: string;
  question: string;
  answer: string;
  context: ChatContext;
  sources: TextSource[];
  confidence: number; // 0 to 1
  helpful?: boolean; // user feedback
  createdAt: Date;
}

export interface ChatContext {
  chapterId: string;
  position: number;
  surroundingText: string;
  mode: ReadingMode;
}

export interface TextSource {
  chapterId: string;
  text: string;
  startPosition: number;
  endPosition: number;
  confidence: number;
}

export interface AIResponse {
  answer: string;
  sources: TextSource[];
  confidence: number;
  processingTime: number;
}

// ================================
// TEXT SYNCHRONIZATION TYPES
// ================================

export interface TextHighlight {
  id: string;
  chapterId: string;
  startPosition: number;
  endPosition: number;
  audioTime: number;
  duration: number;
  sentenceId: string;
}

export interface SentenceMapping {
  id: string;
  chapterId: string;
  text: string;
  startPosition: number;
  endPosition: number;
  audioStart: number;
  audioEnd: number;
  confidence: number;
}

// ================================
// API REQUEST/RESPONSE TYPES
// ================================

export interface UploadBookRequest {
  generateAudio: boolean;
  audioPreferences?: Partial<AudioPreferences>;
}

export interface UploadBookResponse {
  book: Book;
  audioGeneration?: AudioGenerationStatus;
}

export interface GenerateAudioRequest {
  chapterId: string;
  voice: string;
  speed: number;
  quality: AudioQuality;
}

export interface GenerateAudioResponse {
  job: AudioGenerationJob;
}

export interface ChatRequest {
  question: string;
  context: ChatContext;
}

export interface ChatResponse {
  message: ChatMessage;
}

export interface UpdateProgressRequest {
  chapterId: string;
  position: ReadingPosition;
  mode: ReadingMode;
}

// ================================
// ENUM TYPES
// ================================

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'error';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type ReadingMode = 'text' | 'audio' | 'hybrid';
export type AudioFormat = 'mp3' | 'wav' | 'ogg';
export type AudioQuality = 'low' | 'medium' | 'high';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
export type Theme = 'light' | 'dark' | 'sepia';

// ================================
// ERROR TYPES
// ================================

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// ================================
// UTILITY TYPES
// ================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DatabaseTimestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
}

// ================================
// AUDIO ANALYSIS TYPES
// ================================

export interface AudioAnalysis {
  waveform: number[];
  peaks: number[];
  duration: number;
  averageVolume: number;
  silences: TimeRange[];
}

export interface TimeRange {
  start: number;
  end: number;
}

// ================================
// EXPORT CONVENIENCE TYPES
// ================================

export type BookWithProgress = Book & {
  progress?: ReadingProgress;
  lastSession?: ReadingSession;
};

export type ChapterWithAudio = Chapter & {
  audioFile: AudioFile;
  highlights: TextHighlight[];
};

export type UserWithStats = User & {
  stats: UsageStats;
  recentBooks: Book[];
};

// ================================
// TYPE GUARDS
// ================================

export const isAudioMode = (mode: ReadingMode): mode is 'audio' | 'hybrid' => {
  return mode === 'audio' || mode === 'hybrid';
};

export const isProcessingComplete = (status: ProcessingStatus): status is 'completed' => {
  return status === 'completed';
};

export const hasAudioFile = (chapter: Chapter): chapter is ChapterWithAudio => {
  return chapter.audioFile !== undefined;
};

// ================================
// CONSTANTS
// ================================

export const AUDIO_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0] as const;
export const AUDIO_QUALITIES: AudioQuality[] = ['low', 'medium', 'high'];
export const READING_MODES: ReadingMode[] = ['text', 'audio', 'hybrid'];
export const FONT_SIZES: FontSize[] = ['small', 'medium', 'large', 'xlarge'];
export const THEMES: Theme[] = ['light', 'dark', 'sepia'];

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_QUESTION_LENGTH = 500;
export const MAX_BOOKS_FREE = 5;
export const MAX_AUDIO_MINUTES_FREE = 120;