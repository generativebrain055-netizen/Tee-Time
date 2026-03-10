-- ============================================================================
-- TeeTime Golf App - Unified Database Schema
-- ============================================================================
-- Version: 5.9 (Full project database)
-- Last Updated: February 2026
--
-- Merged SQL files:
--   - unified_schema.sql (this file)
--   - migrations/002_add_zip_code_to_user_profiles.sql (zip_code in user_profiles)
--   - migrations/003_add_user_availability_policies.sql (RLS policies for user_availability)
--   - migrations/004_messaging.sql (conversations, messages, etc.)
--   - migrations/005_messages_image_url.sql (image_url on messages)
--   - migrations/006_user_reports.sql (user_reports table)
--   - migrations/007_roster_groups_icon_text.sql (roster_groups.icon as TEXT)
--   - migrations/008_messages_sender_id_nullable.sql (system messages)
--   - migrations/009_course_usage_function.sql (get_course_usage for admin)
--
-- This is a COMPLETE schema that:
-- 1. Drops ALL existing tables
-- 2. Creates all tables fresh
-- 3. Includes all migrations and project tables (user_reports, ad_slots, etc.)
--
-- Run this in Supabase SQL Editor for a clean setup
--
-- CHANGES IN v5.9:
-- - Added user_reports table (admin mediation of reported issues)
-- - Added ad_slots table (4 placements: display_name, slot_type, alt_text, image_url, link_url)
-- - messages.sender_id nullable (system/welcome messages)
-- - get_course_usage(INT) function for admin dashboard
-- - RLS and triggers for user_reports, ad_slots
--
-- CHANGES IN v5.8:
-- - Merged all schema/migrations/*.sql into this file
-- - Added user_availability RLS policies (from 003; friends -> friendships)
--
-- CHANGES IN v5.7:
-- - Added conversations, conversation_participants, messages, and message_read_receipts tables
-- - Added triggers and RLS policies for messaging tables
--
-- CHANGES IN v5.6:
-- - Added clubs JSONB column to user_profiles for multiple club memberships
-- - Added GIN index on clubs for efficient array searches
-- - home_course field maintained for backward compatibility
-- 
-- CHANGES IN v5.5:
-- - Added onboarding tracking fields to users table (onboarding_completed, 
--   availability_completed, profile_completed with timestamps)
-- - Added onboarding_steps table for granular step tracking
-- - Added helper functions for onboarding completion checks
-- - Added trigger to auto-update onboarding_completed flag
-- - Backend is source of truth for onboarding state (not local storage)
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL EXISTING TABLES
-- ============================================================================

-- Disable triggers temporarily
SET session_replication_role = 'replica';

-- Drop views first
DROP VIEW IF EXISTS user_social_rate_summary CASCADE;
DROP VIEW IF EXISTS tee_time_attendance_summary CASCADE;

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS game_scores CASCADE;
DROP TABLE IF EXISTS qr_scan_history CASCADE;
DROP TABLE IF EXISTS draft_qr_codes CASCADE;
DROP TABLE IF EXISTS user_club_memberships CASCADE;
DROP TABLE IF EXISTS clubs CASCADE;
DROP TABLE IF EXISTS handicap_logs CASCADE;
DROP TABLE IF EXISTS roster_notifications CASCADE;
DROP TABLE IF EXISTS social_rate_logs CASCADE;
DROP TABLE IF EXISTS tee_time_attendance CASCADE;
DROP TABLE IF EXISTS user_availability CASCADE;
DROP TABLE IF EXISTS onboarding_steps CASCADE;
DROP TABLE IF EXISTS message_read_receipts CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS user_devices CASCADE;
DROP TABLE IF EXISTS rate_limits CASCADE;
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS broadcast_history CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS login_logs CASCADE;
DROP TABLE IF EXISTS waiver_wire CASCADE;
DROP TABLE IF EXISTS roster_member_history CASCADE;
DROP TABLE IF EXISTS user_favorite_courses CASCADE;
DROP TABLE IF EXISTS golf_courses CASCADE;
DROP TABLE IF EXISTS friendships CASCADE;
DROP TABLE IF EXISTS friend_requests CASCADE;
DROP TABLE IF EXISTS blocked_users CASCADE;
DROP TABLE IF EXISTS invite_responses CASCADE;
DROP TABLE IF EXISTS invites CASCADE;
DROP TABLE IF EXISTS tee_time_participants CASCADE;
DROP TABLE IF EXISTS tee_times CASCADE;
DROP TABLE IF EXISTS roster_group_members CASCADE;
DROP TABLE IF EXISTS roster CASCADE;
DROP TABLE IF EXISTS roster_groups CASCADE;
DROP TABLE IF EXISTS magic_links CASCADE;
DROP TABLE IF EXISTS otp_requests CASCADE;
DROP TABLE IF EXISTS auth_providers CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS user_reports CASCADE;
DROP TABLE IF EXISTS ad_slots CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_records() CASCADE;
DROP FUNCTION IF EXISTS hours_between(TIMESTAMPTZ, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS is_within_24_hours(TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS get_tee_datetime(DATE, TIME) CASCADE;
DROP FUNCTION IF EXISTS get_course_usage(INT) CASCADE;
DROP FUNCTION IF EXISTS accept_invite_atomic(UUID, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS check_onboarding_complete(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_onboarding_completed() CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- ============================================================================
-- STEP 2: ENABLE EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- STEP 3: UTILITY FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Calculate hours between timestamps
CREATE OR REPLACE FUNCTION hours_between(start_time TIMESTAMPTZ, end_time TIMESTAMPTZ)
RETURNS DECIMAL AS $$
BEGIN
    RETURN EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function: Check if within 24 hours
CREATE OR REPLACE FUNCTION is_within_24_hours(target_time TIMESTAMPTZ)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN hours_between(NOW(), target_time) <= 24;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function: Get tee time datetime
CREATE OR REPLACE FUNCTION get_tee_datetime(tee_date DATE, tee_time TIME)
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN (tee_date + tee_time)::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Admin: course usage by tee time count (for admin dashboard)
CREATE OR REPLACE FUNCTION get_course_usage(p_limit INT DEFAULT 50)
RETURNS TABLE(course_name TEXT, course_location TEXT, tee_time_count BIGINT)
LANGUAGE sql
STABLE
AS $$
    SELECT tt.course_name::TEXT, COALESCE(tt.course_location, '')::TEXT, COUNT(*)::BIGINT
    FROM tee_times tt
    GROUP BY tt.course_name, COALESCE(tt.course_location, '')
    ORDER BY COUNT(*) DESC
    LIMIT GREATEST(1, LEAST(p_limit, 200));
$$;

COMMENT ON FUNCTION get_course_usage(INT) IS 'Returns courses by number of tee times (for admin platform usage)';

-- ============================================================================
-- STEP 4: CREATE TABLES
-- ============================================================================

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
-- IDENTITY NOTE: User identity is the `id` (UUID).
-- Phone and email are PROFILE DATA, not identity fields.
-- OAuth users may have NULL phone_number.
-- ONBOARDING TRACKING: Backend is source of truth for onboarding completion
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE,  -- NULLABLE: OAuth users may not have phone
    email VARCHAR(255) UNIQUE,
    username VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    supabase_auth_id UUID UNIQUE,  -- Link to Supabase auth.users.id if using native auth
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    last_login_device_id UUID,
    -- Onboarding tracking fields
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_completed_at TIMESTAMPTZ,
    availability_completed BOOLEAN DEFAULT FALSE,
    availability_completed_at TIMESTAMPTZ,
    profile_completed BOOLEAN DEFAULT FALSE,
    profile_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_phone_number ON users(phone_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_onboarding_status ON users(onboarding_completed, availability_completed) WHERE deleted_at IS NULL;

COMMENT ON COLUMN users.onboarding_completed IS 'True when ALL required onboarding steps are completed';
COMMENT ON COLUMN users.availability_completed IS 'True when user has set their availability preferences';
COMMENT ON COLUMN users.profile_completed IS 'True when user has completed basic profile setup';

-- ============================================================================
-- 2. USER_PROFILES TABLE (with integer social_rate 0-100)
-- ============================================================================
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    handicap DECIMAL(4,1),
    social_rate INT DEFAULT 100 CHECK (social_rate >= 0),
    avatar_url TEXT,
    bio TEXT,
    location VARCHAR(255),
    home_course VARCHAR(255),
    clubs JSONB DEFAULT '[]'::jsonb,
    driver VARCHAR(100),
    irons VARCHAR(100),
    putter VARCHAR(100),
    ball VARCHAR(100),
    preferred_tee_time VARCHAR(50),
    walk_or_ride VARCHAR(20) DEFAULT 'ride',
    playing_partner_preference VARCHAR(100),
    zip_code VARCHAR(20),
    drink_of_choice VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    notification_preferences JSONB DEFAULT '{"email": true, "sms": true, "push": true}'::jsonb,
    privacy_settings JSONB DEFAULT '{"show_handicap": true, "show_location": true, "show_phone": false}'::jsonb,
    rounds_played INT DEFAULT 0,
    average_score DECIMAL(4,1),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_walk_or_ride CHECK (walk_or_ride IN ('walk', 'ride', 'either'))
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_handicap ON user_profiles(handicap);
CREATE INDEX idx_user_profiles_clubs ON user_profiles USING GIN (clubs);

COMMENT ON COLUMN user_profiles.clubs IS 'Array of club memberships: [{"id": "...", "name": "...", "location": "...", "type": "..."}]';
COMMENT ON COLUMN user_profiles.zip_code IS 'User zip/postal code from onboarding';

-- ============================================================================
-- 3. DEVICES TABLE
-- ============================================================================
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    device_type VARCHAR(50),
    os VARCHAR(50),
    os_version VARCHAR(50),
    browser VARCHAR(100),
    browser_version VARCHAR(50),
    app_version VARCHAR(50),
    is_native_app BOOLEAN DEFAULT false,
    user_agent TEXT,
    is_trusted BOOLEAN DEFAULT false,
    trusted_at TIMESTAMPTZ,
    is_blocked BOOLEAN DEFAULT false,
    blocked_at TIMESTAMPTZ,
    block_reason VARCHAR(255),
    push_token TEXT,
    push_platform VARCHAR(20),
    last_ip_address INET,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_device UNIQUE (user_id, device_fingerprint)
);

CREATE INDEX idx_devices_user_id ON devices(user_id);

-- ============================================================================
-- 4. SESSIONS TABLE
-- ============================================================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    access_token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL,
    token_family_id UUID DEFAULT uuid_generate_v4(),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    remember_me BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id),
    revoke_reason VARCHAR(255)
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_access_token_hash ON sessions(access_token_hash);
CREATE INDEX idx_sessions_refresh_token_hash ON sessions(refresh_token_hash);

-- ============================================================================
-- 4b. AUTH_PROVIDERS TABLE (OAuth) - Industrial Grade
-- ============================================================================
-- OAuth provider links for Google, Apple, etc.
-- CRITICAL CONSTRAINTS:
--   - UNIQUE (provider, provider_user_id) prevents duplicate OAuth accounts
--   - CASCADE DELETE prevents orphaned links when user deleted
--   - Multiple indexes for multi-strategy user lookup (primary + email fallback)
-- ============================================================================
CREATE TABLE auth_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,  -- OAuth provider name (lowercase: 'google', 'apple')
    provider_user_id TEXT NOT NULL, -- Provider's unique user ID (Firebase UID, Apple ID, etc.)
    provider_email VARCHAR(255),    -- Email from OAuth provider (may differ from users.email)
    provider_data JSONB DEFAULT '{}'::jsonb, -- OAuth metadata (name, picture, locale, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(), -- Track OAuth usage
    
    -- CRITICAL: Prevents duplicate OAuth accounts (PRIMARY strategy)
    CONSTRAINT unique_provider_user UNIQUE (provider, provider_user_id),
    
    -- Validate provider name format
    CONSTRAINT valid_provider CHECK (provider IN ('google', 'apple', 'facebook', 'twitter'))
);

-- Index for fast user lookup (used in findByUserId)
CREATE INDEX idx_auth_providers_user_id ON auth_providers(user_id);

-- Index for provider lookup (used in auth flow)
CREATE INDEX idx_auth_providers_provider ON auth_providers(provider);

-- Composite index for primary OAuth user lookup
CREATE INDEX idx_auth_providers_provider_user_id ON auth_providers(provider, provider_user_id);

-- FALLBACK STRATEGY: Email-based unique index for provider ID changes
-- Allows multiple NULL emails but enforces uniqueness for non-NULL
CREATE UNIQUE INDEX idx_auth_providers_email_unique 
ON auth_providers(provider, provider_email) 
WHERE provider_email IS NOT NULL;

-- Index for email fallback lookup (fast query when provider_user_id changes)
CREATE INDEX idx_auth_providers_email 
ON auth_providers(provider_email) 
WHERE provider_email IS NOT NULL;

-- Index for analytics on OAuth usage
CREATE INDEX idx_auth_providers_last_used 
ON auth_providers(last_used_at DESC);

COMMENT ON TABLE auth_providers IS 'Links users to external OAuth providers with multi-strategy lookup support';
COMMENT ON COLUMN auth_providers.provider IS 'OAuth provider name (lowercase): google, apple, etc.';
COMMENT ON COLUMN auth_providers.provider_user_id IS 'Stable unique ID from OAuth provider (Firebase UID, Apple ID)';
COMMENT ON COLUMN auth_providers.provider_email IS 'Email from OAuth provider (for fallback strategy)';
COMMENT ON COLUMN auth_providers.provider_data IS 'OAuth metadata: {name, picture, locale, email_verified, is_private_email}';
COMMENT ON COLUMN auth_providers.last_used_at IS 'Last OAuth sign-in timestamp (for analytics & cleanup)';
COMMENT ON CONSTRAINT unique_provider_user ON auth_providers IS 'CRITICAL: Prevents duplicate OAuth accounts';
COMMENT ON INDEX idx_auth_providers_email_unique IS 'Email fallback strategy: handles provider ID format changes';

-- ============================================================================
-- 5. OTP_REQUESTS TABLE
-- ============================================================================
CREATE TABLE otp_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    otp_code_hash VARCHAR(255) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    ip_address INET,
    device_fingerprint TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT valid_otp_purpose CHECK (purpose IN ('login', 'signup', 'password_reset', 'verification', 'phone_change'))
);

CREATE INDEX idx_otp_phone_number ON otp_requests(phone_number);

-- ============================================================================
-- 6. MAGIC_LINKS TABLE
-- ============================================================================
CREATE TABLE magic_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    phone_number VARCHAR(20),
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMPTZ,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    ip_address INET,
    user_agent TEXT,
    device_fingerprint TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT valid_magic_link_purpose CHECK (purpose IN ('login', 'signup', 'email_verification', 'password_reset'))
);

CREATE INDEX idx_magic_links_token_hash ON magic_links(token_hash);

-- ============================================================================
-- 7. ROSTER_GROUPS TABLE
-- ============================================================================
CREATE TABLE roster_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#5DB075',
    icon TEXT,
    position INT DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    auto_invite BOOLEAN DEFAULT true,
    max_members INT DEFAULT 20,
    sort_preference VARCHAR(20) DEFAULT 'position',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_group_name UNIQUE (user_id, name),
    CONSTRAINT valid_sort_preference CHECK (sort_preference IN ('position', 'socialRate', 'handicap', 'name', 'distance', 'membership'))
);

CREATE INDEX idx_roster_groups_user_id ON roster_groups(user_id);

-- ============================================================================
-- 8. ROSTER TABLE
-- ============================================================================
CREATE TABLE roster (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    contact_phone VARCHAR(20),
    contact_name VARCHAR(100),
    contact_email VARCHAR(255),
    contact_handicap DECIMAL(4,1),
    group_id UUID REFERENCES roster_groups(id) ON DELETE SET NULL,
    position INT NOT NULL DEFAULT 0,
    is_on_deck BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    social_rate DECIMAL(3,2),
    distance_to_course DECIMAL(5,2),
    club_membership VARCHAR(255),
    last_played_together TIMESTAMPTZ,
    times_played_together INT DEFAULT 0,
    invite_acceptance_rate DECIMAL(3,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_roster_user UNIQUE (user_id, contact_user_id),
    CONSTRAINT unique_roster_phone UNIQUE (user_id, contact_phone)
);

CREATE INDEX idx_roster_user_id ON roster(user_id);
CREATE INDEX idx_roster_contact_user_id ON roster(contact_user_id);
CREATE INDEX idx_roster_position ON roster(user_id, position);
CREATE INDEX idx_roster_on_deck ON roster(user_id, is_on_deck) WHERE is_on_deck = true;
CREATE INDEX idx_roster_group_id ON roster(group_id);

-- ============================================================================
-- 9. ROSTER_GROUP_MEMBERS TABLE
-- ============================================================================
CREATE TABLE roster_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES roster_groups(id) ON DELETE CASCADE,
    roster_id UUID NOT NULL REFERENCES roster(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_group_member UNIQUE (group_id, roster_id)
);

CREATE INDEX idx_roster_group_members_group_id ON roster_group_members(group_id);
CREATE INDEX idx_roster_group_members_roster_id ON roster_group_members(roster_id);

-- ============================================================================
-- 10. TEE_TIMES TABLE
-- ============================================================================
CREATE TABLE tee_times (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_name VARCHAR(255) NOT NULL,
    course_location VARCHAR(255),
    course_id VARCHAR(100),
    tee_date DATE NOT NULL,
    tee_time TIME NOT NULL,
    holes INT DEFAULT 18,
    max_players INT DEFAULT 4 CHECK (max_players >= 1 AND max_players <= 8),
    invite_type VARCHAR(20) NOT NULL DEFAULT 'roster',
    response_window INT DEFAULT 2,
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    booking_reference VARCHAR(100),
    estimated_cost DECIMAL(10,2),
    weather_conditions JSONB,
    check_in_reminder_sent BOOLEAN DEFAULT false,
    check_in_started_at TIMESTAMPTZ,
    check_in_completed_at TIMESTAMPTZ,
    check_in_completed_by UUID REFERENCES users(id),
    organizer_fill_warning_sent BOOLEAN DEFAULT false,
    distance_radius DECIMAL(5,2), -- Distance radius in miles for Open invites
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES users(id),
    cancel_reason TEXT,
    CONSTRAINT valid_invite_type CHECK (invite_type IN ('roster', 'fcfs', 'open', 'manual')),
    CONSTRAINT valid_tee_time_status CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    CONSTRAINT valid_holes CHECK (holes IN (9, 18))
);

CREATE INDEX idx_tee_times_creator_id ON tee_times(creator_id);
CREATE INDEX idx_tee_times_date ON tee_times(tee_date);
CREATE INDEX idx_tee_times_status ON tee_times(status);
CREATE INDEX idx_tee_times_upcoming ON tee_times(tee_date, tee_time) WHERE status IN ('pending', 'confirmed');
CREATE INDEX idx_tee_times_reminder_sent ON tee_times(check_in_reminder_sent) WHERE check_in_reminder_sent = false;
CREATE INDEX idx_tee_times_organizer_fill_warning ON tee_times(organizer_fill_warning_sent) WHERE organizer_fill_warning_sent = false;

-- ============================================================================
-- 11. TEE_TIME_PARTICIPANTS TABLE
-- ============================================================================
CREATE TABLE tee_time_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tee_time_id UUID NOT NULL REFERENCES tee_times(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    phone VARCHAR(20),
    name VARCHAR(100),
    position INT NOT NULL,
    is_creator BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'confirmed',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    penalty_applied BOOLEAN DEFAULT false,
    CONSTRAINT unique_participant_user UNIQUE (tee_time_id, user_id),
    CONSTRAINT unique_participant_phone UNIQUE (tee_time_id, phone),
    CONSTRAINT valid_participant_status CHECK (status IN ('confirmed', 'tentative', 'cancelled'))
);

CREATE INDEX idx_participants_tee_time_id ON tee_time_participants(tee_time_id);
CREATE INDEX idx_participants_user_id ON tee_time_participants(user_id);

-- ============================================================================
-- 12. INVITES TABLE (with deadline_notification_sent)
-- ============================================================================
CREATE TABLE invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tee_time_id UUID NOT NULL REFERENCES tee_times(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    invitee_phone VARCHAR(20),
    invitee_name VARCHAR(100),
    invitee_email VARCHAR(255),
    position INT,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    sms_sent BOOLEAN DEFAULT false,
    sms_sent_at TIMESTAMPTZ,
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    deadline_notification_sent BOOLEAN DEFAULT false,
    notified_5m BOOLEAN DEFAULT false,
    notified_expired BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_invite_status CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'waitlist', 'cancelled'))
);

CREATE INDEX idx_invites_tee_time_id ON invites(tee_time_id);
CREATE INDEX idx_invites_inviter_id ON invites(inviter_id);
CREATE INDEX idx_invites_invitee_user_id ON invites(invitee_user_id);
CREATE INDEX idx_invites_status ON invites(status);
CREATE INDEX idx_invites_pending ON invites(invitee_user_id, status) WHERE status = 'pending';
CREATE INDEX idx_invites_expires ON invites(expires_at) WHERE status = 'pending' AND expires_at IS NOT NULL;
CREATE INDEX idx_invites_deadline_notification ON invites(expires_at, deadline_notification_sent) 
    WHERE status = 'pending' AND expires_at IS NOT NULL;
CREATE INDEX idx_invites_notifications ON invites (status, expires_at, notified_5m, notified_expired);

-- ============================================================================
-- 13. INVITE_RESPONSES TABLE
-- ============================================================================
CREATE TABLE invite_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invite_id UUID NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    response VARCHAR(20) NOT NULL,
    response_message TEXT,
    responded_via VARCHAR(20) DEFAULT 'app',
    ip_address INET,
    device_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_response CHECK (response IN ('accepted', 'declined', 'maybe', 'waitlist')),
    CONSTRAINT valid_response_via CHECK (responded_via IN ('app', 'sms', 'email', 'web'))
);

CREATE INDEX idx_invite_responses_invite_id ON invite_responses(invite_id);
CREATE INDEX idx_invite_responses_user_id ON invite_responses(user_id);

-- ============================================================================
-- 14. SOCIAL_RATE_LOGS TABLE (with cancellation_confirmed reason)
-- ============================================================================
CREATE TABLE social_rate_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tee_time_id UUID REFERENCES tee_times(id) ON DELETE SET NULL,
    invite_id UUID REFERENCES invites(id) ON DELETE SET NULL,
    previous_score INT NOT NULL,
    delta INT NOT NULL,
    new_score INT NOT NULL,
    reason VARCHAR(50) NOT NULL,
    reason_details TEXT,
    triggered_by UUID REFERENCES users(id),
    is_system_generated BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_social_rate_reason CHECK (reason IN (
        'invite_accepted',
        'invite_declined_late',
        'cancellation_late',
        'cancellation_confirmed',
        'no_show',
        'initial_score',
        'admin_adjustment'
    ))
);

CREATE INDEX idx_social_rate_logs_user ON social_rate_logs(user_id);
CREATE INDEX idx_social_rate_logs_tee_time ON social_rate_logs(tee_time_id);
CREATE INDEX idx_social_rate_logs_invite ON social_rate_logs(invite_id);
CREATE INDEX idx_social_rate_logs_created ON social_rate_logs(created_at DESC);
CREATE INDEX idx_social_rate_logs_reason ON social_rate_logs(reason);

-- ============================================================================
-- 15. TEE_TIME_ATTENDANCE TABLE
-- ============================================================================
CREATE TABLE tee_time_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tee_time_id UUID NOT NULL REFERENCES tee_times(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES tee_time_participants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    checked_in_at TIMESTAMPTZ,
    checked_in_by UUID REFERENCES users(id),
    marked_no_show_at TIMESTAMPTZ,
    marked_no_show_by UUID REFERENCES users(id),
    no_show_notified BOOLEAN DEFAULT false,
    penalty_applied BOOLEAN DEFAULT false,
    penalty_log_id UUID REFERENCES social_rate_logs(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_attendance_status CHECK (status IN ('pending', 'present', 'no_show', 'cancelled')),
    CONSTRAINT unique_attendance UNIQUE (tee_time_id, participant_id)
);

CREATE INDEX idx_attendance_tee_time ON tee_time_attendance(tee_time_id);
CREATE INDEX idx_attendance_user ON tee_time_attendance(user_id);
CREATE INDEX idx_attendance_status ON tee_time_attendance(status);
CREATE INDEX idx_attendance_pending ON tee_time_attendance(tee_time_id, status) WHERE status = 'pending';

-- ============================================================================
-- 16. BLOCKED_USERS TABLE
-- ============================================================================
CREATE TABLE blocked_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_block UNIQUE (user_id, blocked_user_id),
    CONSTRAINT no_self_block CHECK (user_id != blocked_user_id)
);

CREATE INDEX idx_blocked_users_user_id ON blocked_users(user_id);
CREATE INDEX idx_blocked_users_blocked_user_id ON blocked_users(blocked_user_id);

COMMENT ON TABLE blocked_users IS 'Stores user blocking relationships';

-- ============================================================================
-- 17. FRIEND_REQUESTS TABLE
-- ============================================================================
CREATE TABLE friend_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    CONSTRAINT unique_friend_request UNIQUE (sender_id, receiver_id),
    CONSTRAINT valid_friend_status CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
    CONSTRAINT no_self_friend CHECK (sender_id != receiver_id)
);

CREATE INDEX idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX idx_friend_requests_receiver ON friend_requests(receiver_id);

-- ============================================================================
-- 18. FRIENDSHIPS TABLE
-- ============================================================================
CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_friendship UNIQUE (user_id, friend_id),
    CONSTRAINT no_self_friendship CHECK (user_id != friend_id)
);

CREATE INDEX idx_friendships_user ON friendships(user_id);
CREATE INDEX idx_friendships_friend ON friendships(friend_id);

-- ============================================================================
-- 19. GOLF_COURSES TABLE
-- ============================================================================
CREATE TABLE golf_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'USA',
    postal_code VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone VARCHAR(20),
    website VARCHAR(255),
    holes INT DEFAULT 18,
    par INT,
    course_type VARCHAR(50),
    price_range VARCHAR(20),
    rating DECIMAL(3, 2),
    amenities JSONB DEFAULT '[]'::jsonb,
    hours JSONB,
    images JSONB DEFAULT '[]'::jsonb,
    google_place_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_golf_courses_name ON golf_courses(name);
CREATE INDEX idx_golf_courses_city ON golf_courses(city);
CREATE INDEX idx_golf_courses_location ON golf_courses(latitude, longitude);

-- ============================================================================
-- 20. USER_FAVORITE_COURSES TABLE
-- ============================================================================
CREATE TABLE user_favorite_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES golf_courses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_course UNIQUE (user_id, course_id)
);

CREATE INDEX idx_user_favorite_courses_user ON user_favorite_courses(user_id);

-- ============================================================================
-- 20b. AD_SLOTS TABLE (admin-managed ads: 4 placements)
-- ============================================================================
CREATE TABLE ad_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_key TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    slot_type TEXT,
    image_url TEXT,
    link_url TEXT,
    alt_text TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_slot_key CHECK (slot_key IN ('loading_screen', 'banner_1', 'banner_2', 'banner_3')),
    CONSTRAINT valid_slot_type CHECK (slot_type IS NULL OR slot_type IN ('loading_screen', 'banner'))
);

CREATE INDEX idx_ad_slots_slot_key ON ad_slots(slot_key);
CREATE INDEX idx_ad_slots_active ON ad_slots(active) WHERE active = true;

COMMENT ON TABLE ad_slots IS '4 ad placements: Sign up/Sign in, Chatting, Tee time type selection, Calendar view';
COMMENT ON COLUMN ad_slots.alt_text IS 'Ad copy/description shown with the image';

-- Seed the 4 slots (idempotent)
INSERT INTO ad_slots (slot_key, display_name, slot_type, sort_order)
VALUES
    ('loading_screen', 'Sign up / Sign in page', 'loading_screen', 1),
    ('banner_1', 'Chatting page', 'banner', 2),
    ('banner_2', 'Tee time type selection (tee time creating)', 'banner', 3),
    ('banner_3', 'Calendar view page', 'banner', 4)
ON CONFLICT (slot_key) DO NOTHING;

-- ============================================================================
-- 21. ROSTER_MEMBER_HISTORY TABLE
-- ============================================================================
CREATE TABLE roster_member_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roster_id UUID NOT NULL REFERENCES roster(id) ON DELETE CASCADE,
    tee_time_id UUID REFERENCES tee_times(id) ON DELETE SET NULL,
    invite_status VARCHAR(20),
    played_together BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_roster_member_history_roster ON roster_member_history(roster_id);

-- ============================================================================
-- 22. WAIVER_WIRE TABLE
-- ============================================================================
CREATE TABLE waiver_wire (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    available_date DATE NOT NULL,
    preferred_time VARCHAR(50),
    preferred_course VARCHAR(255),
    max_handicap INT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    CONSTRAINT unique_waiver_date UNIQUE (user_id, available_date)
);

CREATE INDEX idx_waiver_wire_date ON waiver_wire(available_date) WHERE is_active = true;

-- ============================================================================
-- 23. LOGIN_LOGS TABLE
-- ============================================================================
CREATE TABLE login_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    phone_number VARCHAR(20),
    email VARCHAR(255),
    login_method VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    failure_reason VARCHAR(255),
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    device_fingerprint TEXT,
    location JSONB,
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_login_method CHECK (login_method IN ('password', 'otp', 'magic_link', 'google', 'apple', 'facebook')),
    CONSTRAINT valid_login_status CHECK (status IN ('success', 'failed', 'blocked', 'suspicious', 'rate_limited'))
);

CREATE INDEX idx_login_logs_user_id ON login_logs(user_id);
CREATE INDEX idx_login_logs_attempted_at ON login_logs(attempted_at DESC);

-- ============================================================================
-- 23b. USER_REPORTS TABLE (admin mediation)
-- ============================================================================
CREATE TABLE user_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_report_status CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed'))
);

CREATE INDEX idx_user_reports_reporter ON user_reports(reporter_id);
CREATE INDEX idx_user_reports_reported_user ON user_reports(reported_user_id);
CREATE INDEX idx_user_reports_status ON user_reports(status);
CREATE INDEX idx_user_reports_created ON user_reports(created_at DESC);

COMMENT ON TABLE user_reports IS 'User-reported issues for admin mediation';

-- ============================================================================
-- 24. NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    channel VARCHAR(50),
    title VARCHAR(255),
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    action_url TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    scheduled_for TIMESTAMPTZ,
    external_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_notification_type CHECK (type IN ('push', 'email', 'sms', 'in_app')),
    CONSTRAINT valid_notification_status CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read'))
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);

-- ============================================================================
-- 24b. BROADCAST_HISTORY TABLE (admin broadcast push log for history UI)
-- ============================================================================
CREATE TABLE broadcast_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    sent INT NOT NULL DEFAULT 0,
    failed INT NOT NULL DEFAULT 0,
    total INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_broadcast_history_created_at ON broadcast_history(created_at DESC);

-- ============================================================================
-- 25. ANALYTICS_EVENTS TABLE
-- ============================================================================
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    event_name VARCHAR(100) NOT NULL,
    event_category VARCHAR(50),
    event_properties JSONB DEFAULT '{}'::jsonb,
    session_id UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_event_name ON analytics_events(event_name);

-- ============================================================================
-- 26. RATE_LIMITS TABLE
-- ============================================================================
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier_type VARCHAR(20) NOT NULL,
    identifier_value VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    count INT DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    window_duration_seconds INT NOT NULL,
    max_attempts INT NOT NULL,
    is_blocked BOOLEAN DEFAULT false,
    blocked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(identifier_type, identifier_value, action, window_start),
    CONSTRAINT valid_identifier_type CHECK (identifier_type IN ('user', 'phone', 'ip', 'device'))
);

CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier_type, identifier_value);

-- ============================================================================
-- 27. ROSTER_NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE roster_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roster_id UUID NOT NULL REFERENCES roster(id) ON DELETE CASCADE,
    notified_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    roster_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES roster_groups(id) ON DELETE SET NULL,
    group_name VARCHAR(100),
    notification_sent BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_roster_notification UNIQUE (roster_id, notified_user_id)
);

CREATE INDEX idx_roster_notifications_user ON roster_notifications(notified_user_id);
CREATE INDEX idx_roster_notifications_pending ON roster_notifications(notified_user_id, notification_sent) 
    WHERE notification_sent = false;

-- ============================================================================
-- 28. HANDICAP_LOGS TABLE
-- ============================================================================
CREATE TABLE handicap_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    previous_handicap DECIMAL(4,1),
    new_handicap DECIMAL(4,1) NOT NULL,
    source VARCHAR(20) DEFAULT 'user_edit',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_handicap_source CHECK (source IN ('user_edit', 'ghin_sync', 'admin'))
);

CREATE INDEX idx_handicap_logs_user ON handicap_logs(user_id);
CREATE INDEX idx_handicap_logs_created ON handicap_logs(created_at DESC);

-- ============================================================================
-- 29. CLUBS TABLE
-- ============================================================================
CREATE TABLE clubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    website VARCHAR(255),
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_club_name UNIQUE (name)
);

CREATE INDEX idx_clubs_name ON clubs(name);

-- ============================================================================
-- 30. USER_CLUB_MEMBERSHIPS TABLE
-- ============================================================================
CREATE TABLE user_club_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    membership_type VARCHAR(50),
    member_since DATE,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_club UNIQUE (user_id, club_id)
);

CREATE INDEX idx_user_club_memberships_user ON user_club_memberships(user_id);

-- ============================================================================
-- 31. DRAFT_QR_CODES TABLE
-- ============================================================================
CREATE TABLE draft_qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    scanned_count INT DEFAULT 0,
    last_scanned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    CONSTRAINT unique_active_qr_code UNIQUE (code_hash)
);

CREATE INDEX idx_draft_qr_codes_user ON draft_qr_codes(user_id);
CREATE INDEX idx_draft_qr_codes_hash ON draft_qr_codes(code_hash) WHERE is_active = true;
CREATE INDEX idx_draft_qr_codes_active ON draft_qr_codes(user_id, is_active) WHERE is_active = true;

-- ============================================================================
-- 31b. QR_SCAN_HISTORY TABLE - Track who scanned whose QR code
-- ============================================================================
CREATE TABLE qr_scan_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code_id UUID NOT NULL REFERENCES draft_qr_codes(id) ON DELETE CASCADE,
    scanned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- The user who owns the QR code
    scanner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- The user who scanned
    was_added_to_roster BOOLEAN DEFAULT false,
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_scan_per_session UNIQUE (qr_code_id, scanner_user_id, scanned_at)
);

CREATE INDEX idx_qr_scan_history_scanned_user ON qr_scan_history(scanned_user_id);
CREATE INDEX idx_qr_scan_history_scanner ON qr_scan_history(scanner_user_id);
CREATE INDEX idx_qr_scan_history_time ON qr_scan_history(scanned_at DESC);

-- ============================================================================
-- 32. GAME_SCORES TABLE
-- ============================================================================
CREATE TABLE game_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tee_time_id UUID NOT NULL REFERENCES tee_times(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES tee_time_participants(id) ON DELETE SET NULL,
    score INT NOT NULL,
    holes_played INT DEFAULT 18,
    course_par INT DEFAULT 72,
    score_differential DECIMAL(4,1),
    verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_tee_time_score UNIQUE (user_id, tee_time_id),
    CONSTRAINT valid_holes CHECK (holes_played IN (9, 18))
);

CREATE INDEX idx_game_scores_user ON game_scores(user_id);
CREATE INDEX idx_game_scores_tee_time ON game_scores(tee_time_id);
CREATE INDEX idx_game_scores_created ON game_scores(created_at DESC);

-- ============================================================================
-- 33. USER_AVAILABILITY TABLE
-- ============================================================================
-- Stores user's weekly availability preferences for scheduling tee times
CREATE TABLE user_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week VARCHAR(10) NOT NULL CHECK (day_of_week IN ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')),
    time_slot VARCHAR(20) NOT NULL CHECK (time_slot IN ('morning', 'late_morning', 'afternoon', 'late_afternoon', 'evening')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_day_time UNIQUE (user_id, day_of_week, time_slot)
);

-- Indexes for performance
CREATE INDEX idx_user_availability_user ON user_availability(user_id);
CREATE INDEX idx_user_availability_day ON user_availability(day_of_week);
CREATE INDEX idx_user_availability_active ON user_availability(is_active) WHERE is_active = true;
CREATE INDEX idx_user_availability_user_active ON user_availability(user_id, is_active) WHERE is_active = true;

-- Comments
COMMENT ON TABLE user_availability IS 'User weekly availability preferences for tee time scheduling';
COMMENT ON COLUMN user_availability.day_of_week IS 'Day of week: Mon, Tue, Wed, Thu, Fri, Sat, Sun';
COMMENT ON COLUMN user_availability.time_slot IS 'Time slot: morning (7-9), late_morning (9-12), afternoon (12-3), late_afternoon (3-5), evening (5-8)';
COMMENT ON COLUMN user_availability.is_active IS 'Soft delete flag - allows historical tracking';

-- ============================================================================
-- 34. ONBOARDING_STEPS TABLE
-- ============================================================================
-- Tracks individual onboarding step completion for granular control
CREATE TABLE onboarding_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    step_name VARCHAR(50) NOT NULL, -- 'profile', 'availability', 'preferences', etc.
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    skipped BOOLEAN DEFAULT FALSE,
    skipped_at TIMESTAMPTZ,
    data JSONB DEFAULT '{}', -- Store step-specific data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_step UNIQUE (user_id, step_name)
);

-- Indexes for fast lookups
CREATE INDEX idx_onboarding_steps_user_id ON onboarding_steps(user_id);
CREATE INDEX idx_onboarding_steps_completed ON onboarding_steps(user_id, completed);

COMMENT ON TABLE onboarding_steps IS 'Tracks individual onboarding step completion for granular control';
COMMENT ON COLUMN onboarding_steps.step_name IS 'Step identifier: profile, availability, preferences, etc.';
COMMENT ON COLUMN onboarding_steps.data IS 'Step-specific data stored as JSON';

-- ============================================================================
-- 35. CONVERSATIONS TABLE
-- ============================================================================
-- Conversations: direct (1:1), tee_time, or group
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'tee_time', 'group')),
    tee_time_id UUID REFERENCES tee_times(id) ON DELETE CASCADE,
    roster_group_id UUID REFERENCES roster_groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_conversation_type CHECK (
        (type = 'direct' AND tee_time_id IS NULL AND roster_group_id IS NULL) OR
        (type = 'tee_time' AND tee_time_id IS NOT NULL AND roster_group_id IS NULL) OR
        (type = 'group' AND roster_group_id IS NOT NULL AND tee_time_id IS NULL)
    )
);

CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_tee_time_id ON conversations(tee_time_id) WHERE tee_time_id IS NOT NULL;
CREATE INDEX idx_conversations_roster_group_id ON conversations(roster_group_id) WHERE roster_group_id IS NOT NULL;

-- ============================================================================
-- 36. CONVERSATION_PARTICIPANTS TABLE
-- ============================================================================
CREATE TABLE conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    last_read_at TIMESTAMPTZ,
    CONSTRAINT unique_conversation_participant UNIQUE (conversation_id, user_id)
);

CREATE INDEX idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);

-- ============================================================================
-- 37. MESSAGES TABLE
-- ============================================================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    image_url TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(conversation_id, created_at DESC);

-- ============================================================================
-- 38. MESSAGE_READ_RECEIPTS TABLE
-- ============================================================================
CREATE TABLE message_read_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_message_read UNIQUE (message_id, user_id)
);

CREATE INDEX idx_message_read_receipts_message ON message_read_receipts(message_id);
CREATE INDEX idx_message_read_receipts_user ON message_read_receipts(user_id);

-- ============================================================================
-- STEP 5: CREATE TRIGGERS
-- ============================================================================

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auth_providers_updated_at BEFORE UPDATE ON auth_providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roster_updated_at BEFORE UPDATE ON roster
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roster_groups_updated_at BEFORE UPDATE ON roster_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tee_times_updated_at BEFORE UPDATE ON tee_times
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invites_updated_at BEFORE UPDATE ON invites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friend_requests_updated_at BEFORE UPDATE ON friend_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_golf_courses_updated_at BEFORE UPDATE ON golf_courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_reports_updated_at BEFORE UPDATE ON user_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_slots_updated_at BEFORE UPDATE ON ad_slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limits_updated_at BEFORE UPDATE ON rate_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON tee_time_attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_availability_updated_at BEFORE UPDATE ON user_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_steps_updated_at BEFORE UPDATE ON onboarding_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ONBOARDING HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user has completed all required onboarding
CREATE OR REPLACE FUNCTION check_onboarding_complete(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_availability_complete BOOLEAN;
    v_profile_complete BOOLEAN;
BEGIN
    SELECT 
        availability_completed,
        profile_completed
    INTO 
        v_availability_complete,
        v_profile_complete
    FROM users
    WHERE id = p_user_id;
    
    -- All required steps must be completed
    RETURN v_availability_complete AND v_profile_complete;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update onboarding_completed when steps are completed
CREATE OR REPLACE FUNCTION update_onboarding_completed()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the main onboarding_completed flag
    UPDATE users
    SET 
        onboarding_completed = check_onboarding_complete(NEW.id),
        onboarding_completed_at = CASE 
            WHEN check_onboarding_complete(NEW.id) AND onboarding_completed_at IS NULL 
            THEN NOW() 
            ELSE onboarding_completed_at 
        END
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on users table
CREATE TRIGGER trigger_update_onboarding_completed
    AFTER UPDATE OF availability_completed, profile_completed ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_onboarding_completed();

-- ============================================================================
-- STEP 6: CREATE VIEWS
-- ============================================================================

-- View: User social rate summary
CREATE OR REPLACE VIEW user_social_rate_summary AS
SELECT 
    u.id as user_id,
    u.first_name,
    u.last_name,
    COALESCE(up.social_rate, 100) as current_score,
    COUNT(srl.id) FILTER (WHERE srl.reason = 'invite_accepted') as accepts,
    COUNT(srl.id) FILTER (WHERE srl.reason = 'invite_declined_late') as late_declines,
    COUNT(srl.id) FILTER (WHERE srl.reason IN ('cancellation_late', 'cancellation_confirmed')) as cancellations,
    COUNT(srl.id) FILTER (WHERE srl.reason = 'no_show') as no_shows,
    COALESCE(SUM(srl.delta) FILTER (WHERE srl.delta > 0), 0) as total_points_earned,
    ABS(COALESCE(SUM(srl.delta) FILTER (WHERE srl.delta < 0), 0)) as total_points_lost
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN social_rate_logs srl ON u.id = srl.user_id
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.first_name, u.last_name, up.social_rate;

-- View: Tee time attendance summary
CREATE OR REPLACE VIEW tee_time_attendance_summary AS
SELECT 
    tt.id as tee_time_id,
    tt.course_name,
    tt.tee_date,
    tt.tee_time,
    tt.status as tee_time_status,
    COUNT(tta.id) as total_participants,
    COUNT(tta.id) FILTER (WHERE tta.status = 'present') as present_count,
    COUNT(tta.id) FILTER (WHERE tta.status = 'no_show') as no_show_count,
    COUNT(tta.id) FILTER (WHERE tta.status = 'cancelled') as cancelled_count,
    COUNT(tta.id) FILTER (WHERE tta.status = 'pending') as pending_count,
    tt.check_in_completed_at IS NOT NULL as check_in_completed
FROM tee_times tt
LEFT JOIN tee_time_attendance tta ON tt.id = tta.tee_time_id
GROUP BY tt.id, tt.course_name, tt.tee_date, tt.tee_time, tt.status, tt.check_in_completed_at;

-- ============================================================================
-- STEP 7: CLEANUP FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_records()
RETURNS void AS $$
BEGIN
    DELETE FROM otp_requests WHERE expires_at < NOW() AND is_verified = false;
    DELETE FROM magic_links WHERE expires_at < NOW() AND is_used = false;
    DELETE FROM login_logs WHERE attempted_at < NOW() - INTERVAL '90 days';
    DELETE FROM analytics_events WHERE created_at < NOW() - INTERVAL '90 days';
    DELETE FROM sessions WHERE expires_at < NOW() OR (is_active = false AND revoked_at < NOW() - INTERVAL '30 days');
    UPDATE rate_limits SET is_blocked = false, blocked_until = NULL WHERE blocked_until < NOW();
    UPDATE invites SET status = 'expired', updated_at = NOW() 
        WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: accept_invite_atomic
-- ============================================================================
CREATE OR REPLACE FUNCTION accept_invite_atomic(
  p_invite_id UUID,
  p_user_id UUID,
  p_response_message TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_invite RECORD;
  v_tee_time RECORD;
  v_participant_count INT;
  v_new_participant_id UUID;
BEGIN
  -- Lock the invite row
  SELECT * INTO v_invite FROM invites 
  WHERE id = p_invite_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invite not found');
  END IF;

  IF v_invite.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invite is no longer pending. Status: ' || v_invite.status);
  END IF;

  -- Lock tee time row
  SELECT * INTO v_tee_time FROM tee_times 
  WHERE id = v_invite.tee_time_id FOR UPDATE;

  -- Check capacity
  SELECT COUNT(*) INTO v_participant_count 
  FROM tee_time_participants 
  WHERE tee_time_id = v_invite.tee_time_id 
  AND status = 'confirmed';

  IF v_participant_count >= v_tee_time.max_players THEN
    RETURN jsonb_build_object('success', false, 'message', 'Tee time is full');
  END IF;

  -- Update invite
  UPDATE invites 
  SET status = 'accepted', updated_at = NOW() 
  WHERE id = p_invite_id;

  -- Add response
  INSERT INTO invite_responses (invite_id, user_id, response, response_message)
  VALUES (p_invite_id, p_user_id, 'accepted', p_response_message);

  -- Add participant
  INSERT INTO tee_time_participants (tee_time_id, user_id, position, status, name)
  VALUES (
    v_invite.tee_time_id, 
    p_user_id, 
    COALESCE(v_invite.position, v_participant_count + 1), 
    'confirmed',
    v_invite.invitee_name
  ) RETURNING id INTO v_new_participant_id;

  RETURN jsonb_build_object('success', true, 'participant_id', v_new_participant_id);

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in accept_invite_atomic: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 8: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tee_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE tee_time_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_rate_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tee_time_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorite_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_member_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiver_wire ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE handicap_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_club_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES (merged from migrations/003_add_user_availability_policies.sql)
-- ============================================================================
-- user_availability: users see/edit own; can view friends' availability (via friendships)

DROP POLICY IF EXISTS user_availability_select_own ON user_availability;
CREATE POLICY user_availability_select_own ON user_availability
    FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_availability_insert_own ON user_availability;
CREATE POLICY user_availability_insert_own ON user_availability
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_availability_update_own ON user_availability;
CREATE POLICY user_availability_update_own ON user_availability
    FOR UPDATE
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_availability_delete_own ON user_availability;
CREATE POLICY user_availability_delete_own ON user_availability
    FOR DELETE
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_availability_select_friends ON user_availability;
CREATE POLICY user_availability_select_friends ON user_availability
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user_id = auth.uid() AND f.friend_id = user_availability.user_id)
               OR (f.friend_id = auth.uid() AND f.user_id = user_availability.user_id)
        )
    );

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
--
-- Version: 5.8 (All SQL Merged)
-- Last Updated: February 12, 2026
-- Total Tables: 38
-- 
-- Core Tables:
--   1. users - User accounts (with onboarding tracking fields)
--   2. user_profiles - Extended user info (handicap, social_rate, preferences)
--   3. devices - User devices for push notifications
--   4. sessions - Active login sessions
--   4b. auth_providers - OAuth provider links (Google, Apple, etc.)
--   5. otp_requests - OTP verification codes
--   6. magic_links - Passwordless login links
--
-- Social/Roster Tables:
--   7. roster_groups - User-created groups (with sort_preference)
--   8. roster - User's golf contacts
--   9. roster_group_members - Group membership
--   10. roster_notifications - Notify when added to roster
--   11. blocked_users - User blocking relationships
--   12. friend_requests - Friend request tracking
--   13. friendships - Confirmed friendships
--
-- Tee Time Tables:
--   14. tee_times - Scheduled golf rounds (with check_in_reminder_sent)
--   15. tee_time_participants - Who's playing
--   16. invites - Tee time invitations (with deadline_notification_sent)
--   17. invite_responses - Invite response history
--   18. social_rate_logs - Social score changes (with cancellation_confirmed)
--   19. tee_time_attendance - Check-in tracking
--
-- Supporting Tables:
--   20. golf_courses - Course directory
--   21. user_favorite_courses - Saved courses
--   22. roster_member_history - Play history
--   23. waiver_wire - Availability posting
--   24. login_logs - Security audit
--   25. notifications - Push/email/SMS
--   26. analytics_events - Usage tracking
--   27. rate_limits - API throttling
--
-- Profile & Draft Tables:
--   28. handicap_logs - Handicap change audit trail
--   29. clubs - Golf clubs directory
--   30. user_club_memberships - User club memberships
--   31. draft_qr_codes - QR codes for "Get Drafted" feature
--   32. game_scores - Past game scores linked to tee times
--   33. user_availability - Weekly availability preferences
--   34. onboarding_steps - Granular onboarding step tracking
--   35. conversations - Direct, tee_time, and group conversations
--   36. conversation_participants - Conversation membership
--   37. messages - Chat messages (sender_id nullable for system messages)
--   38. message_read_receipts - Read receipts for messages
--   23b. user_reports - User-reported issues for admin mediation
--   20b. ad_slots - 4 ad placements (Sign in, Chatting, Tee time type, Calendar)
--
-- Migrations Included (all merged from schema/migrations/*.sql):
--   - 002: zip_code column on user_profiles
--   - 003: user_availability RLS policies (select/insert/update/delete own, select friends via friendships)
--   - 004: conversations, conversation_participants, messages, message_read_receipts
--   - blocked_users table (user blocking)
--   - cancellation_confirmed reason in social_rate_logs
--   - check_in_reminder_sent column in tee_times
--   - deadline_notification_sent column in invites
--   - user_availability table (weekly scheduling preferences)
--   - onboarding tracking (backend state management)
--   - distance_radius column in tee_times (for Open invites)
--
-- ============================================================================
