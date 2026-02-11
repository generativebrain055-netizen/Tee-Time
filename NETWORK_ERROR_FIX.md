# Network Error Fix & OAuth Flow Implementation

## Issue Summary

1. **Network Error**: App shows network errors during login/signup
2. **OAuth Flow**: Need to implement magic link verification for OAuth users (like old repo)

## Root Causes

### 1. API URL Configuration Issue
**Problem**: `api.ts` has hardcoded remote IP as fallback instead of localhost

**Current Code**:
```typescript
const API_BASE_URL: string = process.env.EXPO_PUBLIC_API_URL || "http://16.171.170.30:3000";
```

**Issue**: If environment variable doesn't load, it tries to connect to remote server which may be down or unreachable.

### 2. Environment Variable Not Loading
**Possible Causes**:
- Metro bundler cache
- App not restarted after .env changes
- Expo not picking up environment variables

## Fixes

### Fix 1: Update API Configuration

**File**: `TTSGolfApp/config/api.ts`

```typescript
// Use localhost for development
const API_BASE_URL: string = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:3000";

// Add debug logging
console.log("[API Config] API_URL:", API_BASE_URL);
console.log("[API Config] ENV Variable:", process.env.EXPO_PUBLIC_API_URL);
```

### Fix 2: Clear Metro Cache and Restart

```bash
# Stop any running Metro bundler
# Then run:
cd TTSGolfApp
npx expo start --clear

# Or on Windows:
npx expo start -c
```

### Fix 3: Verify Backend is Running

```bash
cd backend
npm start

# Should see:
# HTTP Server is running on port 3000
# API URL: http://localhost:3000
```

### Fix 4: Test API Connection

Add this to your app to test:

```typescript
// TTSGolfApp/screens/login/index.tsx
useEffect(() => {
  // Test API connection
  fetch(`${API_URL}/health`)
    .then(res => res.json())
    .then(data => console.log("[API Test] Health check:", data))
    .catch(err => console.error("[API Test] Connection failed:", err));
}, []);
```

## OAuth Flow Implementation

### Current vs Desired Flow

**Old Repo (Simple)**:
```
OAuth Sign-In → Home (Direct)
```

**Current Repo (Complex)**:
```
OAuth Sign-In → Check Profile → Onboarding if needed → Home
```

**Desired (With Magic Link)**:
```
OAuth Sign-Up → Phone Entry → Magic Link SMS → Verify → Home
OAuth Sign-In → Home (Direct)
```

### Implementation Options

#### Option A: Match Old Repo (Simplest - RECOMMENDED)

Make OAuth work exactly like old repo:

```typescript
// TTSGolfApp/screens/login/index.tsx
<OAuthButtons
  onSuccess={async (data) => {
    console.log("[LoginScreen] OAuth success, navigating to Home");
    navigation.replace("Home");
  }}
  onError={(error) => {
    console.error("[LoginScreen] OAuth error:", error);
    Alert.alert("Sign In Failed", error);
  }}
/>
```

**Pros**:
- Simple and works immediately
- Matches old repo behavior
- No phone verification needed

**Cons**:
- No phone number collection for OAuth users
- Less secure (no 2FA)

#### Option B: Add Phone Verification (Complex)

Implement full magic link flow for OAuth:

1. **Backend Changes**: Return `pending_phone_verification` for new OAuth users
2. **Frontend Changes**: Navigate to phone entry + magic link verification
3. **Magic Link Service**: Implement SMS magic link sending/verification

**Pros**:
- More secure
- Collects phone numbers
- Consistent with phone signup flow

**Cons**:
- More complex
- Requires SMS service (Twilio)
- More steps for users

#### Option C: Hybrid (Balanced)

- **New OAuth users**: Collect phone in onboarding (no magic link)
- **Existing OAuth users**: Direct to Home

This is what the current implementation does.

## Recommended Action Plan

### Immediate (Fix Network Error)

1. **Update api.ts**:
```typescript
const API_BASE_URL: string = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:3000";
```

2. **Clear cache and restart**:
```bash
npx expo start --clear
```

3. **Verify backend is running**:
```bash
cd backend
npm start
```

4. **Test in app**:
- Try OAuth sign-in
- Check console logs
- Verify API calls succeed

### Short-term (Simplify OAuth)

**Match old repo behavior** for now:

```typescript
// TTSGolfApp/screens/login/index.tsx
<OAuthButtons
  onSuccess={async (data) => {
    // Simple: Always go to Home
    navigation.replace("Home");
  }}
  onError={(error) => {
    console.error("[LoginScreen] OAuth error:", error);
    Alert.alert("Sign In Failed", error);
  }}
/>
```

### Long-term (Add Magic Link if Needed)

If you want magic link verification for OAuth:

1. Implement magic link service
2. Update backend to return pending status
3. Add phone verification screen
4. Test complete flow

## Testing Checklist

### Network Connection
- [ ] Backend running on port 3000
- [ ] API_URL correct in app
- [ ] Health endpoint responds
- [ ] OAuth endpoints respond

### OAuth Flow
- [ ] Google sign-in works
- [ ] Apple sign-in works (iOS only)
- [ ] New users navigate correctly
- [ ] Existing users navigate correctly
- [ ] Session persists after login

### Error Handling
- [ ] Network errors show user-friendly message
- [ ] OAuth errors show user-friendly message
- [ ] App doesn't crash on error
- [ ] Logs show helpful debug info

## Debug Commands

### Check API URL in App
```typescript
console.log("[Debug] API_URL:", API_URL);
console.log("[Debug] ENV:", process.env.EXPO_PUBLIC_API_URL);
```

### Test Backend Connection
```bash
# From command line
curl http://10.0.2.2:3000/health

# Should return:
# {"status":"ok","message":"TTS Golf App API is running",...}
```

### Check Backend Logs
```bash
cd backend
npm start

# Watch for:
# - OAuth requests
# - Error messages
# - Response status codes
```

### Check App Logs
```bash
# In Metro bundler terminal
# Look for:
# - [OAuth] messages
# - [API] messages
# - Network errors
```

## Quick Fix Script

Create this file to quickly fix and restart:

**File**: `fix-and-restart.bat`
```batch
@echo off
echo Fixing API configuration...

REM Update API URL in api.ts
echo Updating api.ts...

REM Clear Metro cache
echo Clearing Metro cache...
cd TTSGolfApp
call npx expo start --clear

echo Done! App should restart with correct API URL.
```

## Summary

**Immediate Fix**:
1. Change API_BASE_URL default to `http://10.0.2.2:3000`
2. Clear Metro cache: `npx expo start --clear`
3. Verify backend is running
4. Test OAuth sign-in

**OAuth Flow**:
- **Recommended**: Match old repo (OAuth → Home directly)
- **Alternative**: Keep current flow (OAuth → Onboarding if needed → Home)
- **Future**: Add magic link verification if desired

The network error is likely due to the hardcoded remote IP. Once fixed, OAuth should work correctly.
