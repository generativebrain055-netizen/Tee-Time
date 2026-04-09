-- Optional file attachment (non-image documents) on chat messages
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS file_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS file_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS file_mime TEXT DEFAULT NULL;

COMMENT ON COLUMN messages.file_url IS 'Public URL of file attachment (Supabase Storage)';
COMMENT ON COLUMN messages.file_name IS 'Original file name for download/display';
COMMENT ON COLUMN messages.file_mime IS 'MIME type of the attachment';
