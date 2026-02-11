# Login/Signup Flow Comparison & Fixes Needed

## Old Repo Flow (679c963)

### Login Screen - OAuth Flow
```
User taps "Continue with Google/Apple"
  ↓
OAuth Authentication
  ↓
Backend Response
  ↓
Navigate to Home (DIRECT - No onboarding)
```

**Code:**
```typescript
<OAuthButtons
  onSuccess={() => {
    // Sign in with Google/Apple: always go to main screen (do not go to sign-up form)
    navigation.replace("Home");
  }}
  onError={(error) => {
    console.error("OAuth error:", error);
  }}
/>
```

### Signup Screen - Phone Number Flow
```
SignUpOptionsPage
  ↓ User enters phone number
PhoneVerificationPage (skipped if from SignUpOptionsPage)
  ↓
MagicLinkPage - SMS Magic Link Verification
  ↓ User taps link in SMS
Verification Complete
  ↓
NamePage
  ↓
EmailPage
  ↓
PhotoZipPage
  ↓
LocationPage
  ↓
ClubPage
  ↓
HandicapPage
  ↓
PreferencesPage
  ↓
Complete Registration → Navigate to Login
```

### Signup Screen - OAuth Flow
```
SignUpOptionsPage
  ↓ User taps "Continue with Google/Apple"
OAuth Authentication
  ↓
Backend Response (tempToken)
  ↓
Skip MagicLinkPage (already authenticated)
  ↓
NamePage (pre-filled from OAuth)
  ↓
EmailPage (pre-filled from OAuth)
  ↓
PhotoZipPage
  ↓
... rest of onboarding
  ↓
Complete Registration → Navigate to Home
```

## Current Repo Flow

### Login Screen - OAuth Flow
```
User taps "Continue with Google/Apple"
  ↓
OAuth Authentication
  ↓
Backend Response
  ↓
Check needsOnboarding
  ↓
If needsOnboarding:
  → Navigate to OAuthOnboardingScreen (single page)
     ↓ Enter phone number
     ↓ Submit
     ↓ Navigate to AvailabilityOnboarding
     ↓ Navigate to Home
     
If !needsOnboarding:
  → Check availability
     ↓ If no availability: AvailabilityOnboarding
     ↓ If has availability: Home
```

## Issues in Current Implementation

### 1. Network Error
**Problem**: The app is showing network errors during login/signup.

**Possible Causes**:
- API endpoint mismatch
- Backend not running
- CORS issues
- Invalid request format

**Need to check**:
- Backend logs
- Network requests in React Native debugger
- API_URL configuration

### 2. Missing Magic Link Verification for OAuth
**Problem**: You want OAuth users to also go through magic link verification like phone number users.

**Current Flow**: OAuth → OAuthOnboardingScreen (phone entry) → Direct save
**Desired Flow**: OAuth → OAuthOnboardingScreen (phone entry) → Magic Link SMS → Verify → Save

### 3. OAuth Flow Inconsistency
**Old Repo**: OAuth login goes directly to Home (simple)
**Current Repo**: OAuth login goes through onboarding if missing fields (complex)

## Recommended Fixes

### Fix 1: Debug Network Error

1. **Check Backend is Running**:
```bash
cd backend
npm start
```

2. **Check API URL**:
```typescript
// TTSGolfApp/config/api.ts
export const API_URL = "http://10.0.2.2:3000"; // Android emulator
// or
export const API_URL = "http://localhost:3000"; // iOS simulator
```

3. **Check Backend Logs**:
Look for errors when OAuth requests come in

4. **Add Debug Logging**:
```typescript
// In OAuthButtons.tsx
console.log("[OAuth] Sending request to:", `${API_URL}/auth/google`);
console.log("[OAuth] Request body:", { idToken });
```

### Fix 2: Add Magic Link Verification for OAuth Users

**Option A: Keep Current Flow (Recommended)**
- OAuth users enter phone number
- Backend sends OTP/Magic link
- User verifies
- Account created

**Option B: Match Old Repo**
- OAuth users go directly to Home
- No phone verification required
- Simpler flow

**Option C: Hybrid**
- New OAuth users: Phone verification required
- Existing OAuth users: Direct to Home

### Fix 3: Simplify OAuth Flow (Match Old Repo)

If you want to match the old repo exactly:

```typescript
// TTSGolfApp/screens/login/index.tsx
<OAuthButtons
  onSuccess={async (data) => {
    // Simple flow: OAuth always goes to Home
    navigation.replace("Home");
  }}
  onError={(error) => {
    console.error("[LoginScreen] OAuth error:", error);
  }}
/>
```

## What You Requested

> "during google/Apple Oauth sign up it should do same magic link Verification phase as told"

This means you want:

```
OAuth Sign-Up Flow:
1. User taps "Continue with Google/Apple"
2. OAuth authentication
3. Backend creates pending user
4. Navigate to MagicLinkPage
5. Send SMS with magic link
6. User taps link
7. Verify phone number
8. Complete account creation
9. Navigate to Home
```

## Implementation Plan

### Step 1: Add Magic Link Verification to OAuth Flow

1. **Update Backend OAuth Controller**:
```javascript
// When new OAuth user signs up
if (isNewUser) {
  // Don't create user yet
  // Return pending status with phone verification required
  return res.json({
    status: "pending_phone_verification",
    tempToken: generateTempToken({ email, firstName, lastName, picture }),
    message: "Phone verification required"
  });
}
```

2. **Update Frontend OAuth Flow**:
```typescript
<OAuthButtons
  onSuccess={async (data) => {
    if (data.status === "pending_phone_verification") {
      // Navigate to phone entry + magic link verification
      navigation.navigate("Onboarding", {
        oauthData: {
          tempToken: data.tempToken,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          picture: data.picture,
        }
      });
    } else {
      // Existing user - go to Home
      navigation.replace("Home");
    }
  }}
/>
```

3. **Update Onboarding Flow**:
- Start at phone entry page
- Send magic link SMS
- Verify link
- Complete registration with OAuth data

### Step 2: Fix Network Errors

1. **Check backend is running**: `npm start` in backend folder
2. **Check API URL matches**: Android emulator uses `10.0.2.2`, iOS uses `localhost`
3. **Check CORS settings**: Backend should allow requests from app
4. **Add error logging**: Log all network requests and responses

### Step 3: Test Complete Flow

1. **New OAuth User**:
   - Sign up with Google
   - Enter phone number
   - Receive magic link SMS
   - Tap link
   - Account created
   - Navigate to Home

2. **Existing OAuth User**:
   - Sign in with Google
   - Direct to Home

3. **Phone Number User**:
   - Enter phone number
   - Receive magic link SMS
   - Tap link
   - Complete onboarding
   - Navigate to Home

## Quick Fix for Network Error

If you just want to get OAuth working now:

```typescript
// TTSGolfApp/screens/login/index.tsx
<OAuthButtons
  onSuccess={async (data) => {
    console.log("[OAuth] Success data:", data);
    
    // For now, just go to Home
    // TODO: Add phone verification later
    navigation.replace("Home");
  }}
  onError={(error) => {
    console.error("[OAuth] Error:", error);
    Alert.alert("Sign In Failed", error);
  }}
/>
```

This matches the old repo behavior and will work immediately.

## Next Steps

1. **Immediate**: Fix network error by checking backend and API URL
2. **Short-term**: Decide on OAuth flow (simple vs. phone verification)
3. **Long-term**: Implement magic link verification for OAuth if desired

Let me know which approach you prefer and I'll implement it!
