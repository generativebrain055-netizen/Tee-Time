-- ============================================================================
-- TeeTime Golf App - DROP ALL TABLES
-- ============================================================================
-- WARNING: This will delete ALL data! Run with caution.
-- Run this BEFORE running the complete_schema.sql
-- ============================================================================

-- Disable triggers temporarily
SET session_replication_role = 'replica';

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS user_favorite_courses CASCADE;
DROP TABLE IF EXISTS golf_courses CASCADE;
DROP TABLE IF EXISTS friendships CASCADE;
DROP TABLE IF EXISTS friend_requests CASCADE;
DROP TABLE IF EXISTS invite_responses CASCADE;
DROP TABLE IF EXISTS tee_time_participants CASCADE;
DROP TABLE IF EXISTS invites CASCADE;
DROP TABLE IF EXISTS tee_times CASCADE;
DROP TABLE IF EXISTS roster_group_members CASCADE;
DROP TABLE IF EXISTS roster_groups CASCADE;
DROP TABLE IF EXISTS roster CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS login_logs CASCADE;
DROP TABLE IF EXISTS rate_limits CASCADE;
DROP TABLE IF EXISTS magic_links CASCADE;
DROP TABLE IF EXISTS otp_requests CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_records() CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- ============================================================================
-- All tables dropped successfully
-- ============================================================================
