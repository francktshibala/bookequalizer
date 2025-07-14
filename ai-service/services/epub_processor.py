"""
EPUB Processing Service
Handles EPUB file parsing, content extraction, and sentence segmentation for TTS optimization
"""

import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup
import re
import uuid
import time
from typing import Dict, List, Any, Tuple
import nltk
from nltk.tokenize import sent_tokenize
import logging

logger = logging.getLogger(__name__)

class EPUBProcessor:
    def __init__(self):
        self.supported_formats = {'.epub'}
        
    async def initialize(self):
        """Initialize NLTK data"""
        try:
            nltk.download('punkt', quiet=True)
            logger.info("NLTK punkt tokenizer initialized")
        except Exception as e:
            logger.warning(f"NLTK initialization warning: {e}")

    async def process_epub(self, content: bytes, filename: str) -> Dict[str, Any]:
        """
        Process EPUB file and extract content for audio optimization
        
        Args:
            content: Raw EPUB file bytes
            filename: Original filename
            
        Returns:
            Dictionary with book metadata and processed content
        """
        start_time = time.time()
        
        try:
            # Save temporary file
            temp_path = f"/tmp/{uuid.uuid4()}.epub"
            with open(temp_path, 'wb') as f:
                f.write(content)
            
            # Read EPUB
            book = epub.read_epub(temp_path)
            
            # Extract metadata
            metadata = self._extract_metadata(book)
            
            # Extract and process chapters
            chapters = await self._extract_chapters(book)
            
            # Calculate total segments
            total_segments = sum(len(chapter['segments']) for chapter in chapters)
            
            processing_time = time.time() - start_time
            
            # Generate unique book ID
            book_id = str(uuid.uuid4())
            
            return {
                'book_id': book_id,
                'title': metadata.get('title', filename),
                'author': metadata.get('author'),
                'chapters': chapters,
                'total_segments': total_segments,
                'processing_time': processing_time,
                'status': 'processed'
            }
            
        except Exception as e:
            logger.error(f"EPUB processing failed: {e}")
            raise Exception(f"Failed to process EPUB: {str(e)}")
        
        finally:
            # Cleanup temp file
            try:
                import os
                os.unlink(temp_path)
            except:
                pass

    def _extract_metadata(self, book: epub.EpubBook) -> Dict[str, str]:
        """Extract book metadata"""
        metadata = {}
        
        try:
            metadata['title'] = book.get_metadata('DC', 'title')[0][0] if book.get_metadata('DC', 'title') else 'Unknown Title'
            metadata['author'] = book.get_metadata('DC', 'creator')[0][0] if book.get_metadata('DC', 'creator') else 'Unknown Author'
            metadata['language'] = book.get_metadata('DC', 'language')[0][0] if book.get_metadata('DC', 'language') else 'en'
            metadata['publisher'] = book.get_metadata('DC', 'publisher')[0][0] if book.get_metadata('DC', 'publisher') else None
        except Exception as e:
            logger.warning(f"Metadata extraction error: {e}")
            
        return metadata

    async def _extract_chapters(self, book: epub.EpubBook) -> List[Dict[str, Any]]:
        """Extract and process chapter content"""
        chapters = []
        chapter_index = 0
        
        # Get all HTML items (chapters)
        html_items = [item for item in book.get_items() if item.get_type() == ebooklib.ITEM_DOCUMENT]
        
        for item in html_items:
            try:
                # Extract text content
                soup = BeautifulSoup(item.get_content(), 'html.parser')
                
                # Remove script and style elements
                for script in soup(["script", "style"]):
                    script.decompose()
                
                # Get text content
                text = soup.get_text()
                
                # Clean and normalize text
                cleaned_text = self._clean_text(text)
                
                if len(cleaned_text.strip()) < 50:  # Skip very short chapters
                    continue
                
                # Segment into sentences
                segments = await self._segment_text(cleaned_text, chapter_index)
                
                chapter = {
                    'id': str(uuid.uuid4()),
                    'title': self._extract_chapter_title(soup, item.get_name()),
                    'index': chapter_index,
                    'content': cleaned_text,
                    'segments': segments,
                    'word_count': len(cleaned_text.split()),
                    'character_count': len(cleaned_text)
                }
                
                chapters.append(chapter)
                chapter_index += 1
                
            except Exception as e:
                logger.warning(f"Chapter processing error: {e}")
                continue
        
        return chapters

    def _clean_text(self, text: str) -> str:
        """Clean and normalize text content"""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove page numbers and headers/footers
        text = re.sub(r'\b\d+\b\s*$', '', text, flags=re.MULTILINE)
        
        # Fix common encoding issues
        text = text.replace('"', '"').replace('"', '"')
        text = text.replace(''', "'").replace(''', "'")
        text = text.replace('—', '--').replace('–', '-')
        
        # Remove extra punctuation
        text = re.sub(r'[.]{3,}', '...', text)
        
        return text.strip()

    def _extract_chapter_title(self, soup: BeautifulSoup, fallback: str) -> str:
        """Extract chapter title from HTML"""
        # Try to find title in common heading tags
        for tag in ['h1', 'h2', 'h3', 'title']:
            title_elem = soup.find(tag)
            if title_elem and title_elem.get_text().strip():
                return title_elem.get_text().strip()
        
        # Use filename as fallback
        return fallback.replace('.xhtml', '').replace('.html', '').replace('_', ' ').title()

    async def _segment_text(self, text: str, chapter_index: int) -> List[Dict[str, Any]]:
        """Segment text into sentences for TTS optimization"""
        segments = []
        
        try:
            # Tokenize into sentences
            sentences = sent_tokenize(text)
            
            char_offset = 0
            for i, sentence in enumerate(sentences):
                # Find actual position in original text
                start_pos = text.find(sentence, char_offset)
                if start_pos == -1:
                    start_pos = char_offset
                
                end_pos = start_pos + len(sentence)
                
                segment = {
                    'id': f"ch{chapter_index}_s{i}",
                    'text': sentence.strip(),
                    'start_char': start_pos,
                    'end_char': end_pos,
                    'sentence_index': i,
                    'word_count': len(sentence.split()),
                    'estimated_duration': self._estimate_reading_time(sentence)
                }
                
                segments.append(segment)
                char_offset = end_pos
                
        except Exception as e:
            logger.error(f"Text segmentation error: {e}")
            # Fallback: create one segment with entire text
            segments = [{
                'id': f"ch{chapter_index}_s0",
                'text': text,
                'start_char': 0,
                'end_char': len(text),
                'sentence_index': 0,
                'word_count': len(text.split()),
                'estimated_duration': self._estimate_reading_time(text)
            }]
        
        return segments

    def _estimate_reading_time(self, text: str) -> float:
        """Estimate reading time in seconds (for TTS duration estimation)"""
        # Average speaking rate: ~150 words per minute
        words = len(text.split())
        return (words / 150) * 60