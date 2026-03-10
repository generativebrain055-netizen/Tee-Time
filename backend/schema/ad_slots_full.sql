-- Ad slots: 4 fixed placements (image + description + url per ad)
-- Schema: id, slot_key, display_name, slot_type, image_url, link_url, alt_text, active, sort_order, created_at, updated_at
-- Pages: Sign up/Sign in, Chatting, Tee time type selection, Calendar view

-- Upsert the 4 slots (insert or update by slot_key)
INSERT INTO ad_slots (slot_key, display_name, slot_type, image_url, link_url, alt_text, active, sort_order)
VALUES
    ('loading_screen', 'Sign up / Sign in page', 'loading_screen', NULL, NULL, NULL, true, 1),
    ('banner_1', 'Chatting page', 'banner', NULL, NULL, NULL, true, 2),
    ('banner_2', 'Tee time type selection (tee time creating)', 'banner', NULL, NULL, NULL, true, 3),
    ('banner_3', 'Calendar view page', 'banner', NULL, NULL, NULL, true, 4)
ON CONFLICT (slot_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    slot_type = EXCLUDED.slot_type,
    alt_text = EXCLUDED.alt_text,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();
