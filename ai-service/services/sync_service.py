"""
Synchronization Service
Creates real-time text-audio synchronization mappings for highlighting
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime
import math
import re

logger = logging.getLogger(__name__)

class SyncService:
    def __init__(self):
        self.sync_cache = {}  # In-memory cache for sync data
        
    async def initialize(self):
        """Initialize synchronization service"""
        logger.info("Sync service initialized")

    async def create_sync_mapping(
        self,
        book_id: str,
        chapter_id: str,
        audio_duration: float,
        text_segments: List[Dict[str, Any]],
        timing_precision: str = "sentence"
    ) -> Dict[str, Any]:
        """
        Create synchronization mapping between text segments and audio timing
        
        Args:
            book_id: Book identifier
            chapter_id: Chapter identifier
            audio_duration: Total audio duration in seconds
            text_segments: List of text segments to synchronize
            timing_precision: Level of timing precision (word/sentence/paragraph)
            
        Returns:
            Synchronization mapping with timestamps
        """
        try:
            # Calculate timing distribution
            timestamps = await self._calculate_timestamps(
                text_segments, audio_duration, timing_precision
            )
            
            # Quality assessment
            sync_quality = self._assess_sync_quality(timestamps, audio_duration)
            
            # Create sync mapping
            sync_mapping = {
                'book_id': book_id,
                'chapter_id': chapter_id,
                'timestamps': timestamps,
                'total_duration': audio_duration,
                'sync_quality': sync_quality,
                'created_at': datetime.now().isoformat(),
                'precision_level': timing_precision
            }
            
            # Cache the mapping
            cache_key = f"{book_id}_{chapter_id}"
            self.sync_cache[cache_key] = sync_mapping
            
            logger.info(f"Created sync mapping for {book_id}/{chapter_id} with {len(timestamps)} timestamps")
            
            return sync_mapping
            
        except Exception as e:
            logger.error(f"Sync mapping creation failed: {e}")
            raise Exception(f"Failed to create sync mapping: {str(e)}")

    async def _calculate_timestamps(
        self,
        text_segments: List[Dict[str, Any]],
        audio_duration: float,
        timing_precision: str
    ) -> List[Dict[str, Any]]:
        """Calculate timestamps for text segments"""
        timestamps = []
        
        if not text_segments:
            return timestamps
        
        # Calculate total text weight (words/characters)
        total_words = sum(self._count_words(segment['text']) for segment in text_segments)
        
        if total_words == 0:
            return timestamps
        
        # Calculate base speaking rate
        words_per_second = total_words / audio_duration
        
        current_time = 0.0
        
        for segment in text_segments:
            # Calculate segment duration based on word count and complexity
            segment_words = self._count_words(segment['text'])
            base_duration = segment_words / words_per_second
            
            # Apply timing adjustments
            adjusted_duration = self._apply_timing_adjustments(
                segment['text'], base_duration, timing_precision
            )
            
            # Ensure we don't exceed total duration
            end_time = min(current_time + adjusted_duration, audio_duration)
            
            # Calculate confidence based on segment characteristics
            confidence = self._calculate_segment_confidence(segment, adjusted_duration)
            
            timestamp = {
                'segment_id': segment.get('id', f"seg_{len(timestamps)}"),
                'start_time': round(current_time, 3),
                'end_time': round(end_time, 3),
                'confidence': confidence,
                'text': segment['text'],
                'word_count': segment_words
            }
            
            timestamps.append(timestamp)
            current_time = end_time
            
            # Break if we've reached the end
            if current_time >= audio_duration:
                break
        
        # Normalize timestamps to fit exact duration
        timestamps = self._normalize_timestamps(timestamps, audio_duration)
        
        return timestamps

    def _count_words(self, text: str) -> int:
        """Count words in text segment"""
        return len(text.split())

    def _apply_timing_adjustments(
        self, 
        text: str, 
        base_duration: float, 
        precision: str
    ) -> float:
        """Apply timing adjustments based on text characteristics"""
        duration = base_duration
        
        # Punctuation affects pacing
        pause_punctuation = text.count('.') + text.count('!') + text.count('?')
        comma_pauses = text.count(',') + text.count(';') + text.count(':')
        
        # Add pause time
        duration += pause_punctuation * 0.5  # 500ms for sentence endings
        duration += comma_pauses * 0.3       # 300ms for commas
        
        # Dialogue tends to be faster
        if '"' in text or "'" in text:
            duration *= 0.9
        
        # Long sentences tend to be slower
        if len(text.split()) > 20:
            duration *= 1.1
        
        # Complex words (3+ syllables) slow down speech
        complex_words = len([word for word in text.split() if len(word) > 8])
        if complex_words > 0:
            duration *= (1 + complex_words * 0.05)
        
        return max(duration, 0.1)  # Minimum 100ms per segment

    def _calculate_segment_confidence(
        self, 
        segment: Dict[str, Any], 
        duration: float
    ) -> float:
        """Calculate confidence score for timestamp accuracy"""
        confidence = 0.8  # Base confidence
        
        text = segment['text']
        
        # Higher confidence for longer segments
        if len(text.split()) > 10:
            confidence += 0.1
        
        # Lower confidence for very short segments
        if len(text.split()) < 3:
            confidence -= 0.2
        
        # Higher confidence for segments with clear sentence structure
        if text.strip().endswith(('.', '!', '?')):
            confidence += 0.1
        
        # Lower confidence for segments with unusual punctuation
        if '...' in text or '--' in text:
            confidence -= 0.1
        
        # Reasonable duration increases confidence
        if 1.0 <= duration <= 10.0:
            confidence += 0.1
        elif duration > 15.0:
            confidence -= 0.2
        
        return max(0.1, min(1.0, confidence))

    def _normalize_timestamps(
        self, 
        timestamps: List[Dict[str, Any]], 
        total_duration: float
    ) -> List[Dict[str, Any]]:
        """Normalize timestamps to fit exact audio duration"""
        if not timestamps:
            return timestamps
        
        # Calculate current total duration
        current_total = timestamps[-1]['end_time']
        
        if current_total == 0:
            return timestamps
        
        # Scale factor to fit exact duration
        scale_factor = total_duration / current_total
        
        # Apply scaling
        for timestamp in timestamps:
            timestamp['start_time'] = round(timestamp['start_time'] * scale_factor, 3)
            timestamp['end_time'] = round(timestamp['end_time'] * scale_factor, 3)
        
        # Ensure no gaps between segments
        for i in range(1, len(timestamps)):
            timestamps[i]['start_time'] = timestamps[i-1]['end_time']
        
        return timestamps

    def _assess_sync_quality(
        self, 
        timestamps: List[Dict[str, Any]], 
        audio_duration: float
    ) -> str:
        """Assess the quality of synchronization mapping"""
        if not timestamps:
            return "poor"
        
        # Calculate average confidence
        avg_confidence = sum(t['confidence'] for t in timestamps) / len(timestamps)
        
        # Check for reasonable segment durations
        durations = [t['end_time'] - t['start_time'] for t in timestamps]
        avg_duration = sum(durations) / len(durations)
        
        # Quality assessment
        if avg_confidence > 0.85 and 0.5 <= avg_duration <= 8.0:
            return "excellent"
        elif avg_confidence > 0.7 and 0.3 <= avg_duration <= 12.0:
            return "good"
        elif avg_confidence > 0.5:
            return "fair"
        else:
            return "poor"

    async def get_sync_data(self, book_id: str, chapter_id: str) -> Dict[str, Any]:
        """Retrieve cached synchronization data"""
        cache_key = f"{book_id}_{chapter_id}"
        
        if cache_key in self.sync_cache:
            return self.sync_cache[cache_key]
        
        # If not in cache, return empty mapping
        return {
            'book_id': book_id,
            'chapter_id': chapter_id,
            'timestamps': [],
            'total_duration': 0.0,
            'sync_quality': 'not_available',
            'created_at': datetime.now().isoformat()
        }

    async def update_sync_timing(
        self,
        book_id: str,
        chapter_id: str,
        segment_id: str,
        start_time: float,
        end_time: float
    ) -> bool:
        """Update timing for a specific segment (for manual corrections)"""
        try:
            cache_key = f"{book_id}_{chapter_id}"
            
            if cache_key not in self.sync_cache:
                return False
            
            sync_data = self.sync_cache[cache_key]
            
            # Find and update the specific timestamp
            for timestamp in sync_data['timestamps']:
                if timestamp['segment_id'] == segment_id:
                    timestamp['start_time'] = start_time
                    timestamp['end_time'] = end_time
                    timestamp['confidence'] = min(timestamp['confidence'], 0.9)  # Reduce confidence for manual edits
                    break
            
            # Update cache
            self.sync_cache[cache_key] = sync_data
            
            logger.info(f"Updated timing for segment {segment_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update sync timing: {e}")
            return False

    def clear_cache(self, book_id: Optional[str] = None):
        """Clear sync cache for specific book or all"""
        if book_id:
            # Clear specific book
            keys_to_remove = [key for key in self.sync_cache.keys() if key.startswith(book_id)]
            for key in keys_to_remove:
                del self.sync_cache[key]
        else:
            # Clear all cache
            self.sync_cache.clear()
        
        logger.info(f"Cleared sync cache for book: {book_id or 'all'}")

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            'total_mappings': len(self.sync_cache),
            'books': len(set(key.split('_')[0] for key in self.sync_cache.keys())),
            'cache_size_mb': len(str(self.sync_cache)) / (1024 * 1024)
        }