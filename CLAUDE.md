# BookEqualizer - AI Reading & Audio Learning Companion

## 🎯 Project Overview
**Mission**: Create an AI-powered reading companion with text-to-speech, real-time highlighting, and classical literature specialization  
**Market**: $41.6B education apps + $4.2B audiobook market  
**Timeline**: 10-day phased development to MVP  
**Target**: Educational institutions and accessibility-focused users  

## 🏗️ Architecture & Tech Stack
**Frontend**: Next.js 14.2.8, TypeScript, Tailwind CSS, Web Audio API  
**Backend**: Node.js/Express, PostgreSQL 15+, Clerk auth, TTS APIs  
**AI Service**: Python/FastAPI, LangChain, OpenAI/Claude, pgvector  
**Infrastructure**: Vercel (frontend), Railway (backend), CDN for audio files  

## 📅 Current Development Phase
**Active Phase**: PHASE 1 - FOUNDATION (Days 1-4)  
**Active Agents**: Database Expert + Backend Engineer  
**Goal**: Audio-capable data layer + TTS-enabled APIs  
**Status**: Ready to begin DB-001 and BACK-001 tasks  

## 🎭 Multi-Agent Development Approach
**Strategy**: Phased parallel development (not 5-agent chaos)  
- **Phase 1**: Database + Backend (foundation)  
- **Phase 2**: AI Service + Frontend (features)  
- **Phase 3**: DevOps + Integration (production)  

**Agent Context Files**:
- Database Expert: `.ai-context/CLAUDE-AGENT-4.md`
- Backend Engineer: `.ai-context/CLAUDE-AGENT-2.md`  
- AI Service: `.ai-context/CLAUDE-AGENT-3.md`
- Frontend: `.ai-context/CLAUDE-AGENT-1.md`
- DevOps: `.ai-context/CLAUDE-AGENT-5.md`

## 🎵 Audio Features (Core Differentiator)
**TTS Integration**: Google/Azure/Amazon Speech APIs with cost optimization  
**Real-time Sync**: Text highlighting synchronized with audio playback  
**Audio Player**: Play/pause/speed controls (0.5x to 2x), voice selection  
**Accessibility**: WCAG 2.1 AA compliance, screen reader compatible  
**Performance**: <200ms audio latency, <50ms highlighting sync  

## 🗃️ Database Schema (Audio-Enhanced)
**Core Tables**:
- `users` - Reading and audio preferences
- `books` - EPUB metadata with audio file references  
- `chapters` - Text chunks with audio segment mapping
- `audio_files` - TTS cache and metadata
- `playback_positions` - Cross-device reading/listening sync
- `audio_preferences` - Voice, speed, language settings

## 📡 API Design Patterns
**Audio Endpoints**:
- `POST /api/books/:id/audio/generate` - TTS generation
- `GET /api/books/:id/audio/stream` - Audio streaming
- `PUT /api/users/audio/preferences` - Audio settings
- `GET /api/books/:id/progress` - Reading/listening position

## ⚡ Performance Targets
**Audio-Specific KPIs**:
- TTS generation: <3 seconds per page
- Audio streaming latency: <200ms globally  
- Text highlighting sync: <50ms delay
- CDN cache hit rate: >95% for audio files
- Cost per book: <$0.15 (including audio)

## 🔄 Daily Workflow
**Morning**: Check `TODO.md` → Load agent context → Begin phase tasks  
**Working**: Update task status (pending → in_progress → completed)  
**Evening**: Update `PHASE-STATUS.md` → Commit progress → Plan next day  
**Agent Switch**: Load different `CLAUDE-AGENT-*.md` as context  

## 🚨 Key Decisions Made
1. **Phased Development**: Avoid 5-agent parallel chaos
2. **Google TTS**: Best cost/quality balance for startup
3. **Aggressive Caching**: 60% cost reduction strategy
4. **PostgreSQL**: Single database for simplicity
5. **Audio-First Design**: Not afterthought, core feature

## 🎯 Current Sprint Goals
**Phase 1 Success Criteria**:
- [ ] Database schema with audio tables functional
- [ ] TTS API integration working (Google Speech)
- [ ] Audio file caching system operational
- [ ] EPUB upload with audio preprocessing
- [ ] Shared TypeScript types across agents

## 📝 Next Actions
**Immediate**:
1. Begin Database Agent: Design core schema (DB-001)
2. Begin Backend Agent: Initialize Node.js/Express (BACK-001)
3. Create shared TypeScript types
4. Set up development environment

**This Week**:
- Complete Phase 1 foundation
- Prepare for Phase 2 (AI + Frontend)
- Document API contracts
- Test audio integration end-to-end

## 🏆 Success Metrics
**MVP Ready When**:
- Users can upload EPUB → choose reading/audio mode → AI assistance works
- Real-time text highlighting during audio playback functional
- Cross-device sync preserves reading/listening position  
- Educational accessibility standards met (WCAG 2.1 AA)

---
**Last Updated**: Phase 1 preparation complete, ready for development start  
**Repository**: https://github.com/francktshibala/bookequalizer.git