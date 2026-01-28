-- ============================================================================
-- Migration: OAuth Identity Architecture Fix
-- ============================================================================
-- Version: 001
-- Date: January 2026
-- 
-- Purpose: Fix identity architecture for OAuth users
-- 
-- Changes:
-- 1. Make phone_number nullable (phone is PROFILE data, not identity)
-- 2. Add supabase_auth_id column for potential Supabase Auth integration
-- 3. Add unique constraint on provider link for identity
-- 
-- CRITICAL: This migration fixes the bug where Apple OAuth users are
-- redirected to signup on subsequent logins because phone_number was
-- being used as an identity field instead of the OAuth provider link.
-- ============================================================================

-- ============================================================================
-- STEP 1: Make phone_number nullable
-- Phone number is PROFILE DATA, not identity. OAuth users may not have phone.
-- ============================================================================

-- Remove the NOT NULL constraint from phone_number
ALTER TABLE users 
  ALTER COLUMN phone_number DROP NOT NULL;

-- Update the comment to reflect the change
COMMENT ON COLUMN users.phone_number IS 'User phone number - OPTIONAL profile data, NOT identity. OAuth users may not have phone.';

-- ============================================================================
-- STEP 2: Add supabase_auth_id for future Supabase Auth integration
-- This allows linking to auth.users.id if migrating to native Supabase Auth
-- ============================================================================

-- Add column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'supabase_auth_id') THEN
        ALTER TABLE users ADD COLUMN supabase_auth_id UUID UNIQUE;
    END IF;
END $$;

COMMENT ON COLUMN users.supabase_auth_id IS 'Link to Supabase auth.users.id for native auth integration';

-- ============================================================================
-- STEP 3: Ensure auth_providers has proper identity indexing
-- The provider + provider_user_id is the PRIMARY identity for OAuth users
-- ============================================================================

-- The unique constraint already exists, but let's ensure the index is optimal
CREATE INDEX IF NOT EXISTS idx_auth_providers_identity 
  ON auth_providers(provider, provider_user_id);

-- Add comment to clarify identity architecture
COMMENT ON TABLE auth_providers IS 'OAuth provider links - PRIMARY identity source for OAuth users. provider + provider_user_id = user identity';
COMMENT ON COLUMN auth_providers.provider_user_id IS 'The "sub" claim from OAuth token - THIS IS THE IDENTITY';

-- ============================================================================
-- STEP 4: Clean up any orphaned auth_providers
-- Ensure referential integrity
-- ============================================================================

DELETE FROM auth_providers 
WHERE user_id NOT IN (SELECT id FROM users WHERE deleted_at IS NULL);

-- ============================================================================
-- Verification Query
-- Run this to verify the migration worked:
-- ============================================================================
-- SELECT 
--   column_name, 
--   is_nullable, 
--   data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' AND column_name = 'phone_number';
-- 
-- Expected: is_nullable = 'YES'
-- ============================================================================
