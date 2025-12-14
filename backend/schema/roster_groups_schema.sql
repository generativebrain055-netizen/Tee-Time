-- ============================================================================
-- TeeTime Golf App - Enhanced Roster Groups Schema
-- ============================================================================

-- Add new columns to roster table for enhanced functionality
ALTER TABLE roster ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES roster_groups(id) ON DELETE SET NULL;
ALTER TABLE roster ADD COLUMN IF NOT EXISTS social_rate DECIMAL(3,2);
ALTER TABLE roster ADD COLUMN IF NOT EXISTS distance_to_course DECIMAL(5,2);
ALTER TABLE roster ADD COLUMN IF NOT EXISTS club_membership VARCHAR(255);
ALTER TABLE roster ADD COLUMN IF NOT EXISTS last_played_together TIMESTAMPTZ;
ALTER TABLE roster ADD COLUMN IF NOT EXISTS times_played_together INT DEFAULT 0;
ALTER TABLE roster ADD COLUMN IF NOT EXISTS invite_acceptance_rate DECIMAL(3,2);

-- Create index for group lookups
CREATE INDEX IF NOT EXISTS idx_roster_group_id ON roster(group_id);

-- Add columns to roster_groups for enhanced functionality
ALTER TABLE roster_groups ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE roster_groups ADD COLUMN IF NOT EXISTS auto_invite BOOLEAN DEFAULT true;
ALTER TABLE roster_groups ADD COLUMN IF NOT EXISTS max_members INT DEFAULT 20;

-- ============================================================================
-- ROSTER MEMBER HISTORY TABLE - Track playing history
-- ============================================================================
CREATE TABLE IF NOT EXISTS roster_member_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roster_id UUID NOT NULL REFERENCES roster(id) ON DELETE CASCADE,
    tee_time_id UUID REFERENCES tee_times(id) ON DELETE SET NULL,
    invite_status VARCHAR(20),
    played_together BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roster_member_history_roster ON roster_member_history(roster_id);
CREATE INDEX IF NOT EXISTS idx_roster_member_history_tee_time ON roster_member_history(tee_time_id);

-- ============================================================================
-- WAIVER WIRE TABLE - Available players looking for games
-- ============================================================================
CREATE TABLE IF NOT EXISTS waiver_wire (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    available_date DATE NOT NULL,
    preferred_time VARCHAR(50),
    preferred_course VARCHAR(255),
    max_handicap INT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    CONSTRAINT unique_waiver_date UNIQUE (user_id, available_date)
);

CREATE INDEX IF NOT EXISTS idx_waiver_wire_date ON waiver_wire(available_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_waiver_wire_user ON waiver_wire(user_id);

-- Enable RLS
ALTER TABLE roster_member_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiver_wire ENABLE ROW LEVEL SECURITY;
