"""
Question & Answer Service
Literature-specialized Q&A system with context understanding
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
import openai
import os
from datetime import datetime
from services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)

class QAService:
    def __init__(self):
        self.embedding_service = None
        self.openai_client = None
        self.model_name = "gpt-3.5-turbo"
        
    async def initialize(self):
        """Initialize Q&A service with OpenAI and embedding service"""
        try:
            # Initialize OpenAI client
            api_key = os.getenv('OPENAI_API_KEY')
            if api_key:
                self.openai_client = openai.AsyncOpenAI(api_key=api_key)
                logger.info("OpenAI client initialized")
            else:
                logger.warning("OpenAI API key not found - Q&A will use fallback responses")
            
            # Initialize embedding service for context retrieval
            self.embedding_service = EmbeddingService()
            await self.embedding_service.initialize()
            
        except Exception as e:
            logger.error(f"Q&A service initialization failed: {e}")
            raise

    async def answer_question(
        self,
        question: str,
        book_id: str,
        context_limit: int = 5,
        include_citations: bool = True
    ) -> Dict[str, Any]:
        """
        Answer questions about book content using AI
        
        Args:
            question: User's question
            book_id: Book to search for context
            context_limit: Maximum context chunks to use
            include_citations: Whether to include source citations
            
        Returns:
            Answer with confidence, sources, and reasoning
        """
        try:
            # Retrieve relevant context using embeddings
            context_chunks = await self._get_relevant_context(
                question, book_id, context_limit
            )
            
            if not context_chunks:
                return self._fallback_response(question)
            
            # Generate answer using OpenAI
            if self.openai_client:
                response = await self._generate_ai_answer(question, context_chunks)
            else:
                response = self._generate_fallback_answer(question, context_chunks)
            
            # Add citations if requested
            if include_citations:
                response['sources'] = self._format_citations(context_chunks)
            
            # Calculate confidence based on context relevance
            response['confidence'] = self._calculate_confidence(context_chunks)
            
            # Generate related topics
            response['related_topics'] = self._extract_related_topics(context_chunks)
            
            return response
            
        except Exception as e:
            logger.error(f"Q&A processing failed: {e}")
            return {
                'answer': "I'm sorry, I encountered an error while processing your question.",
                'confidence': 0.0,
                'sources': [],
                'reasoning': f"Error: {str(e)}",
                'related_topics': []
            }

    async def _get_relevant_context(
        self, 
        question: str, 
        book_id: str, 
        limit: int
    ) -> List[Dict[str, Any]]:
        """Retrieve relevant context using semantic search"""
        try:
            context_chunks = await self.embedding_service.search_similar_content(
                query=question,
                book_id=book_id,
                limit=limit,
                similarity_threshold=0.6
            )
            
            logger.info(f"Retrieved {len(context_chunks)} context chunks for question")
            return context_chunks
            
        except Exception as e:
            logger.error(f"Context retrieval failed: {e}")
            return []

    async def _generate_ai_answer(
        self, 
        question: str, 
        context_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate answer using OpenAI GPT"""
        try:
            # Prepare context text
            context_text = "\n\n".join([
                f"Context {i+1}: {chunk['text']}"
                for i, chunk in enumerate(context_chunks)
            ])
            
            # Create literature-specialized prompt
            system_prompt = """You are a literary analysis expert specializing in book comprehension and analysis. 
            You help readers understand literature by providing insightful, accurate answers based on the provided text context.
            
            Guidelines:
            - Answer based only on the provided context
            - If the context doesn't contain enough information, acknowledge this limitation
            - Provide thoughtful literary analysis when appropriate
            - Use clear, accessible language
            - Include specific references to the text when possible
            """
            
            user_prompt = f"""Based on the following context from the book, please answer this question:

Question: {question}

Context:
{context_text}

Please provide a comprehensive answer with reasoning."""

            # Call OpenAI API
            response = await self.openai_client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=500,
                temperature=0.7
            )
            
            answer = response.choices[0].message.content
            
            return {
                'answer': answer,
                'reasoning': "Answer generated using AI analysis of book content",
                'method': 'openai_gpt'
            }
            
        except Exception as e:
            logger.error(f"OpenAI answer generation failed: {e}")
            return self._generate_fallback_answer(question, context_chunks)

    def _generate_fallback_answer(
        self, 
        question: str, 
        context_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate basic answer without AI when OpenAI is unavailable"""
        try:
            # Simple keyword-based analysis
            question_lower = question.lower()
            
            # Find most relevant chunk
            best_chunk = max(context_chunks, key=lambda x: x['similarity'])
            
            # Generate basic response
            if any(word in question_lower for word in ['who', 'character', 'person']):
                answer = f"Based on the text, here's what I found about characters: {best_chunk['text'][:200]}..."
            elif any(word in question_lower for word in ['what', 'describe', 'explain']):
                answer = f"Here's the relevant information: {best_chunk['text'][:300]}..."
            elif any(word in question_lower for word in ['why', 'reason', 'because']):
                answer = f"The text suggests: {best_chunk['text'][:250]}..."
            else:
                answer = f"Based on the book content: {best_chunk['text'][:300]}..."
            
            return {
                'answer': answer,
                'reasoning': "Answer based on text similarity matching",
                'method': 'fallback'
            }
            
        except Exception as e:
            logger.error(f"Fallback answer generation failed: {e}")
            return {
                'answer': "I found relevant content but couldn't process it properly.",
                'reasoning': f"Fallback error: {str(e)}",
                'method': 'error_fallback'
            }

    def _fallback_response(self, question: str) -> Dict[str, Any]:
        """Response when no context is found"""
        return {
            'answer': "I couldn't find relevant content in the book to answer your question. Try rephrasing your question or asking about specific topics covered in the text.",
            'confidence': 0.0,
            'sources': [],
            'reasoning': "No relevant context found in book content",
            'related_topics': []
        }

    def _format_citations(self, context_chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format source citations for context chunks"""
        citations = []
        
        for i, chunk in enumerate(context_chunks):
            citation = {
                'id': chunk['id'],
                'text_preview': chunk['text'][:100] + "..." if len(chunk['text']) > 100 else chunk['text'],
                'start_char': chunk['start_char'],
                'end_char': chunk['end_char'],
                'similarity_score': round(chunk['similarity'], 3),
                'source_number': i + 1
            }
            citations.append(citation)
        
        return citations

    def _calculate_confidence(self, context_chunks: List[Dict[str, Any]]) -> float:
        """Calculate confidence score based on context quality"""
        if not context_chunks:
            return 0.0
        
        # Average similarity score
        avg_similarity = sum(chunk['similarity'] for chunk in context_chunks) / len(context_chunks)
        
        # Bonus for multiple relevant chunks
        chunk_bonus = min(len(context_chunks) / 5, 0.2)
        
        # Penalize if best similarity is low
        best_similarity = max(chunk['similarity'] for chunk in context_chunks)
        if best_similarity < 0.7:
            penalty = 0.3
        else:
            penalty = 0.0
        
        confidence = min(avg_similarity + chunk_bonus - penalty, 1.0)
        return round(confidence, 3)

    def _extract_related_topics(self, context_chunks: List[Dict[str, Any]]) -> List[str]:
        """Extract related topics from context chunks"""
        # Simple keyword extraction for related topics
        all_text = " ".join(chunk['text'] for chunk in context_chunks)
        words = all_text.lower().split()
        
        # Common literary topics
        literary_terms = [
            'character', 'plot', 'theme', 'setting', 'conflict', 'symbolism',
            'metaphor', 'irony', 'dialogue', 'narrative', 'protagonist', 'antagonist'
        ]
        
        found_topics = []
        for term in literary_terms:
            if term in words and term not in found_topics:
                found_topics.append(term.title())
        
        return found_topics[:5]  # Limit to 5 topics

    async def close(self):
        """Close service connections"""
        if self.embedding_service:
            await self.embedding_service.close()