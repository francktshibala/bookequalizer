#!/usr/bin/env python3
"""
BookEqualizer AI Service - Complete FastAPI implementation
All Phase 2 features with production-ready endpoints
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
import logging
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from datetime import datetime
import asyncio
from dotenv import load_dotenv

# Import our services
from services.epub_processor import EPUBProcessor
from services.text_processor import TextProcessor
from services.qa_service import QAService
from services.sync_service import SyncService
from services.embedding_service import EmbeddingService
from models.schemas import TTSProvider, VoiceSettings, TextSegment

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="BookEqualizer AI Service",
    description="Intelligent audio processing for synchronized reading",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
epub_processor = EPUBProcessor()
text_processor = TextProcessor()
qa_service = QAService()
sync_service = SyncService()
embedding_service = EmbeddingService()

# Pydantic models for request/response
class ProcessTextRequest(BaseModel):
    text: str
    tts_provider: str
    voice_settings: Optional[Dict[str, Any]] = None
    optimize_for: str = "quality"

class QARequest(BaseModel):
    question: str
    book_id: str
    context_limit: int = 5
    include_citations: bool = True

class SyncRequest(BaseModel):
    book_id: str
    chapter_id: str
    audio_duration: float
    text_segments: List[Dict[str, Any]]
    timing_precision: str = "sentence"

class EmbeddingRequest(BaseModel):
    book_id: str
    content: str

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    features: List[str]
    timestamp: str

# Global service initialization flag
services_initialized = False

@app.on_event("startup")
async def startup_event():
    """Initialize all services on startup"""
    global services_initialized
    try:
        logger.info("Initializing AI services...")
        
        # Initialize services in order
        await epub_processor.initialize()
        logger.info("✓ EPUB processor initialized")
        
        await text_processor.initialize()
        logger.info("✓ Text processor initialized")
        
        await qa_service.initialize()
        logger.info("✓ Q&A service initialized")
        
        await sync_service.initialize()
        logger.info("✓ Sync service initialized")
        
        await embedding_service.initialize()
        logger.info("✓ Embedding service initialized")
        
        services_initialized = True
        logger.info("🚀 All AI services initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        services_initialized = False

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    try:
        await qa_service.close()
        await embedding_service.close()
        logger.info("Services shut down successfully")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

# Health check and root endpoints
@app.get("/", response_model=Dict[str, Any])
async def root():
    """Root endpoint"""
    return {
        "message": "BookEqualizer AI Service",
        "status": "running",
        "version": "2.0.0",
        "features": [
            "EPUB Processing",
            "Text Optimization",
            "Q&A System",
            "Text-Audio Sync",
            "Vector Embeddings"
        ],
        "docs": "/docs"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Comprehensive health check"""
    return HealthResponse(
        status="healthy" if services_initialized else "initializing",
        service="BookEqualizer AI Service",
        version="2.0.0",
        features=[
            "EPUB Processing",
            "Text Optimization", 
            "Q&A System",
            "Text-Audio Sync",
            "Vector Embeddings"
        ],
        timestamp=datetime.now().isoformat()
    )

# EPUB Processing endpoint
@app.post("/process-epub")
async def process_epub(file: UploadFile = File(...)):
    """Process EPUB file and extract content for audio optimization"""
    if not services_initialized:
        raise HTTPException(status_code=503, detail="Services still initializing")
    
    if not file.filename.endswith('.epub'):
        raise HTTPException(status_code=400, detail="Only EPUB files are supported")
    
    try:
        # Read file content
        content = await file.read()
        
        # Process EPUB
        result = await epub_processor.process_epub(content, file.filename)
        
        logger.info(f"EPUB processed: {result['title']} ({result['total_segments']} segments)")
        
        return {
            "success": True,
            "book_id": result['book_id'],
            "title": result['title'],
            "author": result['author'],
            "chapters": result['chapters'],
            "total_segments": result['total_segments'],
            "processing_time": result['processing_time']
        }
        
    except Exception as e:
        logger.error(f"EPUB processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"EPUB processing failed: {str(e)}")

# Text Processing endpoint
@app.post("/process-text")
async def process_text(request: ProcessTextRequest):
    """Process text for optimal TTS synthesis"""
    if not services_initialized:
        raise HTTPException(status_code=503, detail="Services still initializing")
    
    try:
        # Convert provider string to enum
        tts_provider = TTSProvider(request.tts_provider.upper())
        
        # Process text
        result = await text_processor.process_text(
            text=request.text,
            tts_provider=tts_provider,
            voice_settings=VoiceSettings(**request.voice_settings) if request.voice_settings else None,
            optimize_for=request.optimize_for
        )
        
        logger.info(f"Text processed: {len(request.text)} chars → {result['character_count']} chars")
        
        return {
            "success": True,
            "processed_text": result['processed_text'],
            "segments": result['segments'],
            "optimization_notes": result['optimization_notes'],
            "estimated_duration": result['estimated_duration'],
            "character_count": result['character_count']
        }
        
    except Exception as e:
        logger.error(f"Text processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Text processing failed: {str(e)}")

# Question & Answer endpoint
@app.post("/qa")
async def ask_question(request: QARequest):
    """Answer questions about book content using AI"""
    if not services_initialized:
        raise HTTPException(status_code=503, detail="Services still initializing")
    
    try:
        result = await qa_service.answer_question(
            question=request.question,
            book_id=request.book_id,
            context_limit=request.context_limit,
            include_citations=request.include_citations
        )
        
        logger.info(f"Q&A processed: {request.question[:50]}... (confidence: {result['confidence']})")
        
        return {
            "success": True,
            "answer": result['answer'],
            "confidence": result['confidence'],
            "sources": result.get('sources', []),
            "reasoning": result.get('reasoning', ''),
            "related_topics": result.get('related_topics', [])
        }
        
    except Exception as e:
        logger.error(f"Q&A processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Q&A processing failed: {str(e)}")

# Text-Audio Synchronization endpoints
@app.post("/sync")
async def create_sync_mapping(request: SyncRequest):
    """Create synchronization mapping between text segments and audio timing"""
    if not services_initialized:
        raise HTTPException(status_code=503, detail="Services still initializing")
    
    try:
        result = await sync_service.create_sync_mapping(
            book_id=request.book_id,
            chapter_id=request.chapter_id,
            audio_duration=request.audio_duration,
            text_segments=request.text_segments,
            timing_precision=request.timing_precision
        )
        
        logger.info(f"Sync mapping created: {request.book_id}/{request.chapter_id} ({len(result['timestamps'])} timestamps)")
        
        return {
            "success": True,
            "book_id": result['book_id'],
            "chapter_id": result['chapter_id'],
            "timestamps": result['timestamps'],
            "sync_quality": result['sync_quality'],
            "created_at": result['created_at']
        }
        
    except Exception as e:
        logger.error(f"Sync mapping creation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Sync mapping creation failed: {str(e)}")

@app.get("/sync/{book_id}/{chapter_id}")
async def get_sync_data(book_id: str, chapter_id: str):
    """Retrieve cached synchronization data"""
    if not services_initialized:
        raise HTTPException(status_code=503, detail="Services still initializing")
    
    try:
        result = await sync_service.get_sync_data(book_id, chapter_id)
        
        if not result.get('timestamps'):
            raise HTTPException(status_code=404, detail="Sync data not found")
        
        return {
            "success": True,
            "book_id": result['book_id'],
            "chapter_id": result['chapter_id'],
            "timestamps": result['timestamps'],
            "sync_quality": result['sync_quality'],
            "created_at": result['created_at']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sync data retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=f"Sync data retrieval failed: {str(e)}")

# Vector Embeddings endpoint
@app.post("/embeddings")
async def generate_embeddings(request: EmbeddingRequest):
    """Generate vector embeddings for content"""
    if not services_initialized:
        raise HTTPException(status_code=503, detail="Services still initializing")
    
    try:
        result = await embedding_service.generate_embeddings(
            book_id=request.book_id,
            content=request.content
        )
        
        logger.info(f"Embeddings generated: {request.book_id} ({len(result['chunks'])} chunks)")
        
        return {
            "success": True,
            "book_id": request.book_id,
            "chunks": len(result['chunks']),
            "total_tokens": result['total_tokens'],
            "processing_time": result['processing_time']
        }
        
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")

# Cache management endpoints
@app.post("/cache/clear")
async def clear_caches():
    """Clear all service caches"""
    if not services_initialized:
        raise HTTPException(status_code=503, detail="Services still initializing")
    
    try:
        sync_service.clear_cache()
        embedding_service.clear_cache()
        
        logger.info("All caches cleared")
        
        return {
            "success": True,
            "message": "All caches cleared successfully"
        }
        
    except Exception as e:
        logger.error(f"Cache clearing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Cache clearing failed: {str(e)}")

@app.get("/cache/stats")
async def get_cache_stats():
    """Get cache statistics"""
    if not services_initialized:
        raise HTTPException(status_code=503, detail="Services still initializing")
    
    try:
        sync_stats = sync_service.get_cache_stats()
        embedding_stats = embedding_service.get_cache_stats()
        
        return {
            "success": True,
            "sync_service": sync_stats,
            "embedding_service": embedding_stats,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Cache stats retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=f"Cache stats retrieval failed: {str(e)}")

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"success": False, "error": "Endpoint not found"}
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal server error"}
    )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(
        "main-full:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        reload=False
    )