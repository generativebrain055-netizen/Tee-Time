# Schema Update Summary

**Date**: February 6, 2026  
**Version**: 5.6 → 5.7

## Changes Made

### 1. Added Messaging Tables ✅
The following tables were missing from `unified_schema.sql` but are used extensively in the codebase:

- **conversations** - Stores direct, tee_time, and group conversations
  - Columns: `id`, `type`, `tee_time_id`, `roster_group_id`, `created_at`, `updated_at`
  - Constraints: Type validation and reference checks
  - Indexes: Type, tee_time_id, roster_group_id

- **conversation_participants** - Tracks who is in each conversation
  - Columns: `id`, `conversation_id`, `user_id`, `joined_at`, `left_at`, `last_read_at`
  - Unique constraint on (conversation_id, user_id)
  - Indexes: conversation_id, user_id

- **messages** - Stores chat messages
  - Columns: `id`, `conversation_id`, `sender_id`, `body`, `created_at`
  - Indexes: conversation_id, (conversation_id, created_at DESC)

- **message_read_receipts** - Tracks read receipts
  - Columns: `id`, `message_id`, `user_id`, `read_at`
  - Unique constraint on (message_id, user_id)
  - Indexes: message_id, user_id

### 2. Added distance_radius Column ✅
Added `distance_radius` column to `tee_times` table:
- Type: `DECIMAL(5,2)`
- Purpose: Stores distance radius in miles for Open invites
- Previously stored in `notes` JSON field, now properly normalized

### 3. Added Triggers ✅
- `update_conversations_updated_at` trigger for automatic timestamp updates

### 4. Added RLS Policies ✅
Enabled Row Level Security (RLS) for all messaging tables:
- `conversations`
- `conversation_participants`
- `messages`
- `message_read_receipts`

## Verification

All SQL queries in the backend repositories now reference tables/columns that exist in `unified_schema.sql`:

✅ `waiver_wire` table - exists  
✅ `notification_preferences` column in `user_profiles` - exists  
✅ `clubs` JSONB column in `user_profiles` - exists  
✅ `conversations` table - **ADDED**  
✅ `conversation_participants` table - **ADDED**  
✅ `messages` table - **ADDED**  
✅ `message_read_receipts` table - **ADDED**  
✅ `tee_time_attendance` table - exists  
✅ `social_rate_logs` table - exists  
✅ `distance_radius` column in `tee_times` - **ADDED**

## Migration Notes

When executing `unified_schema.sql`:
1. All existing tables will be dropped (as designed)
2. All tables will be recreated fresh
3. All indexes, constraints, triggers, and RLS policies will be applied
4. The database will be fully configured and ready to use

## Files Modified

- `backend/schema/unified_schema.sql` - Added messaging tables, distance_radius column, triggers, and RLS policies

## Source References

- Messaging tables structure from: `backend/schema/migrations/004_messaging.sql`
- Distance radius requirement from: `backend/repositories/teeTimeRepository.js` (line 21 TODO comment)
