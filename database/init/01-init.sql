-- Initialize BookEqualizer database with pgvector extension
-- This script runs automatically when PostgreSQL container starts

-- Create the database if it doesn't exist
SELECT 'CREATE DATABASE bookequalizer'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'bookequalizer')\gexec

-- Connect to bookequalizer database
\c bookequalizer;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- Verify extensions are installed
SELECT extname, extversion FROM pg_extension WHERE extname IN ('uuid-ossp', 'vector');

-- Create a test table to verify pgvector works
CREATE TABLE IF NOT EXISTS vector_test (
    id SERIAL PRIMARY KEY,
    embedding vector(3)
);

-- Insert test data
INSERT INTO vector_test (embedding) VALUES ('[1,2,3]'), ('[4,5,6]');

-- Test vector operations
SELECT id, embedding, embedding <-> '[1,2,3]' AS distance 
FROM vector_test 
ORDER BY distance 
LIMIT 1;

-- Clean up test table
DROP TABLE vector_test;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'BookEqualizer database initialized successfully with pgvector support';
END $$;