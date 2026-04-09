-- Non-image file attachments for chat (public URL + metadata; see chatFileUploadService)
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS file_url TEXT DEFAULT NULL;

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS file_name TEXT DEFAULT NULL;

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS file_mime TEXT DEFAULT NULL;

COMMENT ON COLUMN messages.file_url IS 'Public URL of file attachment (e.g. Supabase Storage)';
COMMENT ON COLUMN messages.file_name IS 'Original file name for display/download';
COMMENT ON COLUMN messages.file_mime IS 'MIME type of attached file';
