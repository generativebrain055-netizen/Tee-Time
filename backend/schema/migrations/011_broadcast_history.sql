-- Store admin broadcast push history for display on Broadcast page.
CREATE TABLE IF NOT EXISTS broadcast_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    sent INT NOT NULL DEFAULT 0,
    failed INT NOT NULL DEFAULT 0,
    total INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_history_created_at ON broadcast_history(created_at DESC);

COMMENT ON TABLE broadcast_history IS 'Admin broadcast push notifications sent to all users (for history UI).';
