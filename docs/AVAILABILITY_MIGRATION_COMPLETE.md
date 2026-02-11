# Availability Feature Migration - Complete

## ✅ What Was Migrated

### Backend Files Added

1. **Controller**: `backend/controllers/availabilityController.js`
   - Handles HTTP requests for availability management
   - Full input validation and sanitization
   - Supports CRUD operations

2. **Repository**: `backend/repositories/availabilityRepository.js`
   - Database operations using Supabase
   - Soft delete support (is_active flag)
   - Multi-user availability queries

3. **Routes**: `backend/routes/availability.js`
   - GET `/api/availability` - Get user's availability
   - POST `/api/availability` - Save/update availability
   - DELETE `/api/availability` - Clear availability
   - POST `/api/availability/users` - Get multiple users' availability

4. **Migration**: `backend/schema/migrations/003_add_user_availability.sql`
   - Creates user_availability table
   - Adds indexes for performance
   - Sets up RLS policies
   - Adds triggers for updated_at

### Backend Configuration Updated

1. **routes/index.js** - Added availability routes export
2. **server.js** - Registered `/api/availability` endpoint

### Database Schema

```sql
CREATE TABLE user_availability (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    day_of_week VARCHAR(10) CHECK (day_of_week IN ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')),
    time_slot VARCHAR(20) CHECK (time_slot IN ('morning', 'late_morning', 'afternoon', 'late_afternoon', 'evening')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    UNIQUE (user_id, day_of_week, time_slot)
);
```

### Time Slots Defined

- **morning**: 7:00 AM - 9:00 AM
- **late_morning**: 9:00 AM - 12:00 PM
- **afternoon**: 12:00 PM - 3:00 PM
- **late_afternoon**: 3:00 PM - 5:00 PM
- **evening**: 5:00 PM - 8:00 PM

### Days of Week

- Mon, Tue, Wed, Thu, Fri, Sat, Sun

## 🔧 Next Steps

### 1. Run Database Migration

You need to run the migration to create the table in your Supabase database:

```bash
cd backend
node scripts/migrate-database.js
```

Or manually run the SQL in Supabase SQL Editor:
- Open: https://dzqukppcdqgkknnwbnvx.supabase.co
- Go to SQL Editor
- Run: `backend/schema/migrations/003_add_user_availability.sql`

### 2. Restart Backend Server

```bash
cd backend
npm start
```

The availability endpoints will now be available at:
- `http://10.0.2.2:3000/api/availability`

### 3. Test the Endpoints

#### Get User Availability
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://10.0.2.2:3000/api/availability
```

#### Save Availability
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "availability": [
      {"day_of_week": "Mon", "time_slot": "morning"},
      {"day_of_week": "Mon", "time_slot": "afternoon"},
      {"day_of_week": "Wed", "time_slot": "evening"}
    ]
  }' \
  http://10.0.2.2:3000/api/availability
```

## 📱 Frontend Integration

The frontend already has the availability API client:
- `TTSGolfApp/services/api/availabilityApi.ts`

The AvailabilityOnboarding screen is already in place:
- `TTSGolfApp/screens/onboarding/AvailabilityOnboardingScreen.tsx`

## 🔒 Security Features

1. **Authentication Required**: All endpoints require valid JWT token
2. **Input Validation**: Strict validation of day_of_week and time_slot
3. **Input Sanitization**: All inputs are sanitized before processing
4. **Rate Limiting**: Prevents excessive requests
5. **RLS Policies**: Users can only access their own availability
6. **Soft Deletes**: Historical tracking with is_active flag

## 📊 API Response Format

### Success Response
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "day_of_week": "Mon",
      "time_slot": "morning",
      "is_active": true,
      "created_at": "2026-02-08T...",
      "updated_at": "2026-02-08T..."
    }
  ]
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error"
}
```

## 🎯 Features Implemented

- ✅ Save user weekly availability preferences
- ✅ Update existing availability
- ✅ Clear all availability
- ✅ Query multiple users' availability (for matching)
- ✅ Soft delete support
- ✅ Automatic timestamp management
- ✅ Full input validation
- ✅ Security policies (RLS)
- ✅ Performance indexes

## 🐛 Troubleshooting

### 404 Error on /api/availability

**Cause**: Database table doesn't exist yet

**Solution**: Run the migration script (Step 1 above)

### 401 Unauthorized

**Cause**: Missing or invalid authentication token

**Solution**: Ensure user is logged in and token is valid

### 400 Bad Request

**Cause**: Invalid day_of_week or time_slot values

**Solution**: Use only the allowed values listed above

## 📝 Notes

- The availability feature is optional - users can skip it during onboarding
- Availability is used for matching users with compatible schedules
- The soft delete approach allows historical tracking
- All database operations use Supabase SDK (no raw SQL)
- Input validation happens at controller level before repository
