-- Add 'cancellation_confirmed' to valid reasons in social_rate_logs table
-- Run this migration to allow the new penalty type

ALTER TABLE social_rate_logs 
DROP CONSTRAINT IF EXISTS valid_social_rate_reason;

ALTER TABLE social_rate_logs 
ADD CONSTRAINT valid_social_rate_reason CHECK (reason IN (
    'invite_accepted',
    'invite_declined_late',
    'cancellation_late',
    'cancellation_confirmed',
    'no_show',
    'initial_score',
    'admin_adjustment'
));
