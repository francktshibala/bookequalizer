#!/usr/bin/env python3
"""
BookEqualizer AI Service - Stage 1 Deployment (EPUB Processing only)
Minimal deployment to test Railway connectivity and basic functionality
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
import logging
from typing import Dict, Any
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="BookEqualizer AI Service - Stage 1",
    description="EPUB Processing and basic text analysis",
    version="2.0.0-stage1",
    docs_url="/docs"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "BookEqualizer AI Service - Stage 1",
        "status": "running",
        "version": "2.0.0-stage1",
        "features": ["EPUB Processing", "Text Analysis"],
        "stage": "1/3"
    }

# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "BookEqualizer AI Service",
        "version": "2.0.0-stage1",
        "stage": "1/3",
        "timestamp": datetime.now().isoformat()
    }

# Basic EPUB processing (without heavy dependencies)
@app.post("/process-epub")
async def process_epub(file: UploadFile = File(...)):
    """Basic EPUB processing without ML dependencies"""
    
    if not file.filename.endswith('.epub'):
        raise HTTPException(status_code=400, detail="Only EPUB files are supported")
    
    try:
        # Read file content
        content = await file.read()
        
        # Basic validation
        if len(content) < 1000:
            raise HTTPException(status_code=400, detail="EPUB file appears to be too small")
        
        # Mock processing result (Stage 1 - no actual EPUB parsing yet)
        result = {
            "book_id": f"book_{hash(file.filename)}",
            "title": file.filename.replace('.epub', ''),
            "author": "Unknown Author",
            "chapters": [
                {
                    "id": "chapter_1",
                    "title": "Chapter 1",
                    "index": 0,
                    "content": "Sample content will be extracted in Stage 2",
                    "segments": [],
                    "word_count": 0,
                    "character_count": 0
                }
            ],
            "total_segments": 0,
            "processing_time": 0.1,
            "status": "stage1_processed"
        }
        
        logger.info(f"EPUB processed (Stage 1): {result['title']}")
        
        return {
            "success": True,
            "book_id": result['book_id'],
            "title": result['title'],
            "author": result['author'],
            "chapters": result['chapters'],
            "total_segments": result['total_segments'],
            "processing_time": result['processing_time'],
            "note": "Stage 1: Basic validation only. Full processing available in Stage 2."
        }
        
    except Exception as e:
        logger.error(f"EPUB processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

# Basic text processing
@app.post("/process-text")
async def process_text(request: Dict[str, Any]):
    """Basic text processing without ML optimization"""
    
    text = request.get('text', '')
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    
    try:
        # Basic text statistics
        words = text.split()
        sentences = text.split('.')
        
        result = {
            "processed_text": text,
            "segments": [
                {
                    "id": f"seg_{i}",
                    "text": sentence.strip(),
                    "start_char": 0,
                    "end_char": len(sentence.strip()),
                    "sentence_index": i
                }
                for i, sentence in enumerate(sentences[:5])  # Limit to 5 for demo
                if sentence.strip()
            ],
            "optimization_notes": ["Stage 1: Basic processing only"],
            "estimated_duration": len(words) / 150 * 60,  # 150 words per minute
            "character_count": len(text)
        }
        
        return {
            "success": True,
            **result,
            "note": "Stage 1: Basic processing. ML optimization available in Stage 2."
        }
        
    except Exception as e:
        logger.error(f"Text processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

# Placeholder endpoints for Stage 2/3
@app.post("/qa")
async def qa_placeholder():
    return {
        "success": False,
        "error": "Q&A system available in Stage 2",
        "available_in": "Stage 2 deployment"
    }

@app.post("/sync")
async def sync_placeholder():
    return {
        "success": False,
        "error": "Sync system available in Stage 2",
        "available_in": "Stage 2 deployment"
    }

@app.post("/embeddings")
async def embeddings_placeholder():
    return {
        "success": False,
        "error": "Embeddings available in Stage 3",
        "available_in": "Stage 3 deployment"
    }

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
        "main:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        reload=False
    )