-- Add zip_code column to user_profiles for onboarding
-- Run this in Supabase SQL Editor

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);

COMMENT ON COLUMN user_profiles.zip_code IS 'User zip/postal code from onboarding';
