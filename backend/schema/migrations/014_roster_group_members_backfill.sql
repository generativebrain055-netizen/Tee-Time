-- Idempotent backfill: legacy roster.group_id rows into roster_group_members
-- so junction matches display hint for existing data (reads already merge both).
INSERT INTO roster_group_members (group_id, roster_id)
SELECT r.group_id, r.id
FROM roster r
WHERE r.group_id IS NOT NULL
ON CONFLICT (group_id, roster_id) DO NOTHING;
