# OAuth Implementation Guide

## Overview

This implementation provides secure Google and Apple OAuth authentication following modern security best practices. All OAuth providers map to a single unified user system with proper account linking.

## Architecture

### Database Schema

```sql
-- Users table (existing)
users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  is_verified BOOLEAN DEFAULT false,
  ...
)

-- OAuth providers table (new)
auth_providers (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  provider VARCHAR(20) NOT NULL,  -- 'google', 'apple', etc.
  provider_user_id VARCHAR(255) NOT NULL,  -- OAuth 'sub' field
  provider_email VARCHAR(255),
  provider_data JSONB,
  created_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  UNIQUE(provider, provider_user_id)
)
```

### Key Principles

1. **Single User System**: One user can have multiple OAuth providers linked
2. **Provider Independence**: OAuth providers prove identity, your database owns the user
3. **Secure Token Verification**: All tokens are cryptographically verified
4. **No Orphan Accounts**: Never auto-create accounts without required information

## OAuth Flow

### Step 1: Initial OAuth Request

**Google:**
```
POST /auth/google
Body: { idToken: "..." }
```

**Apple:**
```
POST /auth/apple
Body: { 
  identityToken: "...",
  user: { name: { firstName: "...", lastName: "..." } }  // Only on first sign-in
}
```

### Step 2: Token Verification

The backend:
1. Verifies token signature using provider's public keys
2. Validates `aud`, `iss`, `exp` claims
3. Extracts user information (sub, email, name, etc.)

### Step 3: User Resolution Logic

```
┌─────────────────────────────────────┐
│ OAuth Token Verified                │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Check: Provider Link Exists?        │
│ (provider + provider_user_id)       │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┐
        │             │
       YES           NO
        │             │
        ▼             ▼
┌──────────────┐  ┌──────────────────────┐
│ Log User In  │  │ Check: Email Exists? │
└──────────────┘  │ (verified email)     │
                  └──────────┬───────────┘
                             │
                      ┌──────┴──────┐
                      │             │
                     YES           NO
                      │             │
                      ▼             ▼
              ┌──────────────┐  ┌─────────────────────┐
              │ Link Provider│  │ Email Provided &    │
              │ Log User In  │  │ Verified?           │
              └──────────────┘  └──────────┬──────────┘
                                           │
                                    ┌──────┴──────┐
                                    │             │
                                   YES           NO
                                    │             │
                                    ▼             ▼
                            ┌──────────────┐  ┌──────────────────┐
                            │ Create User  │  │ Request          │
                            │ Link Provider│  │ Additional Info  │
                            │ Log User In  │  │ (temp token)     │
                            └──────────────┘  └──────────────────┘
```

### Step 4: Response Types

#### A. Authenticated (Complete)
```json
{
  "status": "authenticated",
  "success": true,
  "accessToken": "JWT_TOKEN",
  "refreshToken": "REFRESH_TOKEN",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "phoneNumber": "+1234567890",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### B. Additional Info Required
```json
{
  "status": "additional_info_required",
  "success": true,
  "tempToken": "TEMP_SESSION_TOKEN",
  "requiredFields": ["email", "phoneNumber"],
  "providedData": {
    "email": null,
    "firstName": "John",
    "lastName": "Doe",
    "picture": "https://..."
  },
  "message": "Please complete your profile to continue"
}
```

### Step 5: Complete Profile (if needed)

```
POST /auth/complete-profile
Body: {
  tempToken: "TEMP_SESSION_TOKEN",
  email: "user@example.com",
  phoneNumber: "+1234567890",
  firstName: "John",  // Optional if already provided
  lastName: "Doe",    // Optional if already provided
  username: "johndoe",  // Optional
  handicap: 12  // Optional
}

Response: Same as "Authenticated" above
```

## Security Features

### Token Verification

**Google:**
- Uses `google-auth-library` for signature verification
- Validates against multiple client IDs (iOS, Android, Web)
- Checks issuer: `accounts.google.com`
- Validates expiration

**Apple:**
- Fetches Apple's public keys from JWKS endpoint
- Verifies RS256 signature
- Validates issuer: `https://appleid.apple.com`
- Checks audience matches your client ID
- Validates expiration

### CSRF Protection

- State parameter should be used in web OAuth flows
- Mobile apps use native SDKs which handle this automatically

### No Long-term OAuth Tokens

- OAuth access tokens are NOT stored
- Only provider link (sub + provider) is stored
- Your own JWT tokens are issued for sessions

### Email Verification

- Only verified emails are used for account linking
- Apple private relay emails are treated as unverified
- Unverified emails require additional confirmation

## Environment Variables

```bash
# Google OAuth
GOOGLE_CLIENT_ID_IOS=your-ios-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_ID_ANDROID=your-android-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_ID_WEB=your-web-client-id.apps.googleusercontent.com

# Apple Sign In
APPLE_CLIENT_ID=com.yourapp.bundle
APPLE_SERVICE_ID=com.yourapp.bundle.signin
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_KEY_ID=YOUR_KEY_ID
APPLE_PRIVATE_KEY_PATH=./config/AuthKey_XXXXX.p8

# JWT (existing)
JWT_SECRET=your-secret-key
```

## API Endpoints

### POST /auth/google
Authenticate with Google ID token

**Request:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

**Response:** See "Response Types" above

---

### POST /auth/apple
Authenticate with Apple identity token

**Request:**
```json
{
  "identityToken": "eyJraWQiOiJlWGF1bm1MIiwiYWxnIjoiUlMyNTYifQ...",
  "user": {
    "name": {
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

**Response:** See "Response Types" above

---

### POST /auth/complete-profile
Complete OAuth profile with additional information

**Request:**
```json
{
  "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "email": "user@example.com",
  "phoneNumber": "+1234567890",
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "handicap": 12
}
```

**Response:** Authenticated response with tokens

---

## Mobile App Integration

### Google Sign-In (React Native)

```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Configure
GoogleSignin.configure({
  iosClientId: 'YOUR_IOS_CLIENT_ID',
  webClientId: 'YOUR_WEB_CLIENT_ID',
});

// Sign in
const signInWithGoogle = async () => {
  await GoogleSignin.hasPlayServices();
  const userInfo = await GoogleSignin.signIn();
  const { idToken } = userInfo;
  
  // Send to backend
  const response = await fetch('https://api.yourapp.com/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken })
  });
  
  const data = await response.json();
  
  if (data.status === 'authenticated') {
    // Save tokens and navigate to app
    await AsyncStorage.setItem('accessToken', data.accessToken);
    await AsyncStorage.setItem('refreshToken', data.refreshToken);
    navigation.navigate('Home');
  } else if (data.status === 'additional_info_required') {
    // Navigate to profile completion screen
    navigation.navigate('CompleteProfile', {
      tempToken: data.tempToken,
      providedData: data.providedData,
      requiredFields: data.requiredFields
    });
  }
};
```

### Apple Sign-In (React Native)

```typescript
import * as AppleAuthentication from 'expo-apple-authentication';

const signInWithApple = async () => {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  
  // Send to backend
  const response = await fetch('https://api.yourapp.com/auth/apple', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identityToken: credential.identityToken,
      user: credential.fullName ? {
        name: {
          firstName: credential.fullName.givenName,
          lastName: credential.fullName.familyName
        }
      } : undefined
    })
  });
  
  // Handle response same as Google
};
```

## Testing

### Test Google OAuth (Development)

```bash
# Get a test ID token from Google OAuth Playground
# https://developers.google.com/oauthplayground/

curl -X POST http://localhost:3000/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "YOUR_TEST_TOKEN"
  }'
```

### Test Apple OAuth (Development)

Apple tokens can only be obtained through actual sign-in flow. Use iOS Simulator or TestFlight for testing.

## Database Migration

Run the migration to add the `auth_providers` table:

```bash
# Using Supabase SQL Editor
# Copy and paste: backend/schema/migrations/add_oauth_providers.sql

# Or using psql
psql -h your-db-host -U your-user -d your-db -f backend/schema/migrations/add_oauth_providers.sql
```

## Troubleshooting

### "Invalid Google token"
- Check that client IDs are correctly configured
- Verify token hasn't expired
- Ensure token audience matches your client IDs

### "Invalid Apple token"
- Verify APPLE_CLIENT_ID matches your app bundle ID
- Check that token is fresh (Apple tokens expire quickly)
- Ensure JWKS endpoint is accessible

### "Email already registered"
- This is expected behavior when linking providers
- The system will automatically link the provider to existing account

### "Phone number already registered"
- User needs to use a different phone number
- Or sign in with existing account and link OAuth provider

## Best Practices

1. **Always verify tokens server-side** - Never trust client-provided user info
2. **Use HTTPS in production** - OAuth tokens must be transmitted securely
3. **Rotate JWT secrets regularly** - Update JWT_SECRET periodically
4. **Monitor failed auth attempts** - Log and alert on suspicious activity
5. **Handle token expiration gracefully** - Implement proper refresh token flow
6. **Test with real devices** - OAuth behavior differs between simulator and device
7. **Keep dependencies updated** - Regularly update google-auth-library and jwks-rsa

## Support

For issues or questions:
1. Check logs in `backend/logs/`
2. Review error messages in API responses
3. Verify environment variables are set correctly
4. Test with OAuth playground tools
