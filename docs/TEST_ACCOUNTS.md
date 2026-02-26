# Test Accounts for UAT / Staging Review

**Use only in staging.** These accounts and seed data are for reviewer evaluation so all app screens show meaningful content.

## Running the seed

1. Ensure the database schema is applied (e.g. run `backend/schema/unified_schema.sql` or your migrations).
2. Run the staging seed in your staging database:
   - **Supabase:** SQL Editor → paste and run `backend/schema/seeds/staging_seed_data.sql`.
   - **psql:** `psql $DATABASE_URL -f backend/schema/seeds/staging_seed_data.sql`
3. If your app uses Supabase Auth (or similar), create auth users with the **same emails** below so login works. Then either:
   - Link auth users to these `users.id` values (e.g. set `users.supabase_auth_id`), or  
   - Run the seed **after** reviewers sign up with these emails so the app creates `users` rows; then re-run the seed (it upserts profiles/roster) or manually copy the seed’s UUIDs into the seed file to match the created user IDs.

## Test account credentials

| Name           | Email                     | Phone        | Username      | Role in seed                          |
|----------------|---------------------------|-------------|---------------|----------------------------------------|
| Alex Reviewer  | alex.reviewer@example.com | +15550001001 | alex_reviewer | Primary reviewer; has roster, groups, tee times |
| Jordan Smith   | jordan.smith@example.com  | +15550001002 | jordan_smith  | On-deck; in Weekend Crew; waiver wire |
| Casey Jones    | casey.jones@example.com   | +15550001003 | casey_jones   | Weekend Crew; waiver wire              |
| Riley Williams | riley.williams@example.com| +15550001004 | riley_williams| Weekend Crew                           |
| Morgan Brown   | morgan.brown@example.com  | +15550001005 | morgan_brown  | Roster (no group); waiver wire         |
| Sam Taylor     | sam.taylor@example.com    | +15550001006 | sam_taylor    | Work League group                      |

**Passwords:** Not set in seed. Use your normal staging sign-up or “forgot password” flow with the emails above, or configure a single shared staging password in Auth for these emails.

## What the seed provides

- **Users & profiles:** 6 users with varied handicap (8–22), location (San Diego area), and club membership (some with `clubs` JSON, some none).
- **Tee times:**  
  - **Pending:** Torrey Pines South, 7 days from seed run, 07:30.  
  - **Confirmed:** Balboa Park, 14 days out, 08:00.  
  - **Completed:** Encinitas Ranch, 7 days in the past.
- **Roster (Alex):** Jordan, Casey, Riley, Morgan, Sam with positions; Jordan on-deck; Weekend Crew (Jordan, Casey, Riley); Work League (Sam); Morgan in roster only.
- **Groups:** “Weekend Crew” and “Work League” with members above.
- **Waiver wire:** At least one active availability entry each for Jordan, Casey, and Morgan (upcoming dates).
- **Messages:** Group conversation “Weekend Crew” with 4 sample messages.
- **Notifications:** Sample in-app notifications for the primary user.
- **User availability:** Weekend morning/late_morning slots for Alex and Jordan.

## Acceptance checklist (review)

- [ ] Test accounts exist and are documented for the review team (this file).
- [ ] At least one tee time in each status (pending, confirmed, completed) is visible.
- [ ] Roster, on-deck, and groups sections are populated with test users.
- [ ] Waiver wire shows at least one active availability entry.

## User IDs (for support/debugging)

If you need to reference users in DB or API tools:

| User           | UUID (id in `users` table) |
|----------------|-----------------------------|
| Alex Reviewer  | `a0000001-0001-4000-8000-000000000001` |
| Jordan Smith   | `a0000002-0002-4000-8000-000000000002` |
| Casey Jones   | `a0000003-0003-4000-8000-000000000003` |
| Riley Williams | `a0000004-0004-4000-8000-000000000004` |
| Morgan Brown   | `a0000005-0005-4000-8000-000000000005` |
| Sam Taylor     | `a0000006-0006-4000-8000-000000000006` |

Share this document (and any staging URL/login instructions) with the review team before UAT.
