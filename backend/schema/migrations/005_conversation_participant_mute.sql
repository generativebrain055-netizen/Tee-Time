-- Per-user mute for a conversation (suppresses unread in totals; chat still visible in list).
-- MERGED INTO: backend/schema/unified_schema.sql (v6.0+; conversation_participants.is_muted)
ALTER TABLE conversation_participants
  ADD COLUMN IF NOT EXISTS is_muted BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN conversation_participants.is_muted IS 'When true, user chose Mute; unread counts exclude this conversation.';
