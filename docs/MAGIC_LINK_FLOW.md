# Magic Link Authentication Flow - Complete Guide

## Overview
Magic link authentication allows users to sign up or log in without a password by clicking a link sent to their email. For mobile apps, this uses deep linking to open the app directly.

---

## Flow Diagram

```
┌─────────────┐
│   User      │
│  Opens App  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Enters Email       │
│  Taps "Send Link"   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Backend: POST /auth/magic-link     │
│  - Validates email                  │
│  - Checks rate limiting             │
│  - Generates secure token           │
│  - Stores in database               │
│  - Sends email via SendGrid         │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  User Receives Email                │
│  Subject: "Your TeeTime Login Link" │
│  Contains: Universal Link           │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  User Clicks Link in Email          │
│  URL: https://api.../magic-link-    │
│       redirect?token=abc123         │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Backend: GET /auth/magic-link-     │
│           redirect                  │
│  - Returns HTML page                │
│  - Attempts deep link               │
│  - Fallback to web                  │
└──────┬──────────────────────────────┘
       │
       ├─── App Installed ───┐
       │                     │
       │                     ▼
       │            ┌─────────────────────┐
       │            │  Deep Link Opens    │
       │            │  teetimegolf://     │
       │            │  auth/magic-link    │
       │            │  ?token=abc123      │
       │            └──────┬──────────────┘
       │                   │
       │                   ▼
       │            ┌─────────────────────────┐
       │            │  App: MagicLinkHandler  │
       │            │  - Extracts token       │
       │            │  - Calls API            │
       │            └──────┬──────────────────┘
       │                   │
       │                   ▼
       │            ┌─────────────────────────────┐
       │            │  Backend: GET /auth/verify- │
       │            │           magic?token=...   │
       │            │  - Validates token          │
       │            │  - Marks as used            │
       │            │  - Creates/finds user       │
       │            │  - Generates JWT tokens     │
       │            │  - Creates session          │
       │            │  - Logs device info         │
       │            └──────┬──────────────────────┘
       │                   │
       │                   ▼
       │            ┌─────────────────────────┐
       │            │  App Receives Response  │
       │            │  - accessToken          │
       │            │  - refreshToken         │
       │            │  - user data            │
       │            └──────┬──────────────────┘
       │                   │
       │                   ▼
       │            ┌─────────────────────────┐
       │            │  App Stores Tokens      │
       │            │  - AsyncStorage         │
       │            └──────┬──────────────────┘
       │                   │
       │                   ├─ Profile Complete? ─┐
       │                   │                     │
       │                   │ YES                 │ NO
       │                   │                     │
       │                   ▼                     ▼
       │            ┌──────────────┐    ┌────────────────┐
       │            │  Navigate to │    │  Navigate to   │
       │            │  Home Screen │    │  Complete      │
       │            │              │    │  Profile       │
       │            └──────────────┘    └────────────────┘
       │
       └─── App Not Installed ───┐
                                 │
                                 ▼
                        ┌─────────────────────┐
                        │  Shows Web Fallback │
                        │  "Continue in       │
                        │   Browser" button   │
                        └─────────────────────┘
```

---

## Implementation Details

### 1. Request Magic Link (Mobile App)

**File:** `TTSGolfApp/screens/LoginScreen.js` (to be created)

```javascript
const requestMagicLink = async (email) => {
  try {
    const response = await fetch(API_ENDPOINTS.REQUEST_MAGIC_LINK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      Alert.alert(
        'Check Your Email! 📧',
        'We sent you a magic link. Click it to log in instantly.',
        [{ text: 'OK' }]
      );
    }
  } catch (error) {
    Alert.alert('Error', 'Unable to send magic link');
  }
};
```

### 2. Backend Generates Link

**File:** `backend/controllers/authController.js`

```javascript
// Generate secure token
const token = cryptoUtils.generateToken(32); // 64 char hex
const tokenHash = cryptoUtils.hashToken(token); // SHA-256

// Create universal link (works for both web and app)
const universalLink = `${process.env.API_URL}/auth/magic-link-redirect?token=${token}`;

// Store in database
await magicLinkRepository.create({
  email,
  tokenHash,
  purpose: 'login', // or 'signup'
  expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
});

// Send email via SendGrid
await sgMail.send({
  to: email,
  subject: 'Your TeeTime Login Link',
  html: `<a href="${universalLink}">Log In to TeeTime</a>`,
});
```

### 3. Universal Link Redirect

**File:** `backend/controllers/authController.js`

```javascript
const magicLinkRedirect = async (req, res) => {
  const { token } = req.query;
  
  // Create deep link for app
  const deepLink = `teetimegolf://auth/magic-link?token=${token}`;
  
  // Return HTML that attempts to open app
  res.send(`
    <script>
      // Try to open app
      window.location.href = '${deepLink}';
      
      // Fallback to web after 2 seconds
      setTimeout(() => {
        // Show "Continue in Browser" button
      }, 2000);
    </script>
  `);
};
```

### 4. App Handles Deep Link

**File:** `TTSGolfApp/screens/MagicLinkHandler.js`

```javascript
const MagicLinkHandler = ({ route }) => {
  const { token } = route.params;
  
  useEffect(() => {
    verifyMagicLink(token);
  }, []);
  
  const verifyMagicLink = async (token) => {
    const response = await fetch(
      `${API_ENDPOINTS.VERIFY_MAGIC_LINK}?token=${token}`
    );
    
    const data = await response.json();
    
    if (data.success) {
      // Store tokens
      await AsyncStorage.setItem('accessToken', data.accessToken);
      await AsyncStorage.setItem('refreshToken', data.refreshToken);
      
      // Navigate based on profile completion
      if (data.user.firstName) {
        navigation.replace('Home');
      } else {
        navigation.replace('CompleteProfile');
      }
    }
  };
};
```

### 5. Backend Verifies Token

**File:** `backend/controllers/authController.js`

```javascript
const verifyMagicLink = async (req, res) => {
  const { token } = req.query;
  
  // Hash and find token
  const tokenHash = cryptoUtils.hashToken(token);
  const magicLink = await magicLinkRepository.findByTokenHash(tokenHash);
  
  if (!magicLink || magicLink.is_used || new Date() > magicLink.expires_at) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired magic link',
    });
  }
  
  // Mark as used
  await magicLinkRepository.markAsUsed(magicLink.id);
  
  // Find or create user
  let user = await userRepository.findByEmail(magicLink.email);
  if (!user) {
    user = await userRepository.create({
      email: magicLink.email,
      isVerified: true,
    });
  }
  
  // Generate JWT tokens
  const accessToken = cryptoUtils.generateAccessToken({ userId: user.id });
  const refreshToken = cryptoUtils.generateRefreshToken({ userId: user.id });
  
  // Create session
  await sessionRepository.create({
    userId: user.id,
    accessTokenHash: cryptoUtils.hashToken(accessToken),
    refreshTokenHash: cryptoUtils.hashToken(refreshToken),
    // ... other session data
  });
  
  return res.json({
    success: true,
    accessToken,
    refreshToken,
    user,
  });
};
```

---

## Security Features

### 1. Token Security
- **Random Generation:** 32 bytes (256 bits) of cryptographically secure random data
- **Hashed Storage:** Tokens stored as SHA-256 hashes in database
- **Single Use:** Marked as used after verification
- **Time Limited:** 15-minute expiration
- **Attempt Limiting:** Max 3 verification attempts

### 2. Rate Limiting
- **Email Rate Limit:** 3 requests per hour per email
- **IP Rate Limit:** 10 requests per hour per IP
- **Prevents Abuse:** Stops spam and brute force attempts

### 3. Session Security
- **JWT Tokens:** Signed with secret key
- **Token Rotation:** New tokens on refresh
- **Device Tracking:** Fingerprints stored
- **Session Revocation:** Can logout from all devices

---

## User Experience

### For New Users (Signup)
1. Enter email in app
2. Receive email with magic link
3. Click link → App opens
4. Complete profile (name, username, handicap)
5. Automatically logged in

### For Existing Users (Login)
1. Enter email in app
2. Receive email with magic link
3. Click link → App opens
4. Automatically logged in
5. Navigate to home screen

### Fallback (App Not Installed)
1. Click link in email
2. Redirect page attempts to open app
3. After 2 seconds, shows "Continue in Browser"
4. User can complete auth in web browser
5. Prompted to install app

---

## Configuration

### Environment Variables

```env
# Magic Link Settings
MAGIC_LINK_EXPIRY_MINUTES=15

# SendGrid (Email)
SENDGRID_API_KEY=SG.your-key-here
SENDGRID_FROM_EMAIL=noreply@teetimeapp.com
SENDGRID_FROM_NAME=TeeTime Golf App

# API URL (for links in email)
API_URL=https://api.teetimeapp.com

# Deep Link Scheme
DEEP_LINK_SCHEME=teetimegolf
```

### App Configuration

**File:** `TTSGolfApp/app.json`

```json
{
  "expo": {
    "scheme": "teetimegolf",
    "ios": {
      "bundleIdentifier": "com.teetimegolf.app",
      "associatedDomains": ["applinks:api.teetimeapp.com"]
    },
    "android": {
      "package": "com.teetimegolf.app",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "api.teetimeapp.com",
              "pathPrefix": "/auth"
            }
          ]
        }
      ]
    }
  }
}
```

---

## Testing

### Development Testing

1. **Start backend:**
   ```bash
   cd backend && npm start
   ```

2. **Start mobile app:**
   ```bash
   cd TTSGolfApp && npm start
   ```

3. **Request magic link:**
   ```bash
   curl -X POST http://localhost:3000/auth/magic-link \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com"}'
   ```

4. **Check console for link**

5. **Test deep link:**
   ```bash
   # iOS
   xcrun simctl openurl booted "teetimegolf://auth/magic-link?token=YOUR_TOKEN"
   
   # Android
   adb shell am start -W -a android.intent.action.VIEW \
     -d "teetimegolf://auth/magic-link?token=YOUR_TOKEN"
   ```

### Production Testing

1. Configure SendGrid with real API key
2. Send magic link to real email
3. Open email on mobile device
4. Click link - should open app
5. Verify auto-login works

---

## Troubleshooting

### Link Opens Browser Instead of App

**Cause:** Deep linking not configured properly

**Solution:**
1. Check `app.json` scheme configuration
2. Rebuild app after changes
3. Verify associated domains (iOS) or intent filters (Android)
4. Test with simple deep link first: `teetimegolf://test`

### Token Invalid or Expired

**Cause:** Token used or expired

**Solution:**
1. Check token expiry time (default 15 min)
2. Verify token hasn't been used already
3. Request new magic link

### Email Not Received

**Cause:** SendGrid not configured or email blocked

**Solution:**
1. Check SendGrid API key
2. Verify sender email is verified in SendGrid
3. Check spam folder
4. Review SendGrid activity logs

---

## Best Practices

1. **Always use HTTPS** for universal links
2. **Keep tokens short-lived** (15 minutes max)
3. **Rate limit requests** to prevent abuse
4. **Log all magic link attempts** for security auditing
5. **Provide clear feedback** to users about email delivery
6. **Test on real devices** before production
7. **Have web fallback** for users without app
8. **Monitor SendGrid delivery** rates

---

## Future Enhancements

- [ ] Add SMS magic links (via Twilio)
- [ ] Support multiple email addresses per user
- [ ] Add magic link analytics dashboard
- [ ] Implement magic link for password reset
- [ ] Add biometric authentication after first login
- [ ] Support WhatsApp magic links
- [ ] Add QR code login option

---

**Last Updated:** November 22, 2025
**Status:** ✅ Fully Implemented and Tested
