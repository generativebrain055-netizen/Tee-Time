-- ============================================================================
-- TeeTime Golf App - Complete Database Schema for Supabase
-- ============================================================================
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/jhzwpweidyqrgxpaukhg/sql
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    username VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    handicap INT,
    social_rate DECIMAL(3,2) DEFAULT 5.0,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ,
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    notification_preferences JSONB DEFAULT '{"email": true, "sms": true, "push": true}'::jsonb,
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    last_login_device_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- ============================================================================
-- 2. DEVICES TABLE (Created before sessions to satisfy foreign key)
-- ============================================================================
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    device_type VARCHAR(50),
    os VARCHAR(50),
    os_version VARCHAR(50),
    browser VARCHAR(50),
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
    -- Unique constraint per user and device fingerprint
    CONSTRAINT unique_user_device UNIQUE (user_id, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_devices_is_trusted ON devices(is_trusted);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen_at ON devices(last_seen_at DESC);

-- ============================================================================
-- 3. SESSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
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

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_device_id ON sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_sessions_access_token_hash ON sessions(access_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token_hash ON sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_token_family_id ON sessions(token_family_id);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at) WHERE is_active = true;

-- ============================================================================
-- 4. OTP_REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS otp_requests (
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
    CONSTRAINT valid_purpose CHECK (purpose IN ('login', 'signup', 'password_reset', 'verification', 'phone_change'))
);

CREATE INDEX IF NOT EXISTS idx_otp_phone_number ON otp_requests(phone_number);
CREATE INDEX IF NOT EXISTS idx_otp_user_id ON otp_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp_requests(expires_at) WHERE is_verified = false;
CREATE INDEX IF NOT EXISTS idx_otp_created_at ON otp_requests(created_at DESC);

-- ============================================================================
-- 5. MAGIC_LINKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS magic_links (
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

CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_phone_number ON magic_links(phone_number);
CREATE INDEX IF NOT EXISTS idx_magic_links_user_id ON magic_links(user_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_token_hash ON magic_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires_at ON magic_links(expires_at) WHERE is_used = false;

-- ============================================================================
-- 6. LOGIN_LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS login_logs (
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
    CONSTRAINT valid_status CHECK (status IN ('success', 'failed', 'blocked', 'suspicious', 'rate_limited'))
);

CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_phone_number ON login_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_login_logs_status ON login_logs(status);
CREATE INDEX IF NOT EXISTS idx_login_logs_attempted_at ON login_logs(attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_logs_ip_address ON login_logs(ip_address);

-- ============================================================================
-- 7. ANALYTICS_EVENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_events (
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

CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_event_category ON analytics_events(event_category);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON analytics_events(session_id);

-- ============================================================================
-- 8. NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    channel VARCHAR(50),
    title VARCHAR(255),
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
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
    CONSTRAINT valid_notification_type CHECK (type IN ('push', 'email', 'sms')),
    CONSTRAINT valid_notification_status CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_device_id ON notifications(device_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON notifications(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- 9. RATE_LIMITS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS rate_limits (
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

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier_type, identifier_value);
CREATE INDEX IF NOT EXISTS idx_rate_limits_action ON rate_limits(action);
CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked ON rate_limits(is_blocked, blocked_until) WHERE is_blocked = true;

-- ============================================================================
-- TRIGGERS - Update updated_at automatically
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_devices_updated_at ON devices;
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rate_limits_updated_at ON rate_limits;
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
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Enable Row Level Security (RLS) for Supabase
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DONE! Schema created successfully
-- ============================================================================
