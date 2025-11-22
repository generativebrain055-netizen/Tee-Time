-- ============================================================================
-- TeeTime Golf App - Complete Database Schema
-- ============================================================================
-- PostgreSQL 12+ required
-- Features: Users, Sessions, OTP, Magic Links, Devices, Analytics, Notifications
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
-- Stores user account information
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    
    -- User profile
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    
    -- Account status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ,
    
    -- Preferences
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    notification_preferences JSONB DEFAULT '{"email": true, "sms": true, "push": true}'::jsonb,
    
    -- Metadata
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    last_login_device_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- ============================================================================
-- 2. SESSIONS TABLE
-- ============================================================================
-- Stores active user sessions with JWT tokens
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    
    -- Token management
    access_token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL,
    token_family_id UUID DEFAULT uuid_generate_v4(), -- For refresh token rotation
    
    -- Session metadata
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    remember_me BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id), -- Admin who revoked, if applicable
    revoke_reason VARCHAR(255)
);

-- Indexes for sessions table
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_device_id ON sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_sessions_access_token_hash ON sessions(access_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token_hash ON sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_token_family_id ON sessions(token_family_id);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at) WHERE is_active = true;

-- ============================================================================
-- 3. OTP_REQUESTS TABLE
-- ============================================================================
-- Stores OTP verification codes for phone authentication
CREATE TABLE IF NOT EXISTS otp_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- OTP details
    otp_code_hash VARCHAR(255) NOT NULL,
    purpose VARCHAR(50) NOT NULL, -- 'login', 'signup', 'password_reset', 'verification'
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    
    -- Status
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    
    -- Security
    ip_address INET,
    device_fingerprint TEXT,
    
    -- Expiration
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    CONSTRAINT valid_purpose CHECK (purpose IN ('login', 'signup', 'password_reset', 'verification', 'phone_change'))
);

-- Indexes for otp_requests table
CREATE INDEX IF NOT EXISTS idx_otp_phone_number ON otp_requests(phone_number);
CREATE INDEX IF NOT EXISTS idx_otp_user_id ON otp_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp_requests(expires_at) WHERE is_verified = false;
CREATE INDEX IF NOT EXISTS idx_otp_created_at ON otp_requests(created_at DESC);

-- ============================================================================
-- 4. MAGIC_LINKS TABLE
-- ============================================================================
-- Stores magic link tokens for passwordless authentication
CREATE TABLE IF NOT EXISTS magic_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    
    -- Token management
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    purpose VARCHAR(50) NOT NULL, -- 'login', 'signup', 'email_verification', 'password_reset'
    
    -- Usage tracking
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMPTZ,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    
    -- Security
    ip_address INET,
    user_agent TEXT,
    device_fingerprint TEXT,
    
    -- Expiration
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    CONSTRAINT valid_magic_link_purpose CHECK (purpose IN ('login', 'signup', 'email_verification', 'password_reset'))
);

-- Indexes for magic_links table
CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_user_id ON magic_links(user_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_token_hash ON magic_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires_at ON magic_links(expires_at) WHERE is_used = false;

-- ============================================================================
-- 5. DEVICES TABLE
-- ============================================================================
-- Stores device information for multi-device authentication
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Device identification
    device_fingerprint VARCHAR(255) UNIQUE NOT NULL,
    device_name VARCHAR(255),
    device_type VARCHAR(50), -- 'mobile', 'tablet', 'desktop', 'watch'
    
    -- Device details
    os VARCHAR(50),
    os_version VARCHAR(50),
    browser VARCHAR(50),
    browser_version VARCHAR(50),
    app_version VARCHAR(50),
    
    -- Security
    is_trusted BOOLEAN DEFAULT false,
    trusted_at TIMESTAMPTZ,
    is_blocked BOOLEAN DEFAULT false,
    blocked_at TIMESTAMPTZ,
    block_reason VARCHAR(255),
    
    -- Push notifications
    push_token TEXT,
    push_platform VARCHAR(20), -- 'fcm', 'apns'
    
    -- Activity
    last_ip_address INET,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for devices table
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_devices_is_trusted ON devices(is_trusted);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen_at ON devices(last_seen_at DESC);

-- ============================================================================
-- 6. LOGIN_LOGS TABLE
-- ============================================================================
-- Stores all login attempts for security auditing
CREATE TABLE IF NOT EXISTS login_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    phone_number VARCHAR(20),
    email VARCHAR(255),
    
    -- Login attempt details
    login_method VARCHAR(50) NOT NULL, -- 'password', 'otp', 'magic_link', 'social'
    status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'blocked', 'suspicious'
    failure_reason VARCHAR(255),
    
    -- Device and location
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    device_fingerprint TEXT,
    location JSONB, -- {country, city, coordinates}
    
    -- Timestamps
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_login_method CHECK (login_method IN ('password', 'otp', 'magic_link', 'google', 'apple', 'facebook')),
    CONSTRAINT valid_status CHECK (status IN ('success', 'failed', 'blocked', 'suspicious', 'rate_limited'))
);

-- Indexes for login_logs table
CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_phone_number ON login_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_login_logs_status ON login_logs(status);
CREATE INDEX IF NOT EXISTS idx_login_logs_attempted_at ON login_logs(attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_logs_ip_address ON login_logs(ip_address);

-- ============================================================================
-- 7. ANALYTICS_EVENTS TABLE
-- ============================================================================
-- Stores analytics events for tracking user behavior
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    
    -- Event details
    event_name VARCHAR(100) NOT NULL,
    event_category VARCHAR(50), -- 'auth', 'booking', 'payment', 'profile', 'notification'
    event_properties JSONB DEFAULT '{}'::jsonb,
    
    -- Context
    session_id UUID,
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics_events table
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_event_category ON analytics_events(event_category);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON analytics_events(session_id);

-- Partial index for recent events (last 30 days) for faster queries
CREATE INDEX IF NOT EXISTS idx_analytics_recent ON analytics_events(created_at DESC) 
WHERE created_at > NOW() - INTERVAL '30 days';

-- ============================================================================
-- 8. NOTIFICATIONS TABLE
-- ============================================================================
-- Stores notification queue and delivery status
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    
    -- Notification details
    type VARCHAR(50) NOT NULL, -- 'push', 'email', 'sms'
    channel VARCHAR(50), -- 'booking_reminder', 'security_alert', 'promotion'
    title VARCHAR(255),
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    
    -- Delivery
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'read'
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    
    -- Scheduling
    scheduled_for TIMESTAMPTZ,
    
    -- External IDs
    external_id VARCHAR(255), -- ID from push service (FCM, APNS, etc.)
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_notification_type CHECK (type IN ('push', 'email', 'sms')),
    CONSTRAINT valid_notification_status CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read', 'cancelled'))
);

-- Indexes for notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_device_id ON notifications(device_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON notifications(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- 9. RATE_LIMITS TABLE
-- ============================================================================
-- Stores rate limiting counters for various operations
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identifier (can be user_id, phone_number, or ip_address)
    identifier_type VARCHAR(20) NOT NULL, -- 'user', 'phone', 'ip'
    identifier_value VARCHAR(255) NOT NULL,
    
    -- Rate limit details
    action VARCHAR(50) NOT NULL, -- 'login', 'otp_request', 'password_reset', 'signup'
    count INT DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    window_duration_seconds INT NOT NULL, -- e.g., 3600 for 1 hour
    max_attempts INT NOT NULL,
    
    -- Status
    is_blocked BOOLEAN DEFAULT false,
    blocked_until TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(identifier_type, identifier_value, action, window_start),
    CONSTRAINT valid_identifier_type CHECK (identifier_type IN ('user', 'phone', 'ip', 'device'))
);

-- Indexes for rate_limits table
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier_type, identifier_value);
CREATE INDEX IF NOT EXISTS idx_rate_limits_action ON rate_limits(action);
CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked ON rate_limits(is_blocked, blocked_until) WHERE is_blocked = true;
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limits_updated_at BEFORE UPDATE ON rate_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

-- Active users view (last 30 days)
CREATE OR REPLACE VIEW active_users_last_30_days AS
SELECT 
    COUNT(DISTINCT user_id) as active_users,
    DATE(last_login_at) as login_date
FROM users
WHERE last_login_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(last_login_at)
ORDER BY login_date DESC;

-- Login success rate by method
CREATE OR REPLACE VIEW login_success_rate AS
SELECT 
    login_method,
    COUNT(*) FILTER (WHERE status = 'success') as successful_logins,
    COUNT(*) as total_attempts,
    ROUND(
        (COUNT(*) FILTER (WHERE status = 'success')::NUMERIC / NULLIF(COUNT(*), 0) * 100), 
        2
    ) as success_rate_percentage
FROM login_logs
WHERE attempted_at > NOW() - INTERVAL '30 days'
GROUP BY login_method;

-- Device distribution
CREATE OR REPLACE VIEW device_distribution AS
SELECT 
    device_type,
    os,
    COUNT(*) as device_count,
    COUNT(DISTINCT user_id) as unique_users
FROM devices
WHERE is_blocked = false
GROUP BY device_type, os
ORDER BY device_count DESC;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to clean up expired records
CREATE OR REPLACE FUNCTION cleanup_expired_records()
RETURNS void AS $$
BEGIN
    -- Delete expired OTP requests
    DELETE FROM otp_requests 
    WHERE expires_at < NOW() AND is_verified = false;
    
    -- Delete expired magic links
    DELETE FROM magic_links 
    WHERE expires_at < NOW() AND is_used = false;
    
    -- Delete old login logs (keep last 90 days)
    DELETE FROM login_logs 
    WHERE attempted_at < NOW() - INTERVAL '90 days';
    
    -- Delete old analytics events (keep last 90 days)
    DELETE FROM analytics_events 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Delete inactive sessions
    DELETE FROM sessions 
    WHERE expires_at < NOW() OR (is_active = false AND revoked_at < NOW() - INTERVAL '30 days');
    
    -- Reset rate limits after window expires
    UPDATE rate_limits 
    SET is_blocked = false, blocked_until = NULL 
    WHERE blocked_until < NOW();
    
    RAISE NOTICE 'Expired records cleaned up successfully';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANT PERMISSIONS (Adjust based on your setup)
-- ============================================================================

-- Create read-only user for analytics
-- CREATE USER tts_golf_readonly WITH PASSWORD 'your_secure_password';
-- GRANT CONNECT ON DATABASE tts_golf_db TO tts_golf_readonly;
-- GRANT USAGE ON SCHEMA public TO tts_golf_readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO tts_golf_readonly;

-- ============================================================================
-- INITIAL DATA / SEED (Optional)
-- ============================================================================

-- You can add seed data here if needed

-- ============================================================================
-- MAINTENANCE NOTES
-- ============================================================================
-- 1. Run cleanup_expired_records() daily via cron job
-- 2. Monitor table sizes and plan archiving strategy
-- 3. Review and optimize indexes based on query patterns
-- 4. Set up automated backups
-- 5. Enable query logging for slow queries
-- 6. Consider partitioning large tables (login_logs, analytics_events)
-- ============================================================================
