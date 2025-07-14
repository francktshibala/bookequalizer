-- BookEqualizer Production Migration Script
-- Run this after database initialization to create all tables

\c bookequalizer;

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS audio_preferences CASCADE;
DROP TABLE IF EXISTS reading_sessions CASCADE;
DROP TABLE IF EXISTS audio_files CASCADE;
DROP TABLE IF EXISTS chapters CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Now run the main schema
\i /app/database/schema.sql

-- Verify all tables were created
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Verify indexes were created
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Verify triggers were created
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Test vector extension with sample data
DO $$
DECLARE
    test_user_id UUID;
    test_book_id UUID;
    test_chapter_id UUID;
BEGIN
    -- Insert test user
    INSERT INTO users (clerk_user_id, email, first_name, last_name)
    VALUES ('test_user_123', 'test@example.com', 'Test', 'User')
    RETURNING id INTO test_user_id;
    
    -- Insert test book
    INSERT INTO books (title, author, epub_file_path, epub_file_size, word_count)
    VALUES ('Test Book', 'Test Author', '/test/book.epub', 1000000, 50000)
    RETURNING id INTO test_book_id;
    
    -- Insert test chapter with vector embedding
    INSERT INTO chapters (book_id, chapter_number, title, content, word_count, character_count, content_embedding)
    VALUES (test_book_id, 1, 'Chapter 1', 'This is test content for chapter 1.', 8, 35, '[0.1, 0.2, 0.3]'::vector)
    RETURNING id INTO test_chapter_id;
    
    -- Test vector similarity search
    PERFORM id, content, content_embedding <-> '[0.1, 0.2, 0.3]'::vector AS similarity
    FROM chapters 
    WHERE book_id = test_book_id
    ORDER BY similarity
    LIMIT 1;
    
    -- Clean up test data
    DELETE FROM chapters WHERE id = test_chapter_id;
    DELETE FROM books WHERE id = test_book_id;
    DELETE FROM users WHERE id = test_user_id;
    
    RAISE NOTICE 'Database migration completed successfully with vector search test passed';
END $$;