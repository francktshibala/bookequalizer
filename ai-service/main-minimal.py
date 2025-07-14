"""
BookEqualizer AI Service - Minimal FastAPI backend for Railway deployment
Health check endpoint only - features added incrementally
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="BookEqualizer AI Service",
    description="Intelligent audio processing for synchronized reading",
    version="2.0.0-minimal"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Will be restricted in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "BookEqualizer AI Service - Minimal Version",
        "status": "running",
        "version": "2.0.0-minimal"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "BookEqualizer AI Service",
        "version": "2.0.0-minimal",
        "features": "minimal"
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(
        "main-minimal:app",
        host="0.0.0.0",
        port=port,
        log_level="info"
    )