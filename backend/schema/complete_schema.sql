-- ============================================================================
-- TeeTime Golf App - Complete Database Schema
-- ============================================================================
-- Version: 2.0
-- Last Updated: December 2024
-- 
-- Run this in Supabase SQL Editor after running drop_all_tables.sql
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. USERS TABLE
-- Core user account information
-- Relationship: Central entity, referenced by all other tables
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    username VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    last_login_device_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_phone_number ON users(phone_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_is_active ON users(is_active) WHERE deleted_at IS NULL;

-- ============================================================================
-- 2. USER_PROFILES TABLE
-- Extended profile information (One-to-One with Users)
-- Relationship: User to Profile = One to One
-- ============================================================================
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    handicap DECIMAL(4,1),
    social_rate DECIMAL(3,2) DEFAULT 5.0,
    avatar_url TEXT,
    bio TEXT,
    location VARCHAR(255),
    home_course VARCHAR(255),
    -- Equipment
    driver VARCHAR(100),
    irons VARCHAR(100),
    putter VARCHAR(100),
    ball VARCHAR(100),
    -- Preferences
    preferred_tee_time VARCHAR(50),
    walk_or_ride VARCHAR(20) DEFAULT 'ride',
    playing_partner_preference VARCHAR(100),
    -- Settings
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    notification_preferences JSONB DEFAULT '{"email": true, "sms": true, "push": true}'::jsonb,
    privacy_settings JSONB DEFAULT '{"show_handicap": true, "show_location": true, "show_phone": false}'::jsonb,
    -- Stats
    rounds_played INT DEFAULT 0,
    average_score DECIMAL(4,1),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_walk_or_ride CHECK (walk_or_ride IN ('walk', 'ride', 'either'))
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_handicap ON user_profiles(handicap);
CREATE INDEX idx_user_profiles_location ON user_profiles(location);

-- ============================================================================
-- 3. DEVICES TABLE
-- User devices for push notifications and security
-- ============================================================================
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    device_type VARCHAR(50),
    os VARCHAR(50),
    os_version VARCHAR(50),
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
CREATE INDEX idx_devices_fingerprint ON devices(device_fingerprint);
CREATE INDEX idx_devices_is_trusted ON devices(is_trusted);

-- ============================================================================
-- 4. SESSIONS TABLE
-- User authentication sessions
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
CREATE INDEX idx_sessions_device_id ON sessions(device_id);
CREATE INDEX idx_sessions_access_token_hash ON sessions(access_token_hash);
CREATE INDEX idx_sessions_refresh_token_hash ON sessions(refresh_token_hash);
CREATE INDEX idx_sessions_is_active ON sessions(is_active) WHERE is_active = true;

-- ============================================================================
-- 5. OTP_REQUESTS TABLE
-- One-time password requests for authentication
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
CREATE INDEX idx_otp_user_id ON otp_requests(user_id);
CREATE INDEX idx_otp_expires_at ON otp_requests(expires_at) WHERE is_verified = false;

-- ============================================================================
-- 6. MAGIC_LINKS TABLE
-- Magic link authentication tokens
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

CREATE INDEX idx_magic_links_phone_number ON magic_links(phone_number);
CREATE INDEX idx_magic_links_token_hash ON magic_links(token_hash);
CREATE INDEX idx_magic_links_expires_at ON magic_links(expires_at) WHERE is_used = false;


-- ============================================================================
-- 7. ROSTER TABLE
-- User's personal roster of golf buddies
-- Relationship: User to Roster = One to Many
-- Relationship: User to Roster Member = One to Many (via contact_user_id)
-- ============================================================================
CREATE TABLE roster (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    contact_phone VARCHAR(20),
    contact_name VARCHAR(100),
    contact_email VARCHAR(255),
    contact_handicap DECIMAL(4,1),
    position INT NOT NULL DEFAULT 0,
    is_on_deck BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
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
CREATE INDEX idx_roster_favorite ON roster(user_id, is_favorite) WHERE is_favorite = true;

-- ============================================================================
-- 8. ROSTER_GROUPS TABLE
-- Custom groups for organizing roster contacts
-- ============================================================================
CREATE TABLE roster_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#5DB075',
    icon VARCHAR(50),
    position INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_group_name UNIQUE (user_id, name)
);

CREATE INDEX idx_roster_groups_user_id ON roster_groups(user_id);

-- ============================================================================
-- 9. ROSTER_GROUP_MEMBERS TABLE
-- Junction table for roster groups
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
-- Scheduled tee times
-- Relationship: User to TeeTime (Creator) = One to Many
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
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    booking_reference VARCHAR(100),
    estimated_cost DECIMAL(10,2),
    weather_conditions JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES users(id),
    cancel_reason TEXT,
    CONSTRAINT valid_invite_type CHECK (invite_type IN ('roster', 'fcfs', 'open')),
    CONSTRAINT valid_tee_time_status CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    CONSTRAINT valid_holes CHECK (holes IN (9, 18))
);

CREATE INDEX idx_tee_times_creator_id ON tee_times(creator_id);
CREATE INDEX idx_tee_times_date ON tee_times(tee_date);
CREATE INDEX idx_tee_times_status ON tee_times(status);
CREATE INDEX idx_tee_times_upcoming ON tee_times(tee_date, tee_time) WHERE status IN ('pending', 'confirmed');

-- ============================================================================
-- 11. TEE_TIME_PARTICIPANTS TABLE
-- Confirmed participants in a tee time
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
    CONSTRAINT unique_participant_user UNIQUE (tee_time_id, user_id),
    CONSTRAINT unique_participant_phone UNIQUE (tee_time_id, phone),
    CONSTRAINT valid_participant_status CHECK (status IN ('confirmed', 'tentative', 'cancelled'))
);

CREATE INDEX idx_participants_tee_time_id ON tee_time_participants(tee_time_id);
CREATE INDEX idx_participants_user_id ON tee_time_participants(user_id);

-- ============================================================================
-- 12. INVITES TABLE
-- Invitations to tee times
-- Relationship: User to Invite (Creator) = One to Many
-- Relationship: Invite to TeeTime = Many to One
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_invite_status CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'waitlist', 'cancelled'))
);

CREATE INDEX idx_invites_tee_time_id ON invites(tee_time_id);
CREATE INDEX idx_invites_inviter_id ON invites(inviter_id);
CREATE INDEX idx_invites_invitee_user_id ON invites(invitee_user_id);
CREATE INDEX idx_invites_invitee_phone ON invites(invitee_phone);
CREATE INDEX idx_invites_status ON invites(status);
CREATE INDEX idx_invites_pending ON invites(invitee_user_id, status) WHERE status = 'pending';

-- ============================================================================
-- 13. INVITE_RESPONSES TABLE
-- Response history for invites (supports multiple responses)
-- Relationship: User to Invite Response = One to Many
-- Relationship: Invite to Invite Response = One to Many
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
CREATE INDEX idx_invite_responses_created_at ON invite_responses(created_at DESC);


-- ============================================================================
-- 14. LOGIN_LOGS TABLE
-- Authentication attempt logging
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
CREATE INDEX idx_login_logs_phone_number ON login_logs(phone_number);
CREATE INDEX idx_login_logs_status ON login_logs(status);
CREATE INDEX idx_login_logs_attempted_at ON login_logs(attempted_at DESC);

-- ============================================================================
-- 15. ANALYTICS_EVENTS TABLE
-- User activity tracking
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
CREATE INDEX idx_analytics_created_at ON analytics_events(created_at DESC);

-- ============================================================================
-- 16. NOTIFICATIONS TABLE
-- User notifications (push, email, SMS)
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
    CONSTRAINT valid_notification_status CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read', 'cancelled'))
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled_for ON notifications(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- ============================================================================
-- 17. RATE_LIMITS TABLE
-- Rate limiting for API protection
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
CREATE INDEX idx_rate_limits_blocked ON rate_limits(is_blocked, blocked_until) WHERE is_blocked = true;

-- ============================================================================
-- TRIGGERS - Auto-update updated_at timestamps
-- ============================================================================

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roster_updated_at BEFORE UPDATE ON roster
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roster_groups_updated_at BEFORE UPDATE ON roster_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tee_times_updated_at BEFORE UPDATE ON tee_times
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invites_updated_at BEFORE UPDATE ON invites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limits_updated_at BEFORE UPDATE ON rate_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CLEANUP FUNCTION - Remove expired records
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_records()
RETURNS void AS $$
BEGIN
    -- Clean up expired OTPs
    DELETE FROM otp_requests WHERE expires_at < NOW() AND is_verified = false;
    
    -- Clean up expired magic links
    DELETE FROM magic_links WHERE expires_at < NOW() AND is_used = false;
    
    -- Clean up old login logs (keep 90 days)
    DELETE FROM login_logs WHERE attempted_at < NOW() - INTERVAL '90 days';
    
    -- Clean up old analytics (keep 90 days)
    DELETE FROM analytics_events WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Clean up expired sessions
    DELETE FROM sessions WHERE expires_at < NOW() OR (is_active = false AND revoked_at < NOW() - INTERVAL '30 days');
    
    -- Unblock expired rate limits
    UPDATE rate_limits SET is_blocked = false, blocked_until = NULL WHERE blocked_until < NOW();
    
    -- Expire old pending invites (7 days)
    UPDATE invites SET status = 'expired', updated_at = NOW() 
    WHERE status = 'pending' AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tee_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE tee_time_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 18. FRIEND_REQUESTS TABLE - Friend request system
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
CREATE INDEX idx_friend_requests_status ON friend_requests(status);

-- ============================================================================
-- 19. FRIENDSHIPS TABLE - Confirmed friendships (bidirectional)
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
-- 20. GOLF_COURSES TABLE - Golf course database
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
CREATE INDEX idx_golf_courses_google_place ON golf_courses(google_place_id);

-- ============================================================================
-- 21. USER_FAVORITE_COURSES TABLE - User's favorite courses
-- ============================================================================
CREATE TABLE user_favorite_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES golf_courses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_course UNIQUE (user_id, course_id)
);

CREATE INDEX idx_user_favorite_courses_user ON user_favorite_courses(user_id);

-- Triggers for new tables
CREATE TRIGGER update_friend_requests_updated_at BEFORE UPDATE ON friend_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_golf_courses_updated_at BEFORE UPDATE ON golf_courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS for new tables
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorite_courses ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RELATIONSHIP SUMMARY
-- ============================================================================
-- 
-- User to Profile:           One to One    (user_profiles.user_id → users.id)
-- User to Roster:            One to Many   (roster.user_id → users.id)
-- User to Roster Member:     One to Many   (roster.contact_user_id → users.id)
-- User to Invite (Creator):  One to Many   (invites.inviter_id → users.id)
-- User to Invite Response:   One to Many   (invite_responses.user_id → users.id)
-- Invite to Invite Response: One to Many   (invite_responses.invite_id → invites.id)
-- Invite to TeeTime:         Many to One   (invites.tee_time_id → tee_times.id)
-- User to TeeTime (Creator): One to Many   (tee_times.creator_id → users.id)
-- User to Friend Request:    One to Many   (friend_requests.sender_id/receiver_id → users.id)
-- User to Friendship:        Many to Many  (friendships.user_id/friend_id → users.id)
-- User to Favorite Course:   Many to Many  (user_favorite_courses → users.id, golf_courses.id)
-- 
-- ============================================================================

-- ============================================================================
-- SCHEMA CREATION COMPLETE
-- ============================================================================
