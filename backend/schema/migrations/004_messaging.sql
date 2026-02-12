-- ============================================================================
-- Messaging: conversations, participants, messages
-- Run after unified_schema (requires users, roster_groups, tee_times).
-- ============================================================================

-- Conversations: direct (1:1), tee_time, or group
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL DEFAULT 'direct'
        CHECK (type IN ('direct', 'tee_time', 'group')),
    tee_time_id UUID REFERENCES tee_times(id) ON DELETE CASCADE,
    roster_group_id UUID REFERENCES roster_groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT conversation_ref_check CHECK (
        (type = 'direct' AND tee_time_id IS NULL AND roster_group_id IS NULL) OR
        (type = 'tee_time' AND tee_time_id IS NOT NULL AND roster_group_id IS NULL) OR
        (type = 'group' AND roster_group_id IS NOT NULL AND tee_time_id IS NULL)
    )
);

CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_tee_time_id ON conversations(tee_time_id) WHERE tee_time_id IS NOT NULL;
CREATE INDEX idx_conversations_roster_group_id ON conversations(roster_group_id) WHERE roster_group_id IS NOT NULL;

-- Participants in a conversation
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ,
    UNIQUE (conversation_id, user_id)
);

CREATE INDEX idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(conversation_id, created_at DESC);

-- Optional: read receipts per message per user (for "read" indicators)
CREATE TABLE IF NOT EXISTS message_read_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (message_id, user_id)
);

CREATE INDEX idx_message_read_receipts_message ON message_read_receipts(message_id);
CREATE INDEX idx_message_read_receipts_user ON message_read_receipts(user_id);
