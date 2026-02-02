# Apple Sign In Setup Guide

Complete guide to configure Apple Sign In for TeeTime Social.

## Overview

Apple Sign In is required for iOS app submission and provides a secure authentication method for users.

## Prerequisites

- Apple Developer Account ($99/year)
- Access to [Apple Developer Portal](https://developer.apple.com/account/)

---

## Step 1: Create App ID

### 1.1 Register App ID
1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list)
2. Click the "+" button to create a new identifier
3. Select "App IDs" and click "Continue"
4. Select "App" and click "Continue"

### 1.2 Configure App ID
- **Description**: TeeTime Social
- **Bundle ID**: `com.teetimesocial.app` (Explicit)
- **Capabilities**: Check "Sign In with Apple"
- Click "Continue" and "Register"

---

## Step 2: Create Service ID

### 2.1 Register Service ID
1. Go to Identifiers → Click "+" button
2. Select "Services IDs" and click "Continue"

### 2.2 Configure Service ID
- **Description**: TeeTime Social Web Service
- **Identifier**: `com.teetimesocial.app.signin`
- Check "Sign In with Apple"
- Click "Continue" and "Register"

### 2.3 Configure Sign In with Apple
1. Click on your Service ID
2. Check "Sign In with Apple"
3. Click "Configure"
4. **Primary App ID**: Select `com.teetimesocial.app`
5. **Domains and Subdomains**: Add your backend domain
   - Development: `localhost` (for testing)
   - Production: `api.yourdomain.com`
6. **Return URLs**: Add callback URLs
   - Development: `http://localhost:3000/auth/apple/callback`
   - Production: `https://api.yourdomain.com/auth/apple/callback`
7. Click "Save" and "Continue"

---

## Step 3: Create Sign In with Apple Key

### 3.1 Create Key
1. Go to [Keys](https://developer.apple.com/account/resources/authkeys/list)
2. Click the "+" button
3. **Key Name**: TeeTime Social Apple Sign In Key
4. Check "Sign In with Apple"
5. Click "Configure" next to Sign In with Apple
6. **Primary App ID**: Select `com.teetimesocial.app`
7. Click "Save"
8. Click "Continue" and "Register"

### 3.2 Download Key
1. **Download the key file** (AuthKey_XXXXXXXXXX.p8)
2. **IMPORTANT**: You can only download this once!
3. Note the **Key ID** (e.g., `56NH9S782N`)
4. Note your **Team ID** (top right of page, e.g., `P2DD49N89K`)

### 3.3 Store Key Securely
```bash
# Move the downloaded key to config/keys/
mv ~/Downloads/AuthKey_XXXXXXXXXX.p8 config/keys/
```

**Security Notes:**
- ⚠️ Never commit this file to version control
- ⚠️ Keep a secure backup (encrypted storage)
- ⚠️ You cannot download it again if lost

---

## Step 4: Configure Backend

### 4.1 Update backend/.env
```env
# Apple Sign In Configuration
APPLE_CLIENT_ID=com.teetimesocial.app
APPLE_SERVICE_ID=com.teetimesocial.app.signin
APPLE_TEAM_ID=P2DD49N89K
APPLE_KEY_ID=56NH9S782N
APPLE_PRIVATE_KEY_PATH=../config/keys/AuthKey_56NH9S782N-1.p8
```

### 4.2 Verify File Path
The path is relative to the backend directory:
```
TeeTimeApp/
├── backend/
│   └── .env (references ../config/keys/...)
└── config/
    └── keys/
        └── AuthKey_56NH9S782N-1.p8
```

---

## Step 5: Configure Mobile App

### 5.1 iOS Configuration (app.json)
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.teetimesocial.app",
      "usesAppleSignIn": true
    }
  }
}
```

### 5.2 Add Capability
In Xcode (for production builds):
1. Open project in Xcode
2. Select target → Signing & Capabilities
3. Click "+ Capability"
4. Add "Sign In with Apple"

---

## Step 6: Test Configuration

### 6.1 Test Backend
```bash
cd backend
npm start
```

Check logs for:
```
HTTP Server is running on port 3000
```

### 6.2 Test Apple Sign In
1. Run app on iOS device or simulator
2. Tap "Continue with Apple"
3. Sign in with Apple ID
4. Should successfully authenticate

### 6.3 Check Backend Logs
Look for:
```
Apple sign in successful
```

---

## Troubleshooting

### Error: "ENOENT: no such file or directory"
**Cause**: Apple key file not found

**Solution**:
1. Verify file exists: `ls config/keys/AuthKey_*.p8`
2. Check path in backend/.env matches filename
3. Ensure path is relative: `../config/keys/AuthKey_*.p8`

### Error: "Invalid key"
**Cause**: Wrong key file or corrupted

**Solution**:
1. Re-download key from Apple Developer Portal (if possible)
2. Verify file is not corrupted
3. Check file permissions: `chmod 600 config/keys/AuthKey_*.p8`

### Error: "Invalid client_id"
**Cause**: APPLE_CLIENT_ID doesn't match App ID

**Solution**:
1. Verify APPLE_CLIENT_ID matches your App ID exactly
2. Check for typos in bundle identifier

### Error: "Invalid service_id"
**Cause**: APPLE_SERVICE_ID doesn't match Service ID

**Solution**:
1. Verify APPLE_SERVICE_ID matches your Service ID exactly
2. Ensure Service ID is configured for Sign In with Apple

### Error: "Invalid team_id or key_id"
**Cause**: Wrong Team ID or Key ID

**Solution**:
1. Get Team ID from Apple Developer Portal (top right)
2. Get Key ID from the key details page
3. Update backend/.env with correct values

---

## File Locations

### Apple Key File
```
config/
└── keys/
    └── AuthKey_56NH9S782N-1.p8  # Your actual key file
```

### Backend Configuration
```
backend/
└── .env
    APPLE_PRIVATE_KEY_PATH=../config/keys/AuthKey_56NH9S782N-1.p8
```

### Mobile App Configuration
```
TTSGolfApp/
└── app.json
    "ios": {
      "usesAppleSignIn": true
    }
```

---

## Security Best Practices

### 1. Protect the Key File
- ✅ Store in `config/keys/` (gitignored)
- ✅ Set restrictive permissions: `chmod 600`
- ✅ Keep encrypted backup
- ❌ Never commit to version control
- ❌ Never share via email/chat

### 2. Use Different Keys for Environments
- Development: Use test key
- Production: Use production key
- Keep them separate

### 3. Rotate Keys Regularly
- Create new key annually
- Update backend configuration
- Revoke old key after migration

### 4. Monitor Usage
- Check Apple Developer Portal for key usage
- Monitor authentication logs
- Set up alerts for failures

---

## Production Checklist

- [ ] App ID created with Sign In with Apple capability
- [ ] Service ID created and configured
- [ ] Key created and downloaded
- [ ] Key file stored in `config/keys/`
- [ ] Backend .env configured with correct values
- [ ] Mobile app configured with `usesAppleSignIn: true`
- [ ] Tested on iOS device
- [ ] Backend successfully verifies Apple tokens
- [ ] Key file backed up securely
- [ ] Production domains added to Service ID

---

## Environment Variables Reference

```env
# Required for Apple Sign In
APPLE_CLIENT_ID=com.teetimesocial.app
APPLE_SERVICE_ID=com.teetimesocial.app.signin
APPLE_TEAM_ID=P2DD49N89K
APPLE_KEY_ID=56NH9S782N
APPLE_PRIVATE_KEY_PATH=../config/keys/AuthKey_56NH9S782N-1.p8
```

**Where to find each value:**
- **APPLE_CLIENT_ID**: Your App ID bundle identifier
- **APPLE_SERVICE_ID**: Your Service ID identifier
- **APPLE_TEAM_ID**: Apple Developer Portal → Top right corner
- **APPLE_KEY_ID**: Key details page after creating key
- **APPLE_PRIVATE_KEY_PATH**: Path to downloaded .p8 file

---

## Additional Resources

- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Sign In with Apple REST API](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

---

## Support

For issues with Apple Sign In:
1. Check [Troubleshooting](#troubleshooting) section
2. Review [docs/CONFIGURATION.md](CONFIGURATION.md)
3. Verify all credentials in Apple Developer Portal

---

**Last Updated**: February 1, 2026
