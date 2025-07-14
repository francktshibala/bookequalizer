// BookEqualizer - Shared Database Types
// Auto-generated from PostgreSQL schema for type safety across all agents

export interface User {
  id: string;
  clerk_user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  
  // Audio preferences
  preferred_voice: string;
  playback_speed: number;
  preferred_language: string;
  volume_level: number;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  
  // File metadata
  epub_file_path: string;
  epub_file_size: number;
  total_pages?: number;
  word_count?: number;
  
  // Audio metadata
  has_audio: boolean;
  audio_generation_status: 'pending' | 'processing' | 'completed' | 'failed';
  total_audio_duration_seconds?: number;
  audio_cost_usd: number;
  
  // Processing metadata
  processing_completed_at?: Date;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

export interface Chapter {
  id: string;
  book_id: string;
  chapter_number: number;
  title?: string;
  
  // Text content
  content: string;
  word_count: number;
  character_count: number;
  
  // Audio mapping
  audio_file_id?: string;
  start_time_seconds?: number;
  end_time_seconds?: number;
  
  // Vector embeddings for AI search
  content_embedding?: number[]; // Vector type for TypeScript
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

export interface AudioFile {
  id: string;
  book_id: string;
  chapter_id?: string;
  
  // File information
  file_path: string;
  file_size_bytes: number;
  duration_seconds: number;
  
  // TTS metadata
  voice_used: string;
  language_code: string;
  tts_provider: 'google' | 'azure' | 'amazon';
  generation_cost_usd: number;
  
  // Audio quality
  sample_rate: number;
  bit_rate: number;
  format: string;
  
  // CDN and caching
  cdn_url?: string;
  cache_expires_at?: Date;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

export interface ReadingSession {
  id: string;
  user_id: string;
  book_id: string;
  
  // Position tracking
  current_chapter_id?: string;
  text_position_percent: number;
  audio_position_seconds: number;
  
  // Session metadata
  reading_mode: 'text' | 'audio' | 'hybrid';
  is_active: boolean;
  
  // Reading statistics
  total_reading_time_minutes: number;
  total_audio_time_minutes: number;
  pages_read: number;
  
  // Timestamps
  last_accessed_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AudioPreference {
  id: string;
  user_id: string;
  
  // Voice customization
  voice_id: string;
  voice_name: string;
  language_code: string;
  gender?: 'male' | 'female' | 'neutral';
  accent?: string;
  
  // Playback settings
  default_speed: number;
  pitch_adjustment: number;
  volume_adjustment: number;
  
  // Usage tracking
  usage_count: number;
  is_favorite: boolean;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

// Related types for API responses
export interface BookWithAudio extends Book {
  chapters: Chapter[];
  audio_files: AudioFile[];
  reading_session?: ReadingSession;
}

export interface ChapterWithAudio extends Chapter {
  audio_file?: AudioFile;
  book: Pick<Book, 'id' | 'title' | 'author'>;
}

// Audio streaming types
export interface AudioStreamRequest {
  book_id: string;
  chapter_id?: string;
  start_time?: number;
  quality?: 'low' | 'medium' | 'high';
}

export interface AudioSyncPosition {
  chapter_id: string;
  text_position_percent: number;
  audio_position_seconds: number;
  timestamp: Date;
}

// TTS generation types
export interface TTSGenerationRequest {
  book_id: string;
  chapter_ids?: string[];
  voice_id: string;
  language_code: string;
  priority?: 'low' | 'normal' | 'high';
}

export interface TTSGenerationStatus {
  book_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress_percent: number;
  estimated_completion_minutes?: number;
  error_message?: string;
  cost_estimate_usd: number;
}