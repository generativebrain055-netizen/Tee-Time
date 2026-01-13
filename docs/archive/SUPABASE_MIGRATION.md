# Supabase REST API Migration Guide

## Overview
This backend has been migrated from direct PostgreSQL connections (`pg` package) to Supabase REST API (`@supabase/supabase-js`).

## What Changed

### 1. Package Installation
```bash
npm install @supabase/supabase-js
```

### 2. Configuration Files

**NEW: `backend/config/supabase.js`**
- Supabase client initialization
- Admin client for server-side operations (bypasses RLS)
- Error handling helper

**UPDATED: `backend/config/database.js`**
- Now exports deprecated interface for backward compatibility
- Warns when old methods are used
- Redirects to Supabase config

### 3. Environment Variables

Add to `.env`:
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Get your service role key from:
https://supabase.com/dashboard/project/jhzwpweidyqrgxpaukhg/settings/api

### 4. Repository Migration Status

#### ✅ Migrated to Supabase REST API:
- `userRepository.js` - User CRUD operations
- `sessionRepository.js` - Session management

#### ⏳ Needs Migration:
- `teeTimeRepository.js` - Tee time operations
- `inviteRepository.js` - Invite management (complex atomic operations)
- `rosterRepository.js` - Roster management
- `profileRepository.js` - Profile operations
- `friendRepository.js` - Friend requests & friendships
- `courseRepository.js` - Golf course data
- `otpRepository.js` - OTP verification
- `deviceRepository.js` - Device tracking
- `magicLinkRepository.js` - Magic link auth
- `inviteResponseRepository.js` - Invite response tracking

## Migration Pattern

### Old Pattern (pg):
```javascript
const { query, getClient } = require("../config/database");

const findById = async (id) => {
  const result = await query(
    "SELECT * FROM users WHERE id = $1",
    [id]
  );
  return result.rows[0];
};
```

### New Pattern (Supabase):
```javascript
const { supabaseAdmin, handleError } = require("../config/supabase");

const findById = async (id) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    handleError(error, "findById");
  }
};
```

## Key Differences

### 1. Query Syntax
- **Old**: SQL strings with `$1, $2` placeholders
- **New**: Chainable query builder

### 2. Joins
- **Old**: SQL JOIN clauses
- **New**: Supabase foreign key relationships with `select("*, table(*)")`

### 3. Transactions
- **Old**: `BEGIN`, `COMMIT`, `ROLLBACK` with `getClient()`
- **New**: Supabase doesn't support transactions via REST API
  - **Solution**: Use PostgreSQL functions/RPC for atomic operations
  - **Alternative**: Implement optimistic locking or use Supabase Edge Functions

### 4. Complex Queries
For complex operations like `acceptInviteAtomic` in `inviteRepository.js`:
- **Option 1**: Create PostgreSQL function and call via `.rpc()`
- **Option 2**: Implement application-level locking
- **Option 3**: Use Supabase Edge Functions with direct DB access

## Critical Operations Requiring Special Attention

### 1. Atomic Invite Acceptance (`inviteRepository.js`)
The `acceptInviteAtomic` method uses:
- Row-level locking (`FOR UPDATE`)
- Multi-step transaction logic
- Tie-breaker priority handling

**Recommended Solution**: Create a PostgreSQL function:
```sql
CREATE OR REPLACE FUNCTION accept_invite_atomic(
  p_invite_id UUID,
  p_user_id UUID,
  p_user_name TEXT
) RETURNS JSON AS $$
-- Implementation here
$$ LANGUAGE plpgsql;
```

Then call via:
```javascript
const { data, error } = await supabaseAdmin
  .rpc('accept_invite_atomic', {
    p_invite_id: inviteId,
    p_user_id: userId,
    p_user_name: userName
  });
```

### 2. Roster Reordering (`rosterRepository.js`)
Uses transactions to update multiple positions atomically.

**Solution**: Batch updates or PostgreSQL function

### 3. Friend Request Acceptance (`friendRepository.js`)
Creates bidirectional friendship records in transaction.

**Solution**: PostgreSQL trigger or function

## Testing Checklist

- [ ] User authentication (login/signup)
- [ ] Session management (token refresh)
- [ ] Profile updates
- [ ] Tee time creation
- [ ] Invite sending/accepting
- [ ] Roster management
- [ ] Friend requests
- [ ] OTP verification

## Performance Considerations

### Advantages:
- ✅ Automatic connection pooling
- ✅ Built-in caching
- ✅ Real-time subscriptions available
- ✅ Row Level Security (RLS) support

### Limitations:
- ⚠️ No direct transaction support via REST API
- ⚠️ Complex queries may need PostgreSQL functions
- ⚠️ Rate limiting on API calls

## Next Steps

1. **Get Service Role Key**: Add to `.env`
2. **Test Migrated Repositories**: Run authentication flows
3. **Migrate Remaining Repositories**: Follow the pattern above
4. **Create PostgreSQL Functions**: For complex atomic operations
5. **Update Tests**: Ensure all tests pass with new client
6. **Monitor Performance**: Check API usage in Supabase dashboard

## Rollback Plan

If issues arise, the old `pg` package is still installed. To rollback:
1. Revert `backend/config/database.js` to original
2. Revert repository files from git
3. Remove Supabase config

## Support

- Supabase Docs: https://supabase.com/docs/reference/javascript
- PostgREST API: https://postgrest.org/en/stable/api.html
- Project Dashboard: https://supabase.com/dashboard/project/jhzwpweidyqrgxpaukhg
