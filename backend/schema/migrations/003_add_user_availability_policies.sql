-- ============================================================================
-- Migration: Add User Availability RLS Policies
-- Description: Adds RLS policies for user_availability table
-- Date: 2026-02-08
-- Note: Table already exists in unified_schema.sql, this adds missing policies
-- ============================================================================

-- RLS Policies for user_availability
-- Users can view their own availability
CREATE POLICY IF NOT EXISTS user_availability_select_own ON user_availability
    FOR SELECT
    USING (user_id = auth.uid());

-- Users can insert their own availability
CREATE POLICY IF NOT EXISTS user_availability_insert_own ON user_availability
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own availability
CREATE POLICY IF NOT EXISTS user_availability_update_own ON user_availability
    FOR UPDATE
    USING (user_id = auth.uid());

-- Users can delete their own availability
CREATE POLICY IF NOT EXISTS user_availability_delete_own ON user_availability
    FOR DELETE
    USING (user_id = auth.uid());

-- Allow users to view availability of their friends (for matching)
-- This requires a friends table relationship
CREATE POLICY IF NOT EXISTS user_availability_select_friends ON user_availability
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM friends 
            WHERE (
                (friends.user_id = auth.uid() AND friends.friend_id = user_availability.user_id)
                OR
                (friends.friend_id = auth.uid() AND friends.user_id = user_availability.user_id)
            )
            AND friends.status = 'accepted'
        )
    );
