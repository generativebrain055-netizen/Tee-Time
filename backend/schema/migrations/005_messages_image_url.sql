-- Add optional image_url to messages for chat image support
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;

COMMENT ON COLUMN messages.image_url IS 'Public URL of image attachment (e.g. Supabase Storage)';
