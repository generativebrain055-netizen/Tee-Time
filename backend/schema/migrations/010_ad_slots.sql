-- Ad slots: 4 fixed placements (1 loading-screen sponsorship, 3 banner slots) for admin-managed ads
CREATE TABLE IF NOT EXISTS ad_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    image_url TEXT,
    link_url TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_slot_key CHECK (slot_key IN ('loading_screen', 'banner_1', 'banner_2', 'banner_3'))
);

CREATE INDEX IF NOT EXISTS idx_ad_slots_slot_key ON ad_slots(slot_key);
CREATE INDEX IF NOT EXISTS idx_ad_slots_active ON ad_slots(active) WHERE active = true;

COMMENT ON TABLE ad_slots IS 'Fixed ad placements: loading_screen (sponsorship), banner_1–3 for key app pages';

-- Seed the 4 slots (idempotent: only insert if missing)
INSERT INTO ad_slots (slot_key, label, sort_order)
VALUES
    ('loading_screen', 'Loading screen sponsorship', 1),
    ('banner_1', 'Banner slot 1 (e.g. Home)', 2),
    ('banner_2', 'Banner slot 2 (e.g. Calendar)', 3),
    ('banner_3', 'Banner slot 3 (e.g. Create tee time)', 4)
ON CONFLICT (slot_key) DO NOTHING;
