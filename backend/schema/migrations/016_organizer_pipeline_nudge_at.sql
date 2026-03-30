-- Throttle organizer "invite more" nudges when pipeline < open spots
ALTER TABLE tee_times
  ADD COLUMN IF NOT EXISTS organizer_pipeline_nudge_at TIMESTAMPTZ;

COMMENT ON COLUMN tee_times.organizer_pipeline_nudge_at IS 'Last time organizer was nudged to invite more players when invite pipeline was shorter than open spots';
