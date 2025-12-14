-- ============================================================================
-- TeeTime Golf App - Friends & Golf Courses Schema
-- ============================================================================

-- ============================================================================
-- 1. FRIEND_REQUESTS TABLE - Friend request system
-- ============================================================================
CREATE TABLE IF NOT EXISTS friend_requests (
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
-- 2. FRIENDSHIPS TABLE - Confirmed friendships (bidirectional)
-- ============================================================================
CREATE TABLE IF NOT EXISTS friendships (
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
-- 3. GOLF_COURSES TABLE - Golf course database
-- ============================================================================
CREATE TABLE IF NOT EXISTS golf_courses (
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
    google_place_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_golf_courses_name ON golf_courses(name);
CREATE INDEX idx_golf_courses_city ON golf_courses(city);
CREATE INDEX idx_golf_courses_location ON golf_courses(latitude, longitude);
CREATE INDEX idx_golf_courses_google_place ON golf_courses(google_place_id);

-- ============================================================================
-- 4. USER_FAVORITE_COURSES TABLE - User's favorite courses
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_favorite_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES golf_courses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_course UNIQUE (user_id, course_id)
);

CREATE INDEX idx_user_favorite_courses_user ON user_favorite_courses(user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE TRIGGER update_friend_requests_updated_at BEFORE UPDATE ON friend_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_golf_courses_updated_at BEFORE UPDATE ON golf_courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorite_courses ENABLE ROW LEVEL SECURITY;
