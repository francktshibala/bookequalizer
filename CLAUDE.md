# BookEqualizer - AI Reading & Audio Learning Companion

## 🎯 Project Status
**Current Phase**: PHASE 2 - INTELLIGENCE & INTERFACE (Days 5-8)  
**Phase 1**: ✅ COMPLETED - Audio-enhanced backend foundation operational  
**Next Goal**: AI Service + Frontend with real-time text-audio synchronization  

## 🏗️ Architecture Completed
**Backend Foundation** ✅:
- Audio-enhanced PostgreSQL (6 tables + pgvector)
- Express/TypeScript with TTS APIs (Google/Azure/Amazon)
- Prisma ORM with full type safety
- EPUB processing with audio preprocessing
- Multi-layer audio caching system
- Clerk authentication with progress sync
- Rate limiting and cost management

## 📅 PHASE 2 Tasks (AI Service + Frontend)
**Goal**: Smart audio processing + polished user experience

### AI Service Tasks (Days 5-6)
- [ ] **AI-001**: Set up Python/FastAPI with audio preprocessing
- [ ] **AI-002**: Implement EPUB parsing with sentence segmentation  
- [ ] **AI-003**: Create text preprocessing for optimal TTS synthesis
- [ ] **AI-004**: Build literature-specialized Q&A system
- [ ] **AI-005**: Implement vector embeddings with pgvector
- [ ] **AI-006**: Create real-time text-audio synchronization system

### Frontend Tasks (Days 7-8)  
- [ ] **FRONT-001**: Initialize Next.js 14.2.8 with TypeScript/Tailwind
- [ ] **FRONT-002**: Create responsive reading interface layout
- [ ] **FRONT-003**: Build audio player with Web Audio API
- [ ] **FRONT-004**: Implement real-time text highlighting sync
- [ ] **FRONT-005**: Create AI chat panel integration
- [ ] **FRONT-006**: Build EPUB upload component with mode selection
- [ ] **FRONT-007**: Add accessibility features (WCAG 2.1 AA)
- [ ] **FRONT-008**: Implement mobile-responsive design

## 🚀 Backend APIs Ready
**Available Endpoints**:
- `POST /api/upload/epub` - EPUB upload & processing
- `POST /api/tts/books/:id/audio/generate` - TTS generation
- `GET /api/audio/stream/:audioFileId` - Audio streaming
- `GET /api/auth/me` - User profile & preferences
- `PUT /api/progress/:bookId/progress` - Reading position sync

## 🎯 Phase 2 Success Criteria
- [ ] Real-time text highlighting during audio playbook
- [ ] AI-powered Q&A about book content
- [ ] Seamless mode switching (text ↔ audio ↔ hybrid)
- [ ] Cross-device progress synchronization
- [ ] Mobile-responsive interface

## 🔧 Development Setup
**Backend**: `npm run dev` (works without database for API testing)  
**Database**: `./scripts/setup-db.sh` + `npm run db:push` (requires Docker)  
**Test**: `npm run build` + `node test-quick.js` (validates structure)  

## 💻 Development Standards
**Performance Targets**:
- API response time: <200ms
- AI response time: <3 seconds (target: <2 seconds)
- Page load time: <2 seconds
- System uptime: >99.5%

**Quality Gates**:
- Zero TypeScript errors tolerance
- All endpoints validated with Zod schemas
- WCAG 2.1 AA accessibility compliance
- Rate limiting prevents abuse
- Comprehensive error handling

**Security Requirements**:
- EPUB file validation and sandboxing
- GDPR/COPPA compliance for education
- Input validation on all endpoints
- Secure file storage and access
- Rate limiting for AI cost management

**Testing Infrastructure**:
- Unit tests for core functionality
- Integration tests for API endpoints
- E2E tests for audio synchronization
- Accessibility testing with screen readers
- Performance monitoring and alerts

## 🛠️ Tech Stack Constraints
**Frontend**: Next.js 14.2.8, TypeScript 5.3.3, Tailwind CSS 3.4.6
**Backend**: Node.js 18+, Express.js, PostgreSQL 15+, Prisma ORM
**AI Service**: Python 3.9+, FastAPI, LangChain, pgvector
**Authentication**: Clerk with session management
**Deployment**: Vercel (frontend), Railway (backend/AI)

## 🚨 Emergency Procedures
**If Blocked**:
1. Document issue and switch to mock data approach
2. Test endpoints with Postman/curl first
3. Never spend >30min debugging same issue
4. Check database connectivity and environment variables
5. Monitor costs and performance continuously

## 📋 Commands to Remember
**Lint & Type Check**: `npm run lint && npm run typecheck`
**Database Reset**: `npm run db:reset && npm run db:push`
**Build Verification**: `npm run build`
**Cost Monitoring**: Check OpenAI/Claude API usage daily

## 🎭 Multi-Agent Development Approach
**Strategy**: Phased parallel development with specialized agents  
- **Phase 1**: Database + Backend (foundation)  
- **Phase 2**: AI Service + Frontend (features)  
- **Phase 3**: DevOps + Integration (production)  

**Agent Context Files**:
- Database Expert: `.ai-context/CLAUDE-AGENT-4.md`
- Backend Engineer: `.ai-context/CLAUDE-AGENT-2.md`  
- AI Service: `.ai-context/CLAUDE-AGENT-3.md`
- Frontend: `.ai-context/CLAUDE-AGENT-1.md`
- DevOps: `.ai-context/CLAUDE-AGENT-5.md`

## 🔄 Daily Workflow & Coordination
**Morning**: Check `TODO.md` → Load agent context → Begin phase tasks  
**Working**: Update task status (pending → in_progress → completed)  
**Evening**: Update progress → Commit changes → Plan next day  
**Agent Switch**: Load different `CLAUDE-AGENT-*.md` as context  

## ⚡ Performance & Success Metrics
**Audio-Specific KPIs**:
- TTS generation: <3 seconds per page
- Audio streaming latency: <200ms globally  
- Text highlighting sync: <50ms delay
- CDN cache hit rate: >95% for audio files
- Cost per book: <$0.15 (including audio)

**MVP Success Criteria**:
- Users can upload EPUB → choose reading/audio mode → AI assistance works
- Real-time text highlighting during audio playback functional
- Cross-device sync preserves reading/listening position  
- Educational accessibility standards met (WCAG 2.1 AA)

## 🚨 Risk Mitigation & Cost Management
**AI Cost Controls**:
- Aggressive response caching (60% cost reduction)
- Tiered models (GPT-3.5 for simple, GPT-4 for complex)
- Real-time cost monitoring with alerts
- Batch processing for efficiency

**Key Decisions Made**:
1. **Phased Development**: Avoid multi-agent chaos
2. **Google TTS**: Best cost/quality balance for startup
3. **Aggressive Caching**: 60% cost reduction strategy
4. **PostgreSQL**: Single database for simplicity
5. **Audio-First Design**: Core feature, not afterthought

---
**Phase 1 Commit**: 9d2374d - Complete audio-enhanced backend foundation  
**Repository**: https://github.com/francktshibala/bookequalizer.git