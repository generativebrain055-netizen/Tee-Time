-- Allow slot_type 'loading_screen' and 'banner' so updates/upserts for loading_screen slot succeed.
-- If the DB has valid_slot_type allowing only 'banner', replace it with this.

ALTER TABLE ad_slots DROP CONSTRAINT IF EXISTS valid_slot_type;

ALTER TABLE ad_slots ADD CONSTRAINT valid_slot_type
  CHECK (slot_type IS NULL OR slot_type IN ('loading_screen', 'banner'));
