-- ============================================================================
-- TeeTime Golf App - DROP ALL TABLES
-- ============================================================================
-- WARNING: This will delete ALL data! Run with caution.
-- Run this BEFORE running complete_schema.sql
-- ============================================================================

-- Disable triggers temporarily
SET session_replication_role = 'replica';

-- Drop all tables in reverse dependency order

-- Messaging tables
DROP TABLE IF EXISTS message_read_receipts CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- User devices (legacy)
DROP TABLE IF EXISTS user_devices CASCADE;

-- Rate limits & analytics
DROP TABLE IF EXISTS rate_limits CASCADE;
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS login_logs CASCADE;

-- Waiver wire & history
DROP TABLE IF EXISTS waiver_wire CASCADE;
DROP TABLE IF EXISTS roster_member_history CASCADE;

-- Courses
DROP TABLE IF EXISTS user_favorite_courses CASCADE;
DROP TABLE IF EXISTS golf_courses CASCADE;

-- Friends
DROP TABLE IF EXISTS friendships CASCADE;
DROP TABLE IF EXISTS friend_requests CASCADE;

-- Invites
DROP TABLE IF EXISTS invite_responses CASCADE;
DROP TABLE IF EXISTS invites CASCADE;

-- Tee times
DROP TABLE IF EXISTS tee_time_participants CASCADE;
DROP TABLE IF EXISTS tee_times CASCADE;

-- Roster
DROP TABLE IF EXISTS roster_group_members CASCADE;
DROP TABLE IF EXISTS roster CASCADE;
DROP TABLE IF EXISTS roster_groups CASCADE;

-- Auth
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
