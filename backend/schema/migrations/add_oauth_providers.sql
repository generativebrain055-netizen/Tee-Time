-- ============================================================================
-- OAuth Providers Migration
-- ============================================================================
-- Adds auth_providers table for multi-provider authentication
-- Allows users to link multiple OAuth providers (Google, Apple, etc.)
-- ============================================================================

-- Create auth_providers table
CREATE TABLE IF NOT EXISTS auth_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255),
    provider_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_provider CHECK (provider IN ('google', 'apple', 'facebook', 'twitter')),
    CONSTRAINT unique_provider_user UNIQUE (provider, provider_user_id)
);

-- Create indexes
CREATE INDEX idx_auth_providers_user_id ON auth_providers(user_id);
CREATE INDEX idx_auth_providers_provider ON auth_providers(provider);
CREATE INDEX idx_auth_providers_provider_user_id ON auth_providers(provider, provider_user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_auth_providers_updated_at 
    BEFORE UPDATE ON auth_providers
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE auth_providers ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE auth_providers IS 'Links users to external OAuth providers (Google, Apple, etc.)';
COMMENT ON COLUMN auth_providers.provider_user_id IS 'The "sub" or unique ID from the OAuth provider';
COMMENT ON COLUMN auth_providers.provider_data IS 'Additional provider-specific data (name, picture, etc.)';
