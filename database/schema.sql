-- BookEqualizer Core Database Schema with Audio Support
-- PostgreSQL 15+ with pgvector extension

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- Users table with audio preferences
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    
    -- Audio preferences
    preferred_voice VARCHAR(50) DEFAULT 'en-US-Standard-A',
    playback_speed DECIMAL(3,2) DEFAULT 1.00 CHECK (playback_speed BETWEEN 0.5 AND 2.0),
    preferred_language VARCHAR(10) DEFAULT 'en-US',
    volume_level DECIMAL(3,2) DEFAULT 1.00 CHECK (volume_level BETWEEN 0.0 AND 1.0),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Books table with audio file references and metadata
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    author VARCHAR(300) NOT NULL,
    isbn VARCHAR(20),
    
    -- File metadata
    epub_file_path VARCHAR(1000) NOT NULL,
    epub_file_size BIGINT NOT NULL,
    total_pages INTEGER,
    word_count INTEGER,
    
    -- Audio metadata
    has_audio BOOLEAN DEFAULT FALSE,
    audio_generation_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    total_audio_duration_seconds INTEGER,
    audio_cost_usd DECIMAL(10,4) DEFAULT 0.00,
    
    -- Processing metadata
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chapters table with text chunks and audio segment mapping
CREATE TABLE chapters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL,
    title VARCHAR(500),
    
    -- Text content
    content TEXT NOT NULL,
    word_count INTEGER NOT NULL,
    character_count INTEGER NOT NULL,
    
    -- Audio mapping
    audio_file_id UUID REFERENCES audio_files(id),
    start_time_seconds DECIMAL(8,3),
    end_time_seconds DECIMAL(8,3),
    
    -- Vector embeddings for AI search
    content_embedding vector(1536), -- OpenAI ada-002 dimensions
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(book_id, chapter_number)
);

-- Audio files table for caching and metadata
CREATE TABLE audio_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
    
    -- File information
    file_path VARCHAR(1000) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    duration_seconds DECIMAL(8,3) NOT NULL,
    
    -- TTS metadata
    voice_used VARCHAR(50) NOT NULL,
    language_code VARCHAR(10) NOT NULL,
    tts_provider VARCHAR(20) NOT NULL, -- google, azure, amazon
    generation_cost_usd DECIMAL(8,4) DEFAULT 0.00,
    
    -- Audio quality
    sample_rate INTEGER DEFAULT 22050,
    bit_rate INTEGER DEFAULT 64000,
    format VARCHAR(10) DEFAULT 'mp3',
    
    -- CDN and caching
    cdn_url VARCHAR(1000),
    cache_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reading sessions with playback positions for cross-device sync
CREATE TABLE reading_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    
    -- Position tracking
    current_chapter_id UUID REFERENCES chapters(id),
    text_position_percent DECIMAL(5,3) DEFAULT 0.000, -- 0.000 to 100.000
    audio_position_seconds DECIMAL(8,3) DEFAULT 0.000,
    
    -- Session metadata
    reading_mode VARCHAR(20) DEFAULT 'text', -- text, audio, hybrid
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Reading statistics
    total_reading_time_minutes INTEGER DEFAULT 0,
    total_audio_time_minutes INTEGER DEFAULT 0,
    pages_read INTEGER DEFAULT 0,
    
    -- Timestamps
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, book_id)
);

-- Audio preferences table for fine-grained voice settings
CREATE TABLE audio_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Voice customization
    voice_id VARCHAR(50) NOT NULL,
    voice_name VARCHAR(100) NOT NULL,
    language_code VARCHAR(10) NOT NULL,
    gender VARCHAR(10), -- male, female, neutral
    accent VARCHAR(50),
    
    -- Playback settings
    default_speed DECIMAL(3,2) DEFAULT 1.00,
    pitch_adjustment DECIMAL(3,2) DEFAULT 1.00,
    volume_adjustment DECIMAL(3,2) DEFAULT 1.00,
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    is_favorite BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX idx_books_audio_status ON books(audio_generation_status);
CREATE INDEX idx_chapters_book_id ON chapters(book_id);
CREATE INDEX idx_chapters_content_embedding ON chapters USING ivfflat (content_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_audio_files_book_id ON audio_files(book_id);
CREATE INDEX idx_audio_files_chapter_id ON audio_files(chapter_id);
CREATE INDEX idx_reading_sessions_user_book ON reading_sessions(user_id, book_id);
CREATE INDEX idx_reading_sessions_active ON reading_sessions(is_active, last_accessed_at);
CREATE INDEX idx_audio_preferences_user_id ON audio_preferences(user_id);

-- Updated timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON chapters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_audio_files_updated_at BEFORE UPDATE ON audio_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reading_sessions_updated_at BEFORE UPDATE ON reading_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_audio_preferences_updated_at BEFORE UPDATE ON audio_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();