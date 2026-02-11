# Phone Number Save Fix ✅

## Issue
Phone number was not being saved to the database when completing OAuth onboarding.

## Root Cause
The `updateProfile` function in `backend/repositories/userRepository.js` was missing `phone_number` from the `userFields` array, so it was being ignored during profile updates.

## Fix Applied

### File: `backend/repositories/userRepository.js`

**Before:**
```javascript
const updateProfile = async (userId, updates) => {
  const userFields = ["first_name", "last_name", "email"];
  // phone_number was missing!
  ...
}
```

**After:**
```javascript
const updateProfile = async (userId, updates) => {
  const userFields = ["first_name", "last_name", "email", "phone_number"];
  // phone_number now included ✅
  ...
}
```

## How It Works

### Database Schema
Phone number is stored in the `users` table:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE,
  email VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  ...
);
```

### Update Flow

1. **Frontend sends phone number:**
```typescript
const payload = {
  firstName: "John",
  lastName: "Doe",
  phoneNumber: "+13001234567", // E.164 format
};

await oauthService.completeOAuthProfile(payload, accessToken);
```

2. **Backend receives and processes:**
```javascript
// OAuth Controller
const { phoneNumber, firstName, lastName } = req.body;

const updates = {};
if (phoneNumber) updates.phoneNumber = phoneNumber; // ✅ Included
if (firstName) updates.firstName = firstName;
if (lastName) updates.lastName = lastName;

// Call repository
const updatedUser = await userRepository.updateProfile(userId, updates);
```

3. **Repository saves to database:**
```javascript
// User Repository
const updateProfile = async (userId, updates) => {
  const userFields = ["first_name", "last_name", "email", "phone_number"];
  
  const userUpdates = {};
  Object.keys(updates).forEach((key) => {
    const snakeKey = toSnakeCase(key); // phoneNumber → phone_number
    if (userFields.includes(snakeKey)) {
      userUpdates[snakeKey] = updates[key]; // ✅ Now includes phone_number
    }
  });

  // Update users table
  await supabaseAdmin
    .from("users")
    .update(userUpdates) // { phone_number: "+13001234567" }
    .eq("id", userId);
};
```

## Testing

### Before Fix
```sql
SELECT phone_number FROM users WHERE id = 'user-id';
-- Result: NULL (phone number not saved)
```

### After Fix
```sql
SELECT phone_number FROM users WHERE id = 'user-id';
-- Result: +13001234567 (phone number saved correctly)
```

## Verification Steps

1. Sign in with Google/Apple OAuth
2. Complete onboarding with phone number
3. Check database:
```sql
SELECT id, email, phone_number, first_name, last_name 
FROM users 
WHERE email = 'your-email@gmail.com';
```
4. Phone number should be populated

## Related Files

- `backend/repositories/userRepository.js` - Fixed to include phone_number
- `backend/controllers/auth/oauthController.js` - Already correctly passing phoneNumber
- `TTSGolfApp/screens/onboarding/OAuthOnboardingScreen.tsx` - Already correctly sending phoneNumber

## ✅ Complete!

Phone number is now properly saved to the database when completing OAuth onboarding.
