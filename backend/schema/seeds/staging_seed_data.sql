-- ============================================================================
-- STAGING SEED DATA - For UAT/Review Only
-- ============================================================================
-- Run this ONLY in staging. Populates test users, tee times, roster, groups,
-- waiver wire, messages, and notifications so all screens render meaningfully.
--
-- Prerequisites: Run unified_schema.sql (or migrations) first.
-- Auth: Create matching Supabase Auth users for these emails, or use your
--       app's sign-up with the test emails and then run this seed to add
--       profile/roster/tee time data. Alternatively, backend may create
--       public.users on first login — then run this seed and update
--       the user IDs in the seed to match your Auth-created users.
-- ============================================================================
-- Fixed UUIDs used below (replace in DB or Auth if you need to link to real auth users).
-- ============================================================================

-- ============================================================================
-- 1. TEST USERS
-- ============================================================================
INSERT INTO users (id, phone_number, email, first_name, last_name, username, is_active, is_verified, onboarding_completed, profile_completed, availability_completed, created_at, updated_at)
VALUES
  ('a0000001-0001-4000-8000-000000000001', '+15550001001', 'alex.reviewer@example.com', 'Alex', 'Reviewer', 'alex_reviewer', true, true, true, true, true, NOW(), NOW()),
  ('a0000002-0002-4000-8000-000000000002', '+15550001002', 'jordan.smith@example.com', 'Jordan', 'Smith', 'jordan_smith', true, true, true, true, true, NOW(), NOW()),
  ('a0000003-0003-4000-8000-000000000003', '+15550001003', 'casey.jones@example.com', 'Casey', 'Jones', 'casey_jones', true, true, true, true, true, NOW(), NOW()),
  ('a0000004-0004-4000-8000-000000000004', '+15550001004', 'riley.williams@example.com', 'Riley', 'Williams', 'riley_williams', true, true, true, true, true, NOW(), NOW()),
  ('a0000005-0005-4000-8000-000000000005', '+15550001005', 'morgan.brown@example.com', 'Morgan', 'Brown', 'morgan_brown', true, true, true, true, true, NOW(), NOW()),
  ('a0000006-0006-4000-8000-000000000006', '+15550001006', 'sam.taylor@example.com', 'Sam', 'Taylor', 'sam_taylor', true, true, true, true, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. USER PROFILES (handicap, location, club, zip)
-- ============================================================================
INSERT INTO user_profiles (user_id, handicap, social_rate, location, home_course, zip_code, walk_or_ride, rounds_played, average_score, clubs, created_at, updated_at)
VALUES
  ('a0000001-0001-4000-8000-000000000001', 12.5, 85, 'San Diego, CA', 'Torrey Pines', '92101', 'ride', 24, 88.0, '[{"name": "Torrey Pines Golf Club", "location": "San Diego"}]'::jsonb, NOW(), NOW()),
  ('a0000002-0002-4000-8000-000000000002', 8.0, 92, 'La Jolla, CA', 'La Jolla Country Club', '92037', 'walk', 36, 82.0, '[{"name": "La Jolla CC", "location": "La Jolla"}]'::jsonb, NOW(), NOW()),
  ('a0000003-0003-4000-8000-000000000003', 18.2, 78, 'Carlsbad, CA', 'The Crossings', '92008', 'ride', 12, 94.0, '[]'::jsonb, NOW(), NOW()),
  ('a0000004-0004-4000-8000-000000000004', 14.0, 82, 'Encinitas, CA', 'Encinitas Ranch', '92024', 'either', 18, 90.0, '[]'::jsonb, NOW(), NOW()),
  ('a0000005-0005-4000-8000-000000000005', 22.0, 70, 'Oceanside, CA', 'Arrowood Golf', '92056', 'ride', 8, 98.0, '[]'::jsonb, NOW(), NOW()),
  ('a0000006-0006-4000-8000-000000000006', 10.5, 88, 'Del Mar, CA', 'Del Mar Country Club', '92014', 'walk', 30, 85.0, '[{"name": "Del Mar CC", "location": "Del Mar"}]'::jsonb, NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET
  handicap = EXCLUDED.handicap,
  location = EXCLUDED.location,
  home_course = EXCLUDED.home_course,
  zip_code = EXCLUDED.zip_code,
  updated_at = NOW();

-- ============================================================================
-- 3. ROSTER GROUPS (for primary user u1)
-- ============================================================================
INSERT INTO roster_groups (id, user_id, name, description, color, position, auto_invite, max_members, created_at, updated_at)
VALUES
  ('b0000001-0001-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001', 'Weekend Crew', 'Saturday morning regulars', '#5EBC68', 0, true, 8, NOW(), NOW()),
  ('b0000002-0002-4000-8000-000000000002', 'a0000001-0001-4000-8000-000000000001', 'Work League', 'Tuesday league', '#2563EB', 1, true, 12, NOW(), NOW())
ON CONFLICT (user_id, name) DO NOTHING;

-- ============================================================================
-- 4. ROSTER (u1's contacts: u2,u3,u4 in group; u2 on-deck; u5,u6 in roster)
-- ============================================================================
INSERT INTO roster (id, user_id, contact_user_id, contact_name, group_id, position, is_on_deck, created_at, updated_at)
VALUES
  ('c0000001-0001-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001', 'a0000002-0002-4000-8000-000000000002', 'Jordan Smith', 'b0000001-0001-4000-8000-000000000001', 0, true, NOW(), NOW()),
  ('c0000002-0002-4000-8000-000000000002', 'a0000001-0001-4000-8000-000000000001', 'a0000003-0003-4000-8000-000000000003', 'Casey Jones', 'b0000001-0001-4000-8000-000000000001', 1, false, NOW(), NOW()),
  ('c0000003-0003-4000-8000-000000000003', 'a0000001-0001-4000-8000-000000000001', 'a0000004-0004-4000-8000-000000000004', 'Riley Williams', 'b0000001-0001-4000-8000-000000000001', 2, false, NOW(), NOW()),
  ('c0000004-0004-4000-8000-000000000004', 'a0000001-0001-4000-8000-000000000001', 'a0000005-0005-4000-8000-000000000005', 'Morgan Brown', NULL, 3, false, NOW(), NOW()),
  ('c0000005-0005-4000-8000-000000000005', 'a0000001-0001-4000-8000-000000000001', 'a0000006-0006-4000-8000-000000000006', 'Sam Taylor', 'b0000002-0002-4000-8000-000000000002', 4, false, NOW(), NOW())
ON CONFLICT (user_id, contact_user_id) DO NOTHING;

-- ============================================================================
-- 5. FRIENDSHIPS (so roster/friends screens show connections)
-- ============================================================================
INSERT INTO friendships (user_id, friend_id)
VALUES
  ('a0000001-0001-4000-8000-000000000001', 'a0000002-0002-4000-8000-000000000002'),
  ('a0000002-0002-4000-8000-000000000002', 'a0000001-0001-4000-8000-000000000001'),
  ('a0000001-0001-4000-8000-000000000001', 'a0000003-0003-4000-8000-000000000003'),
  ('a0000003-0003-4000-8000-000000000003', 'a0000001-0001-4000-8000-000000000001'),
  ('a0000001-0001-4000-8000-000000000001', 'a0000004-0004-4000-8000-000000000004'),
  ('a0000004-0004-4000-8000-000000000004', 'a0000001-0001-4000-8000-000000000001'),
  ('a0000001-0001-4000-8000-000000000001', 'a0000005-0005-4000-8000-000000000005'),
  ('a0000005-0005-4000-8000-000000000005', 'a0000001-0001-4000-8000-000000000001'),
  ('a0000002-0002-4000-8000-000000000002', 'a0000003-0003-4000-8000-000000000003'),
  ('a0000003-0003-4000-8000-000000000003', 'a0000002-0002-4000-8000-000000000002')
ON CONFLICT (user_id, friend_id) DO NOTHING;

-- ============================================================================
-- 6. TEE TIMES (pending, confirmed, completed)
-- ============================================================================
INSERT INTO tee_times (id, creator_id, course_name, course_location, tee_date, tee_time, holes, max_players, invite_type, status, created_at, updated_at)
VALUES
  -- Pending (upcoming)
  ('d0000001-0001-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001', 'Torrey Pines South', 'San Diego, CA', (CURRENT_DATE + INTERVAL '7 days')::date, '07:30', 18, 4, 'roster', 'pending', NOW(), NOW()),
  -- Confirmed (upcoming)
  ('d0000002-0002-4000-8000-000000000002', 'a0000001-0001-4000-8000-000000000001', 'Balboa Park', 'San Diego, CA', (CURRENT_DATE + INTERVAL '14 days')::date, '08:00', 18, 4, 'roster', 'confirmed', NOW(), NOW()),
  -- Completed (past)
  ('d0000003-0003-4000-8000-000000000003', 'a0000001-0001-4000-8000-000000000001', 'Encinitas Ranch', 'Encinitas, CA', (CURRENT_DATE - INTERVAL '7 days')::date, '09:00', 18, 4, 'roster', 'completed', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. TEE TIME PARTICIPANTS
-- ============================================================================
INSERT INTO tee_time_participants (tee_time_id, user_id, position, is_creator, status)
VALUES
  ('d0000001-0001-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001', 0, true, 'confirmed'),
  ('d0000001-0001-4000-8000-000000000001', 'a0000002-0002-4000-8000-000000000002', 1, false, 'confirmed'),
  ('d0000002-0002-4000-8000-000000000002', 'a0000001-0001-4000-8000-000000000001', 0, true, 'confirmed'),
  ('d0000002-0002-4000-8000-000000000002', 'a0000002-0002-4000-8000-000000000002', 1, false, 'confirmed'),
  ('d0000002-0002-4000-8000-000000000002', 'a0000003-0003-4000-8000-000000000003', 2, false, 'confirmed'),
  ('d0000003-0003-4000-8000-000000000003', 'a0000001-0001-4000-8000-000000000001', 0, true, 'confirmed'),
  ('d0000003-0003-4000-8000-000000000003', 'a0000002-0002-4000-8000-000000000002', 1, false, 'confirmed'),
  ('d0000003-0003-4000-8000-000000000003', 'a0000004-0004-4000-8000-000000000004', 2, false, 'confirmed')
ON CONFLICT (tee_time_id, user_id) DO NOTHING;

-- ============================================================================
-- 8. WAIVER WIRE (active availability entries)
-- ============================================================================
INSERT INTO waiver_wire (user_id, available_date, preferred_time, preferred_course, max_handicap, notes, is_active, created_at)
VALUES
  ('a0000002-0002-4000-8000-000000000002', (CURRENT_DATE + INTERVAL '3 days')::date, 'morning', 'Torrey Pines', 15, 'Looking for a foursome', true, NOW()),
  ('a0000003-0003-4000-8000-000000000003', (CURRENT_DATE + INTERVAL '5 days')::date, 'late_morning', NULL, 25, NULL, true, NOW()),
  ('a0000005-0005-4000-8000-000000000005', (CURRENT_DATE + INTERVAL '1 day')::date, 'afternoon', 'Arrowood Golf', 30, 'Weekend round', true, NOW())
ON CONFLICT (user_id, available_date) DO UPDATE SET is_active = true, preferred_time = EXCLUDED.preferred_time;

-- ============================================================================
-- 9. CONVERSATIONS & MESSAGES (direct + group)
-- ============================================================================
INSERT INTO conversations (id, type, roster_group_id, created_at, updated_at)
VALUES
  ('e0000001-0001-4000-8000-000000000001', 'group', 'b0000001-0001-4000-8000-000000000001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO conversation_participants (conversation_id, user_id)
VALUES
  ('e0000001-0001-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001'),
  ('e0000001-0001-4000-8000-000000000001', 'a0000002-0002-4000-8000-000000000002'),
  ('e0000001-0001-4000-8000-000000000001', 'a0000003-0003-4000-8000-000000000003'),
  ('e0000001-0001-4000-8000-000000000001', 'a0000004-0004-4000-8000-000000000004')
ON CONFLICT (conversation_id, user_id) DO NOTHING;

INSERT INTO messages (conversation_id, sender_id, body, created_at)
VALUES
  ('e0000001-0001-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001', 'Who is in for Saturday 7:30 at Torrey?', NOW() - INTERVAL '2 days'),
  ('e0000001-0001-4000-8000-000000000001', 'a0000002-0002-4000-8000-000000000002', 'I am in.', NOW() - INTERVAL '2 days' + INTERVAL '1 hour'),
  ('e0000001-0001-4000-8000-000000000001', 'a0000003-0003-4000-8000-000000000003', 'Count me in too.', NOW() - INTERVAL '1 day'),
  ('e0000001-0001-4000-8000-000000000001', 'a0000004-0004-4000-8000-000000000004', 'See you there.', NOW() - INTERVAL '12 hours');

-- ============================================================================
-- 10. SAMPLE NOTIFICATIONS (in_app)
-- ============================================================================
INSERT INTO notifications (user_id, type, channel, title, body, data, status, created_at)
VALUES
  ('a0000001-0001-4000-8000-000000000001', 'in_app', 'roster', 'Tee time reminder', 'Your round at Torrey Pines South is in 7 days.', '{"teeTimeId": "d0000001-0001-4000-8000-000000000001"}'::jsonb, 'delivered', NOW() - INTERVAL '1 hour'),
  ('a0000001-0001-4000-8000-000000000001', 'in_app', 'roster', 'Group message', 'Jordan Smith replied in Weekend Crew.', '{"conversationId": "e0000001-0001-4000-8000-000000000001"}'::jsonb, 'read', NOW() - INTERVAL '2 hours');

-- ============================================================================
-- 11. USER AVAILABILITY (weekly preferences for test users)
-- ============================================================================
INSERT INTO user_availability (user_id, day_of_week, time_slot, is_active)
SELECT u.id::uuid, d.d, t.t, true
FROM (VALUES ('a0000001-0001-4000-8000-000000000001'::uuid), ('a0000002-0002-4000-8000-000000000002'::uuid)) AS u(id),
     (VALUES ('Sat'), ('Sun')) AS d(d),
     (VALUES ('morning'), ('late_morning')) AS t(t)
ON CONFLICT (user_id, day_of_week, time_slot) DO UPDATE SET is_active = true;
