# AI Service Deployment Guide

## 🚀 Quick Start (Recommended)

### Option 1: Staged Deployment (Recommended for Railway)
```bash
cd ai-service
./deploy-stages.sh
```

This will deploy in 3 stages:
1. **Stage 1**: Basic FastAPI + EPUB validation
2. **Stage 2**: Full EPUB processing + Text processing + Q&A  
3. **Stage 3**: Vector embeddings + Full ML features

### Option 2: Manual Deployment

**Stage 1 (Minimal - Test Railway connectivity)**
```bash
cp main-stage1.py main.py
cp requirements-stage1.txt requirements.txt
railway up
```

**Stage 3 (Full Features)**
```bash
cp main-full.py main.py
cp requirements-full.txt requirements.txt
railway up
```

## 📁 File Structure

```
ai-service/
├── main.py                    # Current active main file
├── main-stage1.py            # Stage 1: Basic FastAPI
├── main-full.py              # Stage 3: Full features
├── requirements.txt          # Current active requirements
├── requirements-stage1.txt   # Stage 1: Minimal deps
├── requirements-full.txt     # Stage 3: Full deps
├── deploy-stages.sh          # Automated deployment script
└── services/                 # AI service implementations
    ├── epub_processor.py     # EPUB processing
    ├── text_processor.py     # Text optimization
    ├── qa_service.py         # Q&A system
    ├── sync_service.py       # Text-audio sync
    └── embedding_service.py  # Vector embeddings
```

## 🔧 Manual Commands

```bash
# Deploy current files
railway up

# Check deployment status
railway status

# View logs
railway logs

# Get service URL
railway domain

# Test health check
curl $(railway domain)/health
```

## 🐛 Troubleshooting

### Common Issues

1. **404 "Application not found"**
   - Check: `railway status`
   - Fix: `railway link` (relink to project)

2. **Dependency installation fails**
   - Use Stage 1 deployment first
   - Add dependencies incrementally

3. **Service won't start**
   - Check logs: `railway logs`
   - Verify PORT environment variable

### Railway Project Setup

```bash
# Initial setup (if needed)
railway login
railway init
railway link

# Environment variables
railway variables set OPENAI_API_KEY=your_key
railway variables set DATABASE_URL=your_db_url
```

## 🎯 Testing Deployment

### Stage 1 Tests
```bash
# Health check
curl $(railway domain)/health

# EPUB upload test
curl -X POST $(railway domain)/process-epub \
  -F "file=@test.epub"
```

### Stage 3 Tests
```bash
# Full Q&A test
curl -X POST $(railway domain)/qa \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is this book about?",
    "book_id": "test-book",
    "context_limit": 5
  }'
```

## 📊 Monitoring

- **Service URL**: `railway domain`
- **API Docs**: `$(railway domain)/docs`
- **Health**: `$(railway domain)/health`
- **Logs**: `railway logs --tail`

## 🔄 Rollback

```bash
# Rollback to previous deployment
railway rollback

# Or restore from backup
cp main-backup.py main.py
cp requirements-backup.txt requirements.txt
railway up
```