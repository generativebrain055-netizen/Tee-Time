# Auth Flow Fix - Existing Users Going to Home ✅

## Issue
Existing OAuth users with complete profiles were being sent back to the onboarding flow instead of going directly to Home screen.

## Root Causes

### 1. Backend Profile Completeness Check Too Strict
**Problem**: The `getProfileCompleteness` function was checking for optional fields (`location`, `home_course`) and marking users as needing onboarding even when they had all required fields.

**Impact**: Users who had completed phone verification but hadn't set location/home course were marked as `needsOnboarding: true`.

### 2. Frontend Not Checking Which Fields Are Missing
**Problem**: The login screen was sending users to onboarding if `needsOnboarding: true` without checking which specific fields were missing.

**Impact**: Users missing only optional fields were forced through onboarding again.

## Fixes Applied

### Backend Fix: `backend/services/oauthService.js`

**Before:**
```javascript
const getProfileCompleteness = (user) => {
  const missingFields = [];

  if (!user.first_name) missingFields.push("firstName");
  if (!user.last_name) missingFields.push("lastName");
  if (!user.location) missingFields.push("location");        // ❌ Optional
  if (!user.home_course) missingFields.push("homeCourse");   // ❌ Optional

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    needsOnboarding: missingFields.length > 0,
  };
};
```

**After:**
```javascript
const getProfileCompleteness = (user) => {
  const missingFields = [];

  // Required fields for OAuth users
  if (!user.first_name) missingFields.push("firstName");
  if (!user.last_name) missingFields.push("lastName");
  if (!user.phone_number) missingFields.push("phoneNumber");  // ✅ Required

  // Optional fields - don't block onboarding
  // location and home_course can be added later from profile settings

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    needsOnboarding: missingFields.length > 0,
  };
};
```

### Frontend Fix: `TTSGolfApp/screens/login/index.tsx`

**Before:**
```typescript
if (data.needsOnboarding && data.oauthData) {
  // Always send to onboarding if needsOnboarding is true
  navigation.navigate("OAuthOnboarding", { oauthData: data.oauthData });
}
```

**After:**
```typescript
// Check if user needs phone verification (new user)
if (data.needsOnboarding && data.oauthData?.needsPhoneVerification) {
  navigation.navigate("OAuthOnboarding", { oauthData: data.oauthData });
  return;
}

// Check if user needs to complete profile (missing required fields)
if (data.needsOnboarding && data.oauthData && !data.oauthData.needsPhoneVerification) {
  const missingFields = data.oauthData.missingFields || [];
  
  // Only show onboarding if missing critical fields (name or phone)
  const hasCriticalMissing = missingFields.some(field => 
    field === "firstName" || field === "lastName" || field === "phoneNumber"
  );
  
  if (hasCriticalMissing) {
    navigation.navigate("OAuthOnboarding", { oauthData: data.oauthData });
    return;
  }
}

// User has all required fields - check availability and go to Home
```

## Auth Flow Decision Tree

```
User Signs In with OAuth
  ↓
Backend Checks Profile
  ↓
┌─────────────────────────────────────────┐
│ Missing firstName, lastName, or phone?  │
└─────────────────────────────────────────┘
         ↓ YES                    ↓ NO
         ↓                        ↓
  ┌──────────────┐         ┌──────────────┐
  │ Onboarding   │         │ Check        │
  │ Screen       │         │ Availability │
  └──────────────┘         └──────────────┘
         ↓                        ↓
  Enter Missing Info      ┌──────────────┐
         ↓                │ Has          │
  Save to DB             │ Availability?│
         ↓                └──────────────┘
         └──────────┬──────┘      ↓ YES    ↓ NO
                    ↓             ↓        ↓
              Check Availability  │   Availability
                    ↓             │   Onboarding
              Has Availability?   │        ↓
                    ↓             │   Set Schedule
              ┌─────┴─────┐       │        ↓
              ↓ YES   NO ↓        │        │
              ↓           ↓        │        │
         ┌────────┐  ┌────────┐   │        │
         │ HOME   │  │ Avail  │   │        │
         │ SCREEN │  │ Onboard│   │        │
         └────────┘  └────────┘   │        │
              ↑           ↓        │        │
              └───────────┴────────┴────────┘
```

## Required vs Optional Fields

### Required Fields (Block Login)
- ✅ `firstName` - User's first name
- ✅ `lastName` - User's last name
- ✅ `phoneNumber` - User's phone number (for account security)

### Optional Fields (Can Add Later)
- ⚪ `location` - User's city/location (can add from profile)
- ⚪ `homeCourse` - User's home golf course (can add from profile)
- ⚪ `handicap` - Golf handicap (can add from profile)
- ⚪ `avatarUrl` - Profile picture (can add from profile)

## User Scenarios

### Scenario 1: New User (First Time)
```
1. Sign in with Google
2. Backend: No user found → Create new user
3. Backend: Missing phone → needsOnboarding: true, needsPhoneVerification: true
4. Frontend: Navigate to OAuthOnboarding
5. User: Enter phone number
6. Backend: Save phone, create account
7. Frontend: Navigate to AvailabilityOnboarding
8. User: Set availability
9. Frontend: Navigate to Home ✅
```

### Scenario 2: Existing User (Complete Profile)
```
1. Sign in with Google
2. Backend: User found with firstName, lastName, phoneNumber
3. Backend: needsOnboarding: false
4. Frontend: Check availability
5. Frontend: Navigate to Home ✅
```

### Scenario 3: Existing User (Missing Optional Fields)
```
1. Sign in with Google
2. Backend: User found with firstName, lastName, phoneNumber
3. Backend: Missing location/homeCourse → needsOnboarding: false (optional fields)
4. Frontend: Check availability
5. Frontend: Navigate to Home ✅
6. User can add location/homeCourse from Profile Settings later
```

### Scenario 4: Existing User (Missing Phone - Edge Case)
```
1. Sign in with Google
2. Backend: User found but missing phoneNumber
3. Backend: needsOnboarding: true, missingFields: ["phoneNumber"]
4. Frontend: Check missingFields → has critical field
5. Frontend: Navigate to OAuthOnboarding
6. User: Enter phone number
7. Backend: Save phone
8. Frontend: Navigate to Home ✅
```

## Testing Checklist

### New Users
- [x] First-time Google sign-in goes to OAuthOnboarding
- [x] Phone number entry works
- [x] After phone entry, goes to AvailabilityOnboarding
- [x] After availability, goes to Home

### Existing Users (Complete)
- [x] Sign in with Google goes directly to Home
- [x] No onboarding screens shown
- [x] Session persists correctly

### Existing Users (Missing Optional)
- [x] Sign in with Google goes directly to Home
- [x] Missing location/homeCourse doesn't block login
- [x] Can add optional fields from Profile Settings

### Existing Users (Missing Phone)
- [x] Sign in with Google goes to OAuthOnboarding
- [x] Only phone number field shown
- [x] After phone entry, goes to Home

## Debug Logging

When testing, you should see:

**Existing User (Complete):**
```
[LoginScreen] OAuth onSuccess received: {
  "needsOnboarding": false,
  "user": { "id": "...", "firstName": "John", "lastName": "Doe", "phoneNumber": "+1..." }
}
[LoginScreen] User has required fields, checking availability
[LoginScreen] Availability exists, navigating to Home
```

**New User:**
```
[LoginScreen] OAuth onSuccess received: {
  "needsOnboarding": true,
  "oauthData": { "needsPhoneVerification": true, ... }
}
[LoginScreen] New user - navigating to OAuthOnboarding for phone verification
```

**Existing User (Missing Phone):**
```
[LoginScreen] OAuth onSuccess received: {
  "needsOnboarding": true,
  "oauthData": { "missingFields": ["phoneNumber"], ... }
}
[LoginScreen] User missing fields: ["phoneNumber"]
[LoginScreen] Missing critical fields - navigating to OAuthOnboarding
```

## ✅ Complete!

Existing OAuth users with complete profiles now go directly to Home screen instead of being sent back to onboarding. Only users missing critical fields (name or phone) are shown the onboarding flow.
