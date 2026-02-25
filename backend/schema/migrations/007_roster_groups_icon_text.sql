-- Allow long avatar/icon URLs for roster_groups (e.g. from upload-avatar)
-- VARCHAR(50) is too short for Supabase/storage URLs
ALTER TABLE roster_groups
  ALTER COLUMN icon TYPE TEXT;
