# Run Backend with Availability Migration

## Important: Table Already Exists! ✅

The `user_availability` table already exists in your database (from unified_schema.sql). 

**You only need to add the RLS policies.**

## Step 1: Add RLS Policies (Required)

The table exists but needs Row Level Security policies to allow users to access their data.

### Using Supabase Dashboard (Recommended)
1. Go to your Supabase project: https://dzqukppcdqgkknnwbnvx.supabase.co
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the contents of `backend/schema/migrations/003_add_user_availability_policies.sql`
5. Click "Run" to execute the migration

This will add policies that allow:
- Users to view/edit their own availability
- Users to view their friends' availability (for matching)

## Step 2: Start the Backend Server

```bash
cd backend
npm start
```

Or for development with auto-reload:
```bash
cd backend
npm run dev
```

## Step 3: Verify Backend is Running

Open your browser or use curl:
```bash
curl http://localhost:3000/health
```

You should see:
```json
{
  "status": "ok",
  "message": "TTS Golf App API is running",
  "timestamp": "2026-02-08T...",
  "environment": "development"
}
```

## Step 4: Test Availability Endpoint

```bash
# Get availability (requires authentication token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/availability
```

## Troubleshooting

### Backend won't start
- Check if port 3000 is already in use
- Verify `.env` file exists in backend folder
- Check Supabase credentials are correct

### Migration fails
- The table already exists, so you only need to run the policies migration
- If policies already exist, the `IF NOT EXISTS` clause will skip them
- Verify you have proper permissions in Supabase

### App still hangs
- Make sure backend is running on port 3000
- Clear app cache: In Expo, press `Shift + M` then select "Clear cache and restart"
- Check backend logs for errors
- The app now has a 3-second timeout, so it should proceed even if backend is down

### 403 Forbidden on API calls
- This means RLS policies are not set up
- Run the policies migration from Step 1

## What the Table Contains

The `user_availability` table has:
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to users)
- `day_of_week` (Mon-Sun)
- `time_slot` (morning, late_morning, afternoon, late_afternoon, evening)
- `is_active` (boolean for soft deletes)
- `created_at`, `updated_at` (timestamps)

## What the Migration Adds

The migration adds 5 RLS policies:
1. **user_availability_select_own** - Users can view their own availability
2. **user_availability_insert_own** - Users can create their own availability
3. **user_availability_update_own** - Users can update their own availability
4. **user_availability_delete_own** - Users can delete their own availability
5. **user_availability_select_friends** - Users can view their friends' availability

## Next Steps

After the backend is running:
1. Reload the app (press `R` in Expo terminal)
2. The splash screen should now navigate properly (with 3-second timeout)
3. If you have no availability set, you'll see the availability onboarding screen
4. If you have availability set, you'll go directly to the home screen
5. You can set availability from the profile or settings screen
