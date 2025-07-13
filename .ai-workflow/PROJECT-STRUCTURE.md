# BookEqualizer - Audio-Enhanced Project Structure

## 📁 RECOMMENDED DIRECTORY STRUCTURE

```
bookequalizer/
├── .ai-workflow/
│   ├── MASTER_PLAN.md           ✅ Updated with audio features
│   ├── PHASE-STATUS.md          ✅ Phase tracking with audio targets  
│   ├── PROJECT-STRUCTURE.md     ✅ This file
│   └── INTEGRATION-LOG.md       📝 Agent handoff documentation
├── .ai-context/
│   ├── CLAUDE-AGENT-1.md        ✅ Frontend + Audio Player Specialist
│   ├── CLAUDE-AGENT-2.md        ✅ Backend + Audio API Specialist  
│   ├── CLAUDE-AGENT-3.md        ✅ AI + TTS Preprocessing Specialist
│   ├── CLAUDE-AGENT-4.md        ✅ Database + Audio Data Specialist
│   └── CLAUDE-AGENT-5.md        ✅ DevOps + Audio Infrastructure Specialist
├── docs/
│   ├── API.md                   📝 REST API documentation  
│   ├── DATABASE.md              📝 Schema documentation
│   ├── AUDIO.md                 📝 TTS and audio system docs
│   └── DEPLOYMENT.md            📝 Infrastructure documentation
├── frontend/                    📁 Next.js application
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              📁 Base UI components
│   │   │   ├── reading/         📁 Reading interface components
│   │   │   ├── audio/           📁 Audio player components
│   │   │   └── ai-chat/         📁 AI chat panel components
│   │   ├── hooks/
│   │   │   ├── useAudioPlayer.ts 📁 Audio player state management
│   │   │   ├── useTextSync.ts   📁 Text-audio synchronization
│   │   │   └── useReading.ts    📁 Reading progress tracking
│   │   ├── lib/
│   │   │   ├── api.ts           📁 API client functions
│   │   │   ├── audio.ts         📁 Web Audio API utilities  
│   │   │   └── types.ts         📁 Shared TypeScript types
│   │   └── pages/
│   │       ├── index.tsx        📁 Home page
│   │       ├── library.tsx      📁 Book library
│   │       └── reader/[id].tsx  📁 Reading interface
│   ├── public/
│   │   └── audio-samples/       📁 Sample audio files for demo
│   ├── package.json
│   ├── tailwind.config.js
│   └── tsconfig.json
├── backend/                     📁 Node.js API server
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts          📁 Authentication endpoints
│   │   │   ├── books.ts         📁 EPUB upload and management
│   │   │   ├── audio.ts         📁 TTS generation and streaming
│   │   │   └── users.ts         📁 User preferences and progress
│   │   ├── middleware/
│   │   │   ├── auth.ts          📁 Authentication middleware
│   │   │   ├── rateLimiting.ts  📁 Rate limiting for API costs
│   │   │   └── validation.ts    📁 Request validation
│   │   ├── services/
│   │   │   ├── tts.ts           📁 Text-to-speech integration
│   │   │   ├── storage.ts       📁 File storage management
│   │   │   └── epub.ts          📁 EPUB file processing
│   │   ├── lib/
│   │   │   ├── database.ts      📁 Database connection
│   │   │   └── types.ts         📁 Shared TypeScript types
│   │   └── index.ts             📁 Express app entry point
│   ├── prisma/
│   │   ├── schema.prisma        📁 Database schema with audio tables
│   │   └── migrations/          📁 Database migration files
│   ├── package.json
│   └── tsconfig.json
├── ai-service/                  📁 Python FastAPI service
│   ├── src/
│   │   ├── routes/
│   │   │   ├── epub.py          📁 EPUB processing endpoints
│   │   │   ├── embeddings.py    📁 Vector embedding generation
│   │   │   ├── chat.py          📁 AI Q&A endpoints
│   │   │   └── audio_prep.py    📁 TTS preprocessing endpoints
│   │   ├── services/
│   │   │   ├── epub_parser.py   📁 EPUB text extraction
│   │   │   ├── text_processor.py 📁 Text preprocessing for TTS
│   │   │   ├── embeddings.py    📁 Vector embedding service
│   │   │   └── llm_client.py    📁 OpenAI/Claude integration
│   │   ├── models/
│   │   │   └── schemas.py       📁 Pydantic data models
│   │   └── main.py              📁 FastAPI app entry point
│   ├── requirements.txt
│   └── Dockerfile
├── database/                    📁 Database setup and utilities
│   ├── scripts/
│   │   ├── setup.sql            📁 Initial database setup
│   │   └── seed.sql             📁 Sample data for development
│   ├── migrations/              📁 Migration scripts
│   └── backups/                 📁 Database backup files
├── infrastructure/              📁 Deployment and DevOps
│   ├── docker/
│   │   ├── docker-compose.yml   📁 Local development setup
│   │   └── Dockerfile.prod      📁 Production containers
│   ├── deploy/
│   │   ├── vercel.json          📁 Vercel deployment config
│   │   ├── railway.json         📁 Railway deployment config
│   │   └── cdn-setup.md         📁 Audio CDN configuration
│   └── monitoring/
│       ├── alerts.yml           📁 Monitoring alerts
│       └── metrics.yml          📁 Performance metrics
├── shared/                      📁 Shared utilities and types
│   ├── types/
│   │   ├── book.ts              📁 Book-related type definitions
│   │   ├── audio.ts             📁 Audio-related type definitions
│   │   └── user.ts              📁 User-related type definitions
│   └── utils/
│       ├── validation.ts        📁 Shared validation functions
│       └── constants.ts         📁 Shared constants
├── tests/                       📁 Testing files
│   ├── e2e/                     📁 End-to-end tests
│   ├── integration/             📁 Integration tests
│   └── unit/                    📁 Unit tests
├── TODO.md                      ✅ Phased development plan
├── README.md                    📝 Project documentation
├── package.json                 📝 Root package.json for monorepo
└── .gitignore                   📝 Git ignore rules
```

## 🎯 AUDIO-SPECIFIC COMPONENTS

### Frontend Audio Components
```typescript
// src/components/audio/
├── AudioPlayer.tsx              // Main audio player component
├── PlaybackControls.tsx         // Play/pause/speed controls  
├── VoiceSelector.tsx            // Voice selection dropdown
├── TextHighlighter.tsx          // Real-time text highlighting
├── ProgressBar.tsx              // Audio progress with chapter markers
└── AudioVisualizer.tsx          // Optional: audio waveform display
```

### Backend Audio Services
```typescript  
// src/services/
├── tts.ts                       // TTS API integration (Google/Azure)
├── audioCache.ts                // Audio file caching logic
├── audioStreaming.ts            // Audio streaming optimization
└── audioSync.ts                 // Text-audio synchronization
```

### Database Audio Schema
```sql
-- Audio-related tables
├── audio_preferences            // User voice/speed preferences
├── audio_files                  // Generated TTS file metadata
├── playback_positions           // User reading/listening positions  
└── audio_cache                  // TTS response caching
```

## 🔄 AGENT WORKFLOW DIRECTORIES

### Phase 1: Database + Backend
```bash
# Agent working directories
├── /database-agent/             # Database Agent workspace
└── /backend-agent/              # Backend Agent workspace
```

### Phase 2: AI Service + Frontend  
```bash
├── /ai-service-agent/           # AI Service Agent workspace
└── /frontend-agent/             # Frontend Agent workspace
```

### Phase 3: DevOps Integration
```bash
├── /devops-agent/               # DevOps Agent workspace
└── /integration/                # All-agents integration space
```

## 📊 AUDIO PERFORMANCE MONITORING

### Metrics to Track
- TTS generation time per page
- Audio file cache hit rates
- Streaming latency by geographic region  
- Text-audio synchronization accuracy
- Audio file storage costs
- User engagement: reading vs listening time

### Monitoring Stack
- **Frontend**: Web Vitals for audio player performance
- **Backend**: Request duration for TTS endpoints
- **Database**: Audio position query performance
- **CDN**: Cache hit rates and global latency
- **Costs**: TTS API usage and storage costs

## 🚀 READY FOR PHASE 1 DEVELOPMENT

**Next Steps**:
1. Create `database/` and `backend/` directories
2. Initialize Database Agent with schema design
3. Initialize Backend Agent with Express.js setup
4. Begin Phase 1 tasks from TODO.md

**Project structure is ready for audio-enhanced multi-agent development!** 🎵