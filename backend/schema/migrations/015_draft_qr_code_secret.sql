-- Persist the raw QR secret so GET /api/draft/qr can return the same payload without
-- revoking the active code (previous logic regenerated on every fetch).
ALTER TABLE draft_qr_codes
  ADD COLUMN IF NOT EXISTS code_secret VARCHAR(64);

COMMENT ON COLUMN draft_qr_codes.code_secret IS 'Raw 32-char hex token; hash stored in code_hash for validation';
