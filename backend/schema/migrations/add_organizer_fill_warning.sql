-- Migration: Add organizer_fill_warning_sent column to tee_times
-- This tracks whether the organizer has been notified about unfilled spots BEFORE deadline expires
-- Date: 2026-01-13

-- Add the new column
ALTER TABLE tee_times 
ADD COLUMN IF NOT EXISTS organizer_fill_warning_sent BOOLEAN DEFAULT false;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_tee_times_organizer_fill_warning 
ON tee_times(organizer_fill_warning_sent) 
WHERE organizer_fill_warning_sent = false AND status IN ('pending', 'confirmed');

-- Update any existing tee times that are past their deadline to true (avoid re-notifying)
UPDATE tee_times 
SET organizer_fill_warning_sent = true 
WHERE status IN ('completed', 'cancelled');

COMMENT ON COLUMN tee_times.organizer_fill_warning_sent IS 
'Tracks if organizer was notified about unfilled spots before response deadline expires';
