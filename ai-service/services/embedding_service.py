"""
Embedding Service
Generates and manages vector embeddings for semantic search and Q&A
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
import numpy as np
from sentence_transformers import SentenceTransformer
import asyncpg
import os
from pgvector.asyncpg import register_vector

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self):
        self.model = None
        self.db_pool = None
        self.model_name = "all-MiniLM-L6-v2"  # Fast, good quality embeddings
        self.embedding_dim = 384
        
    async def initialize(self):
        """Initialize embedding model and database connection"""
        try:
            # Load sentence transformer model
            self.model = SentenceTransformer(self.model_name)
            logger.info(f"Loaded embedding model: {self.model_name}")
            
            # Initialize database connection
            await self._init_db_connection()
            
        except Exception as e:
            logger.error(f"Embedding service initialization failed: {e}")
            raise

    async def _init_db_connection(self):
        """Initialize PostgreSQL connection with pgvector"""
        try:
            database_url = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost:5432/bookequalizer')
            
            self.db_pool = await asyncpg.create_pool(
                database_url,
                min_size=1,
                max_size=5,
                command_timeout=60
            )
            
            # Register pgvector types
            async with self.db_pool.acquire() as conn:
                await register_vector(conn)
                
            logger.info("Database connection initialized with pgvector")
            
        except Exception as e:
            logger.warning(f"Database connection failed (will continue without DB): {e}")
            self.db_pool = None

    async def generate_embeddings(self, book_id: str, content: str) -> Dict[str, Any]:
        """
        Generate embeddings for book content
        
        Args:
            book_id: Unique book identifier
            content: Text content to embed
            
        Returns:
            Dictionary with embedding results and metadata
        """
        try:
            import time
            start_time = time.time()
            
            # Split content into chunks
            chunks = self._chunk_text(content)
            
            # Generate embeddings
            embeddings = []
            total_tokens = 0
            
            for i, chunk in enumerate(chunks):
                embedding_vector = self.model.encode(chunk['text'])
                
                embedding_record = {
                    'id': f"{book_id}_chunk_{i}",
                    'book_id': book_id,
                    'text': chunk['text'],
                    'embedding': embedding_vector.tolist(),
                    'start_char': chunk['start_char'],
                    'end_char': chunk['end_char'],
                    'chunk_index': i
                }
                
                embeddings.append(embedding_record)
                total_tokens += len(chunk['text'].split())
            
            # Store in database if available
            if self.db_pool:
                await self._store_embeddings(embeddings)
            
            processing_time = time.time() - start_time
            
            logger.info(f"Generated {len(embeddings)} embeddings for book {book_id} ({total_tokens} tokens)")
            
            return {
                'chunks': embeddings,
                'total_tokens': total_tokens,
                'processing_time': processing_time
            }
            
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            raise Exception(f"Failed to generate embeddings: {str(e)}")

    def _chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> List[Dict[str, Any]]:
        """Split text into overlapping chunks for embedding"""
        chunks = []
        words = text.split()
        
        start = 0
        chunk_index = 0
        
        while start < len(words):
            end = min(start + chunk_size, len(words))
            chunk_words = words[start:end]
            chunk_text = ' '.join(chunk_words)
            
            # Calculate character positions
            start_char = len(' '.join(words[:start]))
            if start > 0:
                start_char += 1  # Account for space
            end_char = start_char + len(chunk_text)
            
            chunks.append({
                'text': chunk_text,
                'start_char': start_char,
                'end_char': end_char,
                'chunk_index': chunk_index
            })
            
            start = end - overlap
            chunk_index += 1
            
            if end >= len(words):
                break
        
        return chunks

    async def _store_embeddings(self, embeddings: List[Dict[str, Any]]):
        """Store embeddings in PostgreSQL with pgvector"""
        try:
            async with self.db_pool.acquire() as conn:
                # Create embeddings table if not exists
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS book_embeddings (
                        id TEXT PRIMARY KEY,
                        book_id TEXT NOT NULL,
                        text TEXT NOT NULL,
                        embedding vector(384),
                        start_char INTEGER,
                        end_char INTEGER,
                        chunk_index INTEGER,
                        created_at TIMESTAMP DEFAULT NOW()
                    )
                """)
                
                # Create index on embedding column for similarity search
                await conn.execute("""
                    CREATE INDEX IF NOT EXISTS book_embeddings_embedding_idx 
                    ON book_embeddings USING ivfflat (embedding vector_cosine_ops)
                """)
                
                # Insert embeddings
                for embedding in embeddings:
                    await conn.execute("""
                        INSERT INTO book_embeddings 
                        (id, book_id, text, embedding, start_char, end_char, chunk_index)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (id) DO UPDATE SET
                        text = EXCLUDED.text,
                        embedding = EXCLUDED.embedding,
                        start_char = EXCLUDED.start_char,
                        end_char = EXCLUDED.end_char,
                        chunk_index = EXCLUDED.chunk_index
                    """, 
                    embedding['id'],
                    embedding['book_id'],
                    embedding['text'],
                    embedding['embedding'],
                    embedding['start_char'],
                    embedding['end_char'],
                    embedding['chunk_index']
                    )
                    
        except Exception as e:
            logger.error(f"Failed to store embeddings: {e}")

    async def search_similar_content(
        self, 
        query: str, 
        book_id: str, 
        limit: int = 5,
        similarity_threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """
        Search for similar content using vector similarity
        
        Args:
            query: Search query
            book_id: Book to search within
            limit: Maximum number of results
            similarity_threshold: Minimum similarity score
            
        Returns:
            List of similar content chunks with scores
        """
        try:
            if not self.db_pool:
                return []
            
            # Generate query embedding
            query_embedding = self.model.encode(query)
            
            async with self.db_pool.acquire() as conn:
                results = await conn.fetch("""
                    SELECT 
                        id,
                        text,
                        start_char,
                        end_char,
                        chunk_index,
                        1 - (embedding <=> $1) as similarity
                    FROM book_embeddings 
                    WHERE book_id = $2 
                    AND 1 - (embedding <=> $1) > $3
                    ORDER BY embedding <=> $1
                    LIMIT $4
                """, query_embedding.tolist(), book_id, similarity_threshold, limit)
                
                return [
                    {
                        'id': row['id'],
                        'text': row['text'],
                        'start_char': row['start_char'],
                        'end_char': row['end_char'],
                        'chunk_index': row['chunk_index'],
                        'similarity': float(row['similarity'])
                    }
                    for row in results
                ]
                
        except Exception as e:
            logger.error(f"Similarity search failed: {e}")
            return []

    async def get_book_embeddings(self, book_id: str) -> List[Dict[str, Any]]:
        """Retrieve all embeddings for a book"""
        try:
            if not self.db_pool:
                return []
            
            async with self.db_pool.acquire() as conn:
                results = await conn.fetch("""
                    SELECT id, text, start_char, end_char, chunk_index
                    FROM book_embeddings 
                    WHERE book_id = $1
                    ORDER BY chunk_index
                """, book_id)
                
                return [dict(row) for row in results]
                
        except Exception as e:
            logger.error(f"Failed to retrieve embeddings: {e}")
            return []

    async def cleanup_book_embeddings(self, book_id: str):
        """Remove all embeddings for a book"""
        try:
            if not self.db_pool:
                return
            
            async with self.db_pool.acquire() as conn:
                await conn.execute("""
                    DELETE FROM book_embeddings WHERE book_id = $1
                """, book_id)
                
            logger.info(f"Cleaned up embeddings for book {book_id}")
            
        except Exception as e:
            logger.error(f"Failed to cleanup embeddings: {e}")

    def clear_cache(self):
        """Clear embedding cache (placeholder for future caching)"""
        logger.info("Embedding cache cleared (no cache implemented yet)")

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            'cache_type': 'embedding_service',
            'cache_enabled': False,
            'cache_size': 0,
            'hit_rate': 0.0,
            'total_requests': 0,
            'cache_hits': 0,
            'cache_misses': 0
        }

    async def close(self):
        """Close database connections"""
        if self.db_pool:
            await self.db_pool.close()