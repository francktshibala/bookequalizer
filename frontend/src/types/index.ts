export interface Book {
  id: string
  title: string
  author?: string
  chapters: Chapter[]
  totalSegments: number
  uploadDate: string
  status: 'processing' | 'ready' | 'error'
}

export interface Chapter {
  id: string
  title: string
  index: number
  content: string
  segments: TextSegment[]
  wordCount: number
  characterCount: number
  audioFileId?: string
  syncData?: SyncData
}

export interface TextSegment {
  id: string
  text: string
  startChar: number
  endChar: number
  sentenceIndex: number
  audioStartTime?: number
  audioEndTime?: number
}

export interface SyncData {
  bookId: string
  chapterId: string
  timestamps: SyncTimestamp[]
  totalDuration: number
  syncQuality: 'excellent' | 'good' | 'fair' | 'poor'
  createdAt: string
}

export interface SyncTimestamp {
  segmentId: string
  startTime: number
  endTime: number
  confidence: number
}

export interface AudioPlayer {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  playbackRate: number
}

export interface ReadingMode {
  mode: 'text' | 'audio' | 'hybrid'
  autoScroll: boolean
  fontSize: number
  theme: 'light' | 'dark' | 'sepia'
}

export interface QAResponse {
  answer: string
  confidence: number
  sources: Array<{
    id: string
    textPreview: string
    startChar: number
    endChar: number
    similarityScore: number
  }>
  reasoning?: string
  relatedTopics: string[]
}

export interface UserProgress {
  bookId: string
  chapterId: string
  characterPosition: number
  audioPosition: number
  lastUpdated: string
  readingMode: ReadingMode
}