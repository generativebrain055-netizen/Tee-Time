-- Add metadata column to magic_links table for storing user signup data
-- Run this migration to update existing database

-- Add metadata column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'magic_links' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE magic_links ADD COLUMN metadata JSONB;
    END IF;
END $$;

-- Add phone_number column if it doesn't exist  
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'magic_links' AND column_name = 'phone_number'
    ) THEN
        ALTER TABLE magic_links ADD COLUMN phone_number VARCHAR(20);
    END IF;
END $$;

-- Add token_hash column if it doesn't exist (for new hashing approach)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'magic_links' AND column_name = 'token_hash'
    ) THEN
        ALTER TABLE magic_links ADD COLUMN token_hash VARCHAR(255);
    END IF;
END $$;

-- Add is_used column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'magic_links' AND column_name = 'is_used'
    ) THEN
        ALTER TABLE magic_links ADD COLUMN is_used BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add attempts column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'magic_links' AND column_name = 'attempts'
    ) THEN
        ALTER TABLE magic_links ADD COLUMN attempts INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add max_attempts column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'magic_links' AND column_name = 'max_attempts'
    ) THEN
        ALTER TABLE magic_links ADD COLUMN max_attempts INTEGER DEFAULT 3;
    END IF;
END $$;

-- Add ip_address column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'magic_links' AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE magic_links ADD COLUMN ip_address VARCHAR(45);
    END IF;
END $$;

-- Add user_agent column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'magic_links' AND column_name = 'user_agent'
    ) THEN
        ALTER TABLE magic_links ADD COLUMN user_agent TEXT;
    END IF;
END $$;

-- Add device_fingerprint column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'magic_links' AND column_name = 'device_fingerprint'
    ) THEN
        ALTER TABLE magic_links ADD COLUMN device_fingerprint VARCHAR(255);
    END IF;
END $$;

-- Make email nullable (for SMS magic links)
ALTER TABLE magic_links ALTER COLUMN email DROP NOT NULL;

-- Create index on phone_number
CREATE INDEX IF NOT EXISTS idx_magic_links_phone ON magic_links(phone_number);

-- Create index on token_hash
CREATE INDEX IF NOT EXISTS idx_magic_links_token_hash ON magic_links(token_hash);

COMMENT ON COLUMN magic_links.metadata IS 'JSON data containing user signup info for SMS magic links';
COMMENT ON COLUMN magic_links.phone_number IS 'Phone number for SMS magic links';
