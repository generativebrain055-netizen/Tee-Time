-- Allow system messages (e.g. Tee Time Social welcome) with no user sender.
-- Required for auto welcome message in tee time group chats.
-- Run in Supabase SQL editor or your migration runner:
--   ALTER TABLE messages ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE messages
  ALTER COLUMN sender_id DROP NOT NULL;
