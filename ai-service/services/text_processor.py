"""
Text Processing Service
Optimizes text content for TTS synthesis across different providers
"""

import re
import logging
from typing import Dict, List, Any, Optional
import asyncio
from models.schemas import TTSProvider, VoiceSettings, TextSegment

logger = logging.getLogger(__name__)

class TextProcessor:
    def __init__(self):
        self.provider_optimizations = {
            TTSProvider.GOOGLE: self._optimize_for_google,
            TTSProvider.AZURE: self._optimize_for_azure,
            TTSProvider.AMAZON: self._optimize_for_amazon
        }
        
    async def initialize(self):
        """Initialize text processing models"""
        logger.info("Text processor initialized")

    async def process_text(
        self,
        text: str,
        tts_provider: TTSProvider,
        voice_settings: Optional[VoiceSettings] = None,
        optimize_for: str = "quality"
    ) -> Dict[str, Any]:
        """
        Process text for optimal TTS synthesis
        
        Args:
            text: Input text to process
            tts_provider: Target TTS provider
            voice_settings: Voice configuration
            optimize_for: Optimization target (quality/speed/balanced)
            
        Returns:
            Processed text with segments and metadata
        """
        try:
            # Apply base text cleaning
            cleaned_text = self._clean_base_text(text)
            
            # Apply provider-specific optimizations
            if tts_provider in self.provider_optimizations:
                optimized_text, notes = await self.provider_optimizations[tts_provider](
                    cleaned_text, voice_settings, optimize_for
                )
            else:
                optimized_text, notes = cleaned_text, ["No provider-specific optimization applied"]
            
            # Create text segments
            segments = self._create_segments(optimized_text)
            
            # Estimate duration
            estimated_duration = self._estimate_duration(optimized_text, voice_settings)
            
            return {
                'processed_text': optimized_text,
                'segments': segments,
                'optimization_notes': notes,
                'estimated_duration': estimated_duration,
                'character_count': len(optimized_text)
            }
            
        except Exception as e:
            logger.error(f"Text processing failed: {e}")
            raise Exception(f"Text processing error: {str(e)}")

    def _clean_base_text(self, text: str) -> str:
        """Apply universal text cleaning"""
        # Fix common punctuation issues
        text = re.sub(r'([.!?])\s*([.!?])+', r'\1', text)  # Remove repeated punctuation
        
        # Normalize quotes
        text = text.replace('"', '"').replace('"', '"')
        text = text.replace(''', "'").replace(''', "'")
        
        # Fix spacing around punctuation
        text = re.sub(r'\s+([,.!?;:])', r'\1', text)
        text = re.sub(r'([.!?])\s*([A-Z])', r'\1 \2', text)
        
        # Handle abbreviations (Mr., Dr., etc.)
        text = re.sub(r'\b(Mr|Mrs|Dr|Prof|Sr|Jr)\.\s+', r'\1. ', text)
        
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text

    async def _optimize_for_google(
        self,
        text: str,
        voice_settings: Optional[VoiceSettings],
        optimize_for: str
    ) -> tuple[str, List[str]]:
        """Google Cloud TTS optimization"""
        notes = ["Google TTS optimization applied"]
        
        # Google handles SSML well
        if optimize_for == "quality":
            # Add pauses for better pacing
            text = re.sub(r'([.!?])\s+', r'\1<break time="0.5s"/> ', text)
            text = re.sub(r'([,;:])\s+', r'\1<break time="0.3s"/> ', text)
            notes.append("Added SSML breaks for natural pacing")
        
        # Handle emphasis
        text = re.sub(r'\*([^*]+)\*', r'<emphasis level="moderate">\1</emphasis>', text)
        
        # Wrap in SSML if modifications were made
        if '<break' in text or '<emphasis' in text:
            text = f'<speak>{text}</speak>'
            notes.append("Wrapped in SSML tags")
        
        return text, notes

    async def _optimize_for_azure(
        self,
        text: str,
        voice_settings: Optional[VoiceSettings],
        optimize_for: str
    ) -> tuple[str, List[str]]:
        """Azure Cognitive Services TTS optimization"""
        notes = ["Azure TTS optimization applied"]
        
        # Azure has good prosody control
        if optimize_for == "quality":
            # Add prosody for better expression
            text = re.sub(r'([!])', r'<prosody rate="slow" pitch="+5%">\1</prosody>', text)
            text = re.sub(r'([?])', r'<prosody pitch="+10%">\1</prosody>', text)
            notes.append("Added prosody for emotional expression")
        
        # Handle phonetic pronunciations
        text = self._fix_pronunciations(text)
        notes.append("Applied pronunciation fixes")
        
        return text, notes

    async def _optimize_for_amazon(
        self,
        text: str,
        voice_settings: Optional[VoiceSettings],
        optimize_for: str
    ) -> tuple[str, List[str]]:
        """Amazon Polly TTS optimization"""
        notes = ["Amazon Polly optimization applied"]
        
        # Polly excels at conversational speech
        if optimize_for == "speed":
            # Optimize for faster synthesis
            text = re.sub(r'\s+', ' ', text)  # Minimize whitespace
            notes.append("Optimized for faster synthesis")
        
        # Handle breathing and pauses
        text = re.sub(r'([.]{3})', r'<amazon:breath duration="medium"/>', text)
        text = re.sub(r'--', ' <break time="0.5s"/> ', text)
        
        return text, notes

    def _fix_pronunciations(self, text: str) -> str:
        """Fix common pronunciation issues"""
        # Common abbreviations
        pronunciations = {
            r'\bDr\.': 'Doctor',
            r'\bMr\.': 'Mister',
            r'\bMrs\.': 'Missus',
            r'\bMs\.': 'Miss',
            r'\bProf\.': 'Professor',
            r'\bvs\.': 'versus',
            r'\betc\.': 'etcetera',
            r'\bi\.e\.': 'that is',
            r'\be\.g\.': 'for example'
        }
        
        for pattern, replacement in pronunciations.items():
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        
        return text

    def _create_segments(self, text: str) -> List[Dict[str, Any]]:
        """Create text segments for processing"""
        # Split on sentence boundaries
        sentences = re.split(r'([.!?]+\s+)', text)
        segments = []
        
        char_offset = 0
        sentence_index = 0
        
        for i in range(0, len(sentences), 2):
            if i < len(sentences):
                sentence_text = sentences[i]
                punctuation = sentences[i + 1] if i + 1 < len(sentences) else ""
                full_sentence = sentence_text + punctuation
                
                if full_sentence.strip():
                    segment = {
                        'id': f"seg_{sentence_index}",
                        'text': full_sentence.strip(),
                        'start_char': char_offset,
                        'end_char': char_offset + len(full_sentence),
                        'sentence_index': sentence_index
                    }
                    segments.append(segment)
                    sentence_index += 1
                
                char_offset += len(full_sentence)
        
        return segments

    def _estimate_duration(self, text: str, voice_settings: Optional[VoiceSettings]) -> float:
        """Estimate TTS duration in seconds"""
        # Base speaking rate: ~175 words per minute
        words = len(text.split())
        base_duration = (words / 175) * 60
        
        # Adjust for voice settings
        if voice_settings:
            base_duration /= voice_settings.speed
        
        # Add overhead for SSML processing
        if '<' in text and '>' in text:
            base_duration *= 1.1  # 10% overhead for SSML
        
        return base_duration