-- ============================================================================
-- TeeTime Golf App - Complete Database Schema
-- ============================================================================
-- Version: 2.1
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

-- ============================================================================
-- 2. USER_PROFILES TABLE
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
    driver VARCHAR(100),
    irons VARCHAR(100),
    putter VARCHAR(100),
    ball VARCHAR(100),
    preferred_tee_time VARCHAR(50),
    walk_or_ride VARCHAR(20) DEFAULT 'ride',
    playing_partner_preference VARCHAR(100),
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
-- 7. ROSTER_GROUPS TABLE (must be before roster for FK)
-- ============================================================================
CREATE TABLE roster_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#5DB075',
    icon VARCHAR(50),
    position INT DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    auto_invite BOOLEAN DEFAULT true,
    max_members INT DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_group_name UNIQUE (user_id, name)
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
    response_window INT DEFAULT 2, -- hours for roster invites
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
    CONSTRAINT valid_invite_type CHECK (invite_type IN ('roster', 'fcfs', 'open', 'manual')),
    CONSTRAINT valid_tee_time_status CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    CONSTRAINT valid_holes CHECK (holes IN (9, 18))
);

CREATE INDEX idx_tee_times_creator_id ON tee_times(creator_id);
CREATE INDEX idx_tee_times_date ON tee_times(tee_date);
CREATE INDEX idx_tee_times_status ON tee_times(status);
CREATE INDEX idx_tee_times_upcoming ON tee_times(tee_date, tee_time) WHERE status IN ('pending', 'confirmed');

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
    CONSTRAINT unique_participant_user UNIQUE (tee_time_id, user_id),
    CONSTRAINT unique_participant_phone UNIQUE (tee_time_id, phone),
    CONSTRAINT valid_participant_status CHECK (status IN ('confirmed', 'tentative', 'cancelled'))
);

CREATE INDEX idx_participants_tee_time_id ON tee_time_participants(tee_time_id);
CREATE INDEX idx_participants_user_id ON tee_time_participants(user_id);

-- ============================================================================
-- 12. INVITES TABLE
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
CREATE INDEX idx_invites_status ON invites(status);
CREATE INDEX idx_invites_pending ON invites(invitee_user_id, status) WHERE status = 'pending';
CREATE INDEX idx_invites_expires ON invites(expires_at) WHERE status = 'pending' AND expires_at IS NOT NULL;

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
-- 14. FRIEND_REQUESTS TABLE
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
-- 15. FRIENDSHIPS TABLE
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
-- 16. GOLF_COURSES TABLE
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
-- 17. USER_FAVORITE_COURSES TABLE
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
-- 18. ROSTER_MEMBER_HISTORY TABLE
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
-- 19. WAIVER_WIRE TABLE
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
-- 20. LOGIN_LOGS TABLE
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
-- 21. NOTIFICATIONS TABLE
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

-- ============================================================================
-- 22. ANALYTICS_EVENTS TABLE
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
-- 23. RATE_LIMITS TABLE
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
-- TRIGGERS
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

CREATE TRIGGER update_friend_requests_updated_at BEFORE UPDATE ON friend_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_golf_courses_updated_at BEFORE UPDATE ON golf_courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limits_updated_at BEFORE UPDATE ON rate_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CLEANUP FUNCTION
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
-- ROW LEVEL SECURITY
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
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorite_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_member_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiver_wire ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
