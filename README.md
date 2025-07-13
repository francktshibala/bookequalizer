# BookEqualizer 📚🎵

> AI Reading & Audio Learning Companion with Text-to-Speech and Real-time Highlighting

An accessibility-first reading platform that combines classical literature expertise with modern audio technology. Upload EPUBs, get AI assistance, and listen with synchronized text highlighting.

## 🎯 Features

- **📖 Smart Reading**: AI-powered Q&A for classical literature
- **🎵 Audio Playback**: High-quality TTS with voice selection  
- **✨ Real-time Sync**: Text highlighting during audio playback
- **♿ Accessibility**: WCAG 2.1 AA compliant, screen reader friendly
- **📱 Cross-platform**: Seamless experience on mobile, tablet, desktop
- **🔄 Progress Sync**: Resume reading/listening across devices

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Python 3.9+

### Development Setup

```bash
# Clone repository
git clone https://github.com/francktshibala/bookequalizer.git
cd bookequalizer

# Copy environment template
cp .env.example .env
# Add your API keys (see Environment Variables section)

# Install dependencies (when package.json files are created)
npm install

# Start development servers
npm run dev
```

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14.2.8, TypeScript, Tailwind CSS, Web Audio API
- **Backend**: Node.js/Express, PostgreSQL, Clerk Auth, TTS APIs  
- **AI Service**: Python/FastAPI, LangChain, OpenAI/Claude, pgvector
- **Infrastructure**: Vercel, Railway, CDN

### Multi-Agent Development
This project uses a phased multi-agent development approach:

1. **Phase 1**: Database + Backend (Foundation)
2. **Phase 2**: AI Service + Frontend (Features)  
3. **Phase 3**: DevOps + Integration (Production)

## 📁 Project Structure

```
bookequalizer/
├── .ai-context/          # Agent context files
├── .ai-workflow/         # Development planning
├── frontend/             # Next.js application
├── backend/              # Node.js API server
├── ai-service/           # Python FastAPI service
├── database/             # Schema and migrations
├── shared/               # Shared types and utilities
├── docs/                 # Documentation
└── TODO.md              # Development tracker
```

## 🔧 Environment Variables

Create `.env` file with:

```bash
# Database
DATABASE_URL=postgresql://localhost:5432/bookequalizer

# Authentication
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# Text-to-Speech
GOOGLE_TTS_API_KEY=your_google_tts_key
# OR
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=your_region

# AI Services  
OPENAI_API_KEY=your_openai_key
# OR
ANTHROPIC_API_KEY=your_anthropic_key

# Application
NEXT_PUBLIC_API_URL=http://localhost:3001
AUDIO_STORAGE_URL=your_cdn_url
```

## 🎭 Development Workflow

### Agent Context Switching
Load appropriate context when working on different components:

```bash
# Working on frontend
# Load: .ai-context/CLAUDE-AGENT-1.md

# Working on backend  
# Load: .ai-context/CLAUDE-AGENT-2.md

# Working on AI service
# Load: .ai-context/CLAUDE-AGENT-3.md

# Working on database
# Load: .ai-context/CLAUDE-AGENT-4.md

# Working on deployment
# Load: .ai-context/CLAUDE-AGENT-5.md
```

### Daily Progress Tracking
1. Check `TODO.md` for current phase tasks
2. Update task status as you work
3. Update `PHASE-STATUS.md` at end of day
4. Commit progress with descriptive messages

## 📊 Performance Targets

### Audio Features
- **TTS Generation**: <3 seconds per page
- **Audio Streaming**: <200ms latency globally
- **Text Highlighting**: <50ms sync delay  
- **Cache Hit Rate**: >95% for audio files

### General Performance  
- **Page Load**: <2 seconds
- **API Response**: <200ms
- **Database Queries**: <100ms
- **System Uptime**: >99.5%

## 🧪 Testing

```bash
# Run all tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint

# E2E tests (audio features)
npm run test:e2e
```

## 📖 Documentation

- [API Documentation](docs/API.md)
- [Database Schema](docs/DATABASE.md)  
- [Audio System](docs/AUDIO.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## 🤝 Contributing

1. Check current phase in `PHASE-STATUS.md`
2. Pick available tasks from `TODO.md`
3. Load appropriate agent context file
4. Follow coding standards in agent documentation
5. Update progress and commit changes

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Classical literature datasets and processing
- Open source TTS and accessibility libraries
- Educational technology research community

---

**Current Phase**: Foundation Development (Database + Backend)  
**Next**: Start Phase 1 tasks from `TODO.md`