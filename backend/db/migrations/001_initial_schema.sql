-- Migration: Initialize Database Schema
-- Version: 001
-- Description: Creates all tables, indexes, triggers, and views for authentication system

BEGIN;

-- Run the main schema creation
\i schema.sql;

COMMIT;

-- Verify installation
SELECT 'Schema migration completed successfully' as status;
SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';
