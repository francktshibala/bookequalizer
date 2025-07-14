# BookEqualizer Database Setup

## Quick Start

1. **Start Database**:
   ```bash
   ./scripts/setup-db.sh
   ```

2. **Verify Setup**:
   ```bash
   docker-compose exec postgres psql -U postgres -d bookequalizer -c "\dt"
   ```

## Manual Setup (if Docker unavailable)

1. **Install PostgreSQL 15+ with pgvector**:
   ```bash
   # Ubuntu/Debian
   sudo apt install postgresql-15 postgresql-contrib-15
   
   # Install pgvector
   sudo apt install postgresql-15-pgvector
   ```

2. **Create Database**:
   ```sql
   sudo -u postgres createdb bookequalizer
   sudo -u postgres psql bookequalizer < database/schema.sql
   ```

3. **Update .env**:
   ```
   DATABASE_URL=postgresql://postgres:password@localhost:5432/bookequalizer
   ```

## Database Features

- ✅ **Audio-Enhanced Schema**: 6 tables optimized for TTS and audio streaming
- ✅ **Vector Search**: pgvector extension for AI embeddings (1536 dimensions)
- ✅ **Performance Indexes**: Optimized for <50ms audio sync queries
- ✅ **Automatic Timestamps**: Updated_at triggers on all tables
- ✅ **Cross-Device Sync**: Reading positions and audio playback state

## Schema Overview

| Table | Purpose | Audio Features |
|-------|---------|----------------|
| `users` | User accounts | Audio preferences, voice settings |
| `books` | EPUB metadata | Audio generation status, cost tracking |
| `chapters` | Text chunks | Audio segment mapping, embeddings |
| `audio_files` | TTS cache | Duration, voice, CDN URLs |
| `reading_sessions` | Progress sync | Text/audio position tracking |
| `audio_preferences` | Voice settings | Speed, pitch, volume per user |

## Testing

```bash
# Test database connection
npm run test:db

# Test vector search
docker-compose exec postgres psql -U postgres -d bookequalizer -c "
SELECT content, content_embedding <-> '[0.1,0.2,0.3]'::vector AS similarity 
FROM chapters 
ORDER BY similarity LIMIT 1;
"
```