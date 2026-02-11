-- ============================================================================
-- Migration: Add zip_code column to user_profiles
-- Description: Adds zip_code field for onboarding location data
-- Date: 2026-02-08
-- ============================================================================

-- Add zip_code column to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);

-- Add comment
COMMENT ON COLUMN user_profiles.zip_code IS 'User zip/postal code from onboarding';
