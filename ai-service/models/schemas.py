"""
Pydantic models for AI service API schemas
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class TTSProvider(str, Enum):
    GOOGLE = "google"
    AZURE = "azure"
    AMAZON = "amazon"

class VoiceSettings(BaseModel):
    voice_id: str
    speed: float = Field(default=1.0, ge=0.5, le=2.0)
    pitch: float = Field(default=1.0, ge=0.5, le=2.0)
    volume: float = Field(default=1.0, ge=0.1, le=1.0)

class TextSegment(BaseModel):
    id: str
    text: str
    start_char: int
    end_char: int
    sentence_index: int

class BookUploadResponse(BaseModel):
    book_id: str
    title: str
    author: Optional[str] = None
    chapters: List[Dict[str, Any]]
    total_segments: int
    processing_time: float
    status: str = "processed"

class TextProcessingRequest(BaseModel):
    text: str
    tts_provider: TTSProvider
    voice_settings: Optional[VoiceSettings] = None
    optimize_for: str = Field(default="quality", regex="^(quality|speed|balanced)$")

class TextProcessingResponse(BaseModel):
    processed_text: str
    segments: List[TextSegment]
    optimization_notes: List[str]
    estimated_duration: float
    character_count: int

class QARequest(BaseModel):
    question: str
    book_id: str
    context_limit: int = Field(default=5, ge=1, le=20)
    include_citations: bool = True

class QAResponse(BaseModel):
    answer: str
    confidence: float = Field(ge=0.0, le=1.0)
    sources: List[Dict[str, Any]]
    reasoning: Optional[str] = None
    related_topics: List[str] = []

class SyncRequest(BaseModel):
    book_id: str
    chapter_id: str
    audio_duration: float
    text_segments: List[TextSegment]
    timing_precision: str = Field(default="sentence", regex="^(word|sentence|paragraph)$")

class SyncTimestamp(BaseModel):
    segment_id: str
    start_time: float
    end_time: float
    confidence: float

class SyncResponse(BaseModel):
    book_id: str
    chapter_id: str
    timestamps: List[SyncTimestamp]
    total_duration: float
    sync_quality: str
    created_at: str