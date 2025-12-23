-- Add check_in_reminder_sent column to tee_times table
-- Run this migration to track which tee times have had reminders sent

ALTER TABLE tee_times 
ADD COLUMN IF NOT EXISTS check_in_reminder_sent BOOLEAN DEFAULT false;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_tee_times_reminder_sent 
ON tee_times(check_in_reminder_sent) 
WHERE check_in_reminder_sent = false;
