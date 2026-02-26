-- ============================================================================
-- FULL TEST DATA FOR ONE PRIMARY USER
-- ============================================================================
-- Run in STAGING only. One user (Alex – a0000001) can test all app functions:
-- roster, on-deck, groups, friend requests, tee times, invites, waiver wire,
-- messages (direct, group, tee time), notifications, availability.
--
-- Prerequisites: unified_schema.sql (or migrations) applied.
-- Primary test account: alex.reviewer@example.com (id a0000001-...).
-- ============================================================================

-- ============================================================================
-- 1. USERS (primary tester + others for roster/groups/friends/invites)
-- ============================================================================
INSERT INTO users (id, phone_number, email, first_name, last_name, username, is_active, is_verified, onboarding_completed, profile_completed, availability_completed, created_at, updated_at)
VALUES
  ('a0000001-0001-4000-8000-000000000001', '+15550001001', 'alex.reviewer@example.com', 'Alex', 'Reviewer', 'alex_reviewer', true, true, true, true, true, NOW(), NOW()),
  ('a0000002-0002-4000-8000-000000000002', '+15550001002', 'jordan.smith@example.com', 'Jordan', 'Smith', 'jordan_smith', true, true, true, true, true, NOW(), NOW()),
  ('a0000003-0003-4000-8000-000000000003', '+15550001003', 'casey.jones@example.com', 'Casey', 'Jones', 'casey_jones', true, true, true, true, true, NOW(), NOW()),
  ('a0000004-0004-4000-8000-000000000004', '+15550001004', 'riley.williams@example.com', 'Riley', 'Williams', 'riley_williams', true, true, true, true, true, NOW(), NOW()),
  ('a0000005-0005-4000-8000-000000000005', '+15550001005', 'morgan.brown@example.com', 'Morgan', 'Brown', 'morgan_brown', true, true, true, true, true, NOW(), NOW()),
  ('a0000006-0006-4000-8000-000000000006', '+15550001006', 'sam.taylor@example.com', 'Sam', 'Taylor', 'sam_taylor', true, true, true, true, true, NOW(), NOW()),
  ('a0000007-0007-4000-8000-000000000007', '+15550001007', 'jamie.lee@example.com', 'Jamie', 'Lee', 'jamie_lee', true, true, true, true, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. USER PROFILES (handicap, location, clubs)
-- ============================================================================
INSERT INTO user_profiles (user_id, handicap, social_rate, location, home_course, zip_code, walk_or_ride, rounds_played, average_score, clubs, created_at, updated_at)
VALUES
  ('a0000001-0001-4000-8000-000000000001', 12.5, 85, 'San Diego, CA', 'Torrey Pines', '92101', 'ride', 24, 88.0, '[{"name": "Torrey Pines Golf Club", "location": "San Diego"}]'::jsonb, NOW(), NOW()),
  ('a0000002-0002-4000-8000-000000000002', 8.0, 92, 'La Jolla, CA', 'La Jolla Country Club', '92037', 'walk', 36, 82.0, '[{"name": "La Jolla CC", "location": "La Jolla"}]'::jsonb, NOW(), NOW()),
  ('a0000003-0003-4000-8000-000000000003', 18.2, 78, 'Carlsbad, CA', 'The Crossings', '92008', 'ride', 12, 94.0, '[]'::jsonb, NOW(), NOW()),
  ('a0000004-0004-4000-8000-000000000004', 14.0, 82, 'Encinitas, CA', 'Encinitas Ranch', '92024', 'either', 18, 90.0, '[]'::jsonb, NOW(), NOW()),
  ('a0000005-0005-4000-8000-000000000005', 22.0, 70, 'Oceanside, CA', 'Arrowood Golf', '92056', 'ride', 8, 98.0, '[]'::jsonb, NOW(), NOW()),
  ('a0000006-0006-4000-8000-000000000006', 10.5, 88, 'Del Mar, CA', 'Del Mar Country Club', '92014', 'walk', 30, 85.0, '[{"name": "Del Mar CC", "location": "Del Mar"}]'::jsonb, NOW(), NOW()),
  ('a0000007-0007-4000-8000-000000000007', 16.0, 80, 'Vista, CA', 'Vista Valley', '92083', 'ride', 14, 92.0, '[]'::jsonb, NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET
  handicap = EXCLUDED.handicap,
  location = EXCLUDED.location,
  home_course = EXCLUDED.home_course,
  zip_code = EXCLUDED.zip_code,
  updated_at = NOW();

-- ============================================================================
-- 3. ROSTER GROUPS (primary user Alex: two groups)
-- ============================================================================
INSERT INTO roster_groups (id, user_id, name, description, color, position, auto_invite, max_members, created_at, updated_at)
VALUES
  ('b0000001-0001-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001', 'Weekend Crew', 'Saturday morning regulars', '#5EBC68', 0, true, 8, NOW(), NOW()),
  ('b0000002-0002-4000-8000-000000000002', 'a0000001-0001-4000-8000-000000000001', 'Work League', 'Tuesday league', '#2563EB', 1, true, 12, NOW(), NOW())
ON CONFLICT (user_id, name) DO NOTHING;

-- ============================================================================
-- 4. ROSTER (Alex's contacts: group + on-deck + ungrouped)
-- ============================================================================
INSERT INTO roster (id, user_id, contact_user_id, contact_name, group_id, position, is_on_deck, created_at, updated_at)
VALUES
  ('c0000001-0001-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001', 'a0000002-0002-4000-8000-000000000002', 'Jordan Smith', 'b0000001-0001-4000-8000-000000000001', 0, true, NOW(), NOW()),
  ('c0000002-0002-4000-8000-000000000002', 'a0000001-0001-4000-8000-000000000001', 'a0000003-0003-4000-8000-000000000003', 'Casey Jones', 'b0000001-0001-4000-8000-000000000001', 1, false, NOW(), NOW()),
  ('c0000003-0003-4000-8000-000000000003', 'a0000001-0001-4000-8000-000000000001', 'a0000004-0004-4000-8000-000000000004', 'Riley Williams', 'b0000001-0001-4000-8000-000000000001', 2, false, NOW(), NOW()),
  ('c0000004-0004-4000-8000-000000000004', 'a0000001-0001-4000-8000-000000000001', 'a0000005-0005-4000-8000-000000000005', 'Morgan Brown', NULL, 3, false, NOW(), NOW()),
  ('c0000005-0005-4000-8000-000000000005', 'a0000001-0001-4000-8000-000000000001', 'a0000006-0006-4000-8000-000000000006', 'Sam Taylor', 'b0000002-0002-4000-8000-000000000002', 4, false, NOW(), NOW()),
  ('c0000006-0006-4000-8000-000000000006', 'a0000001-0001-4000-8000-000000000001', 'a0000007-0007-4000-8000-000000000007', 'Jamie Lee', NULL, 5, false, NOW(), NOW())
ON CONFLICT (user_id, contact_user_id) DO NOTHING;

-- ============================================================================
-- 5. ROSTER_GROUP_MEMBERS (link roster rows to groups)
-- ============================================================================
INSERT INTO roster_group_members (group_id, roster_id)
VALUES
  ('b0000001-0001-4000-8000-000000000001', 'c0000001-0001-4000-8000-000000000001'),
  ('b0000001-0001-4000-8000-000000000001', 'c0000002-0002-4000-8000-000000000002'),
  ('b0000001-0001-4000-8000-000000000001', 'c0000003-0003-4000-8000-000000000003'),
  ('b0000002-0002-4000-8000-000000000002', 'c0000005-0005-4000-8000-000000000005')
ON CONFLICT (group_id, roster_id) DO NOTHING;

-- ============================================================================
-- 6. FRIEND_REQUESTS (pending to primary user + accepted pairs)
-- ============================================================================
-- Pending: Jamie sends friend request to Alex (so Alex can accept/decline)
INSERT INTO friend_requests (sender_id, receiver_id, status, message, created_at, updated_at)
VALUES
  ('a0000007-0007-4000-8000-000000000007', 'a0000001-0001-4000-8000-000000000001', 'pending', 'Would love to join your weekend rounds!', NOW(), NOW())
ON CONFLICT (sender_id, receiver_id) DO NOTHING;

-- ============================================================================
-- 7. FRIENDSHIPS (Alex with Jordan, Casey, Riley, Morgan; Jordan–Casey)
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
-- 8. TEE TIMES (pending, confirmed, completed – creator Alex)
-- ============================================================================
INSERT INTO tee_times (id, creator_id, course_name, course_location, tee_date, tee_time, holes, max_players, invite_type, status, created_at, updated_at)
VALUES
  ('d0000001-0001-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001', 'Torrey Pines South', 'San Diego, CA', (CURRENT_DATE + INTERVAL '7 days')::date, '07:30', 18, 4, 'roster', 'pending', NOW(), NOW()),
  ('d0000002-0002-4000-8000-000000000002', 'a0000001-0001-4000-8000-000000000001', 'Balboa Park', 'San Diego, CA', (CURRENT_DATE + INTERVAL '14 days')::date, '08:00', 18, 4, 'roster', 'confirmed', NOW(), NOW()),
  ('d0000003-0003-4000-8000-000000000003', 'a0000001-0001-4000-8000-000000000001', 'Encinitas Ranch', 'Encinitas, CA', (CURRENT_DATE - INTERVAL '7 days')::date, '09:00', 18, 4, 'roster', 'completed', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 9. TEE TIME PARTICIPANTS
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
-- 10. INVITES (pending + accepted for tee times)
-- ============================================================================
INSERT INTO invites (id, tee_time_id, inviter_id, invitee_user_id, invitee_name, position, status, created_at, updated_at)
VALUES
  ('f0000001-0001-4000-8000-000000000001', 'd0000001-0001-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001', 'a0000005-0005-4000-8000-000000000005', 'Morgan Brown', 2, 'pending', NOW(), NOW()),
  ('f0000002-0002-4000-8000-000000000002', 'd0000001-0001-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001', 'a0000002-0002-4000-8000-000000000002', 'Jordan Smith', 1, 'accepted', NOW() - INTERVAL '1 day', NOW()),
  ('f0000003-0003-4000-8000-000000000003', 'd0000002-0002-4000-8000-000000000002', 'a0000001-0001-4000-8000-000000000001', 'a0000004-0004-4000-8000-000000000004', 'Riley Williams', 3, 'pending', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 11. WAIVER WIRE (availability entries)
-- ============================================================================
INSERT INTO waiver_wire (user_id, available_date, preferred_time, preferred_course, max_handicap, notes, is_active, created_at)
VALUES
  ('a0000002-0002-4000-8000-000000000002', (CURRENT_DATE + INTERVAL '3 days')::date, 'morning', 'Torrey Pines', 15, 'Looking for a foursome', true, NOW()),
  ('a0000003-0003-4000-8000-000000000003', (CURRENT_DATE + INTERVAL '5 days')::date, 'late_morning', NULL, 25, NULL, true, NOW()),
  ('a0000005-0005-4000-8000-000000000005', (CURRENT_DATE + INTERVAL '1 day')::date, 'afternoon', 'Arrowood Golf', 30, 'Weekend round', true, NOW())
ON CONFLICT (user_id, available_date) DO UPDATE SET is_active = true, preferred_time = EXCLUDED.preferred_time;

-- ============================================================================
-- 12. CONVERSATIONS
-- ============================================================================
-- 12a. Direct (1:1) – Alex and Jordan
INSERT INTO conversations (id, type, created_at, updated_at)
VALUES
  ('e0000000-0000-4000-8000-000000000000', 'direct', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 12b. Group – Weekend Crew
INSERT INTO conversations (id, type, roster_group_id, created_at, updated_at)
VALUES
  ('e0000001-0001-4000-8000-000000000001', 'group', 'b0000001-0001-4000-8000-000000000001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 12c. Group – Work League
INSERT INTO conversations (id, type, roster_group_id, created_at, updated_at)
VALUES
  ('e0000002-0002-4000-8000-000000000002', 'group', 'b0000002-0002-4000-8000-000000000002', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 12d. Tee time – Torrey Pines (pending)
INSERT INTO conversations (id, type, tee_time_id, created_at, updated_at)
VALUES
  ('e0000003-0003-4000-8000-000000000003', 'tee_time', 'd0000001-0001-4000-8000-000000000001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 12e. Tee time – Balboa (confirmed)
INSERT INTO conversations (id, type, tee_time_id, created_at, updated_at)
VALUES
  ('e0000004-0004-4000-8000-000000000004', 'tee_time', 'd0000002-0002-4000-8000-000000000002', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 13. CONVERSATION PARTICIPANTS
-- ============================================================================
-- Direct: Alex, Jordan
INSERT INTO conversation_participants (conversation_id, user_id)
VALUES
  ('e0000000-0000-4000-8000-000000000000', 'a0000001-0001-4000-8000-000000000001'),
  ('e0000000-0000-4000-8000-000000000000', 'a0000002-0002-4000-8000-000000000002')
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- Group Weekend Crew: Alex, Jordan, Casey, Riley
INSERT INTO conversation_participants (conversation_id, user_id)
VALUES
  ('e0000001-0001-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001'),
  ('e0000001-0001-4000-8000-000000000001', 'a0000002-0002-4000-8000-000000000002'),
  ('e0000001-0001-4000-8000-000000000001', 'a0000003-0003-4000-8000-000000000003'),
  ('e0000001-0001-4000-8000-000000000001', 'a0000004-0004-4000-8000-000000000004')
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- Group Work League: Alex, Sam
INSERT INTO conversation_participants (conversation_id, user_id)
VALUES
  ('e0000002-0002-4000-8000-000000000002', 'a0000001-0001-4000-8000-000000000001'),
  ('e0000002-0002-4000-8000-000000000002', 'a0000006-0006-4000-8000-000000000006')
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- Tee time Torrey Pines: Alex, Jordan (participants)
INSERT INTO conversation_participants (conversation_id, user_id)
VALUES
  ('e0000003-0003-4000-8000-000000000003', 'a0000001-0001-4000-8000-000000000001'),
  ('e0000003-0003-4000-8000-000000000003', 'a0000002-0002-4000-8000-000000000002')
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- Tee time Balboa: Alex, Jordan, Casey
INSERT INTO conversation_participants (conversation_id, user_id)
VALUES
  ('e0000004-0004-4000-8000-000000000004', 'a0000001-0001-4000-8000-000000000001'),
  ('e0000004-0004-4000-8000-000000000004', 'a0000002-0002-4000-8000-000000000002'),
  ('e0000004-0004-4000-8000-000000000004', 'a0000003-0003-4000-8000-000000000003')
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- ============================================================================
-- 14. MESSAGES
-- ============================================================================
-- 14a. Messages in DIRECT (Alex <-> Jordan)
INSERT INTO messages (conversation_id, sender_id, body, created_at)
VALUES
  ('e0000000-0000-4000-8000-000000000000', 'a0000001-0001-4000-8000-000000000001', 'Hey Jordan, you free for Torrey next week?', NOW() - INTERVAL '3 days'),
  ('e0000000-0000-4000-8000-000000000000', 'a0000002-0002-4000-8000-000000000002', 'Yes, count me in!', NOW() - INTERVAL '3 days' + INTERVAL '2 hours'),
  ('e0000000-0000-4000-8000-000000000000', 'a0000001-0001-4000-8000-000000000001', 'Perfect, I added you to the tee time.', NOW() - INTERVAL '2 days');

-- 14b. Messages in GROUP (Weekend Crew)
INSERT INTO messages (conversation_id, sender_id, body, created_at)
VALUES
  ('e0000001-0001-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001', 'Who is in for Saturday 7:30 at Torrey?', NOW() - INTERVAL '2 days'),
  ('e0000001-0001-4000-8000-000000000001', 'a0000002-0002-4000-8000-000000000002', 'I am in.', NOW() - INTERVAL '2 days' + INTERVAL '1 hour'),
  ('e0000001-0001-4000-8000-000000000001', 'a0000003-0003-4000-8000-000000000003', 'Count me in too.', NOW() - INTERVAL '1 day'),
  ('e0000001-0001-4000-8000-000000000001', 'a0000004-0004-4000-8000-000000000004', 'See you there.', NOW() - INTERVAL '12 hours');

-- 14c. Messages in GROUP (Work League)
INSERT INTO messages (conversation_id, sender_id, body, created_at)
VALUES
  ('e0000002-0002-4000-8000-000000000002', 'a0000001-0001-4000-8000-000000000001', 'Tuesday league at Balboa – who can make it?', NOW() - INTERVAL '5 days'),
  ('e0000002-0002-4000-8000-000000000002', 'a0000006-0006-4000-8000-000000000006', 'I am in for Tuesday.', NOW() - INTERVAL '4 days');

-- 14d. Messages in TEE TIME (Torrey Pines – pending)
INSERT INTO messages (conversation_id, sender_id, body, created_at)
VALUES
  ('e0000003-0003-4000-8000-000000000003', 'a0000001-0001-4000-8000-000000000001', 'Reminder: Tee time 7:30 next Saturday. Meet at the pro shop.', NOW() - INTERVAL '1 day'),
  ('e0000003-0003-4000-8000-000000000003', 'a0000002-0002-4000-8000-000000000002', 'Will do, thanks!', NOW() - INTERVAL '12 hours');

-- 14e. Messages in TEE TIME (Balboa – confirmed)
INSERT INTO messages (conversation_id, sender_id, body, created_at)
VALUES
  ('e0000004-0004-4000-8000-000000000004', 'a0000001-0001-4000-8000-000000000001', 'Balboa foursome is set for 14 days from now.', NOW() - INTERVAL '2 days'),
  ('e0000004-0004-4000-8000-000000000004', 'a0000003-0003-4000-8000-000000000003', 'Looking forward to it.', NOW() - INTERVAL '1 day');

-- ============================================================================
-- 15. NOTIFICATIONS (for primary user)
-- ============================================================================
INSERT INTO notifications (id, user_id, type, channel, title, body, data, status, created_at)
VALUES
  ('f1000001-0001-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001', 'in_app', 'roster', 'Tee time reminder', 'Your round at Torrey Pines South is in 7 days.', '{"teeTimeId": "d0000001-0001-4000-8000-000000000001"}'::jsonb, 'delivered', NOW() - INTERVAL '1 hour'),
  ('f1000002-0002-4000-8000-000000000002', 'a0000001-0001-4000-8000-000000000001', 'in_app', 'roster', 'Group message', 'Jordan Smith replied in Weekend Crew.', '{"conversationId": "e0000001-0001-4000-8000-000000000001"}'::jsonb, 'read', NOW() - INTERVAL '2 hours'),
  ('f1000003-0003-4000-8000-000000000003', 'a0000001-0001-4000-8000-000000000001', 'in_app', 'friend', 'Friend request', 'Jamie Lee sent you a friend request.', '{"type": "friend_request", "senderId": "a0000007-0007-4000-8000-000000000007"}'::jsonb, 'pending', NOW() - INTERVAL '30 minutes')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 16. USER AVAILABILITY (weekly preferences)
-- ============================================================================
INSERT INTO user_availability (user_id, day_of_week, time_slot, is_active)
SELECT u.id::uuid, d.d, t.t, true
FROM (VALUES ('a0000001-0001-4000-8000-000000000001'::uuid), ('a0000002-0002-4000-8000-000000000002'::uuid)) AS u(id),
     (VALUES ('Sat'), ('Sun')) AS d(d),
     (VALUES ('morning'), ('late_morning')) AS t(t)
ON CONFLICT (user_id, day_of_week, time_slot) DO UPDATE SET is_active = true;
