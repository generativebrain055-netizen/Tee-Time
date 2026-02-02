# Firebase Configuration Guide

Complete guide to configure Firebase for TeeTime Social application.

## Overview

TeeTime Social uses Firebase for:
- **Authentication**: Google Sign-In via Firebase Auth
- **Token Verification**: Firebase Admin SDK on backend
- **User Management**: Firebase user profiles

---

## Prerequisites

- Google/Gmail account
- Access to [Firebase Console](https://console.firebase.google.com/)
- Access to [Google Cloud Console](https://console.cloud.google.com/)

---

## Step 1: Create Firebase Project

### 1.1 Create Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter project name: `teetimesocial` (or your preferred name)
4. Enable Google Analytics (optional but recommended)
5. Click "Create project"

### 1.2 Note Project ID
- After creation, note your **Project ID** (e.g., `teetimesocial-abc123`)
- You'll need this for backend configuration

---

## Step 2: Enable Authentication

### 2.1 Enable Google Sign-In
1. In Firebase Console, go to **Authentication**
2. Click "Get started" if first time
3. Go to **Sign-in method** tab
4. Click on **Google**
5. Toggle "Enable"
6. Set support email (your email)
7. Click "Save"

### 2.2 Configure Authorized Domains
1. In Authentication → Settings → Authorized domains
2. Add your domains:
   - `localhost` (for development)
   - Your production domain (e.g., `yourdomain.com`)

---

## Step 3: Add Android App

### 3.1 Register Android App
1. In Firebase Console, click the Android icon (⚙️ Settings → Project settings)
2. Click "Add app" → Android
3. Enter details:
   - **Android package name**: `com.teetimesocial.app`
   - **App nickname**: TeeTime Social Android (optional)
   - **Debug signing certificate SHA-1**: See below

### 3.2 Get SHA-1 Fingerprint

**For Development (Debug Keystore):**
```bash
keytool -list -v -keystore TTSGolfApp/android/app/teetimesocial-release.keystore -alias teetimesocial-key-alias -storepass teetimesocial2024
```

**For Production:**
Use your release keystore SHA-1

### 3.3 Add SHA-1 to Firebase
1. Copy the SHA-1 fingerprint from keytool output
2. Paste in "Debug signing certificate SHA-1" field
3. Click "Register app"

### 3.4 Download google-services.json
1. Download `google-services.json`
2. Place in: `TTSGolfApp/google-services.json`
3. **Important**: This file contains your Android OAuth client ID

### 3.5 Verify OAuth Client Created
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to: APIs & Services → Credentials
4. You should see an **Android client** with your package name and SHA-1

---

## Step 4: Add iOS App (Optional)

### 4.1 Register iOS App
1. In Firebase Console, click the iOS icon
2. Click "Add app" → iOS
3. Enter details:
   - **iOS bundle ID**: `com.teetimesocial.app`
   - **App nickname**: TeeTime Social iOS (optional)

### 4.2 Download GoogleService-Info.plist
1. Download `GoogleService-Info.plist`
2. Place in: `TTSGolfApp/GoogleService-Info.plist`

### 4.3 Verify iOS OAuth Client
1. Go to Google Cloud Console → Credentials
2. You should see an **iOS client** with your bundle ID

---

## Step 5: Get Web Client ID

### 5.1 Find Web Client ID
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to: APIs & Services → Credentials
4. Find the **Web client** (auto-created by Firebase)
5. Copy the **Client ID** (ends with `.apps.googleusercontent.com`)

### 5.2 Note All Client IDs
You should have:
- **Android Client ID**: From google-services.json
- **Web Client ID**: From Google Cloud Console
- **iOS Client ID**: From GoogleService-Info.plist (if iOS app added)

---

## Step 6: Configure Backend

### 6.1 Update backend/.env
```env
# Firebase Project ID
FIREBASE_PROJECT_ID=your-project-id

# Google OAuth Client IDs
GOOGLE_CLIENT_ID_ANDROID=xxxxx-xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_ID_WEB=xxxxx-xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_ID_IOS=xxxxx-xxxxx.apps.googleusercontent.com
```

### 6.2 Where to Find Each Value

**FIREBASE_PROJECT_ID:**
- Firebase Console → Project Settings → General → Project ID

**GOOGLE_CLIENT_ID_ANDROID:**
- Open `TTSGolfApp/google-services.json`
- Find `oauth_client` array
- Look for `client_type: 1` (Android)
- Copy the `client_id`

**GOOGLE_CLIENT_ID_WEB:**
- Google Cloud Console → Credentials
- Find "Web client (auto created by Google Service)"
- Copy the Client ID

**GOOGLE_CLIENT_ID_IOS:**
- Open `TTSGolfApp/GoogleService-Info.plist`
- Find `CLIENT_ID` key
- Copy the value

---

## Step 7: Configure Mobile App

### 7.1 Update TTSGolfApp/.env
```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:android:abc123

# Google OAuth Web Client ID
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxxx-xxxxx.apps.googleusercontent.com
```

### 7.2 Where to Find Each Value

All values are in Firebase Console → Project Settings → General:

**EXPO_PUBLIC_FIREBASE_API_KEY:**
- Under "Your apps" → Android app → Web API Key

**EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN:**
- Format: `your-project-id.firebaseapp.com`

**EXPO_PUBLIC_FIREBASE_PROJECT_ID:**
- Project ID field

**EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET:**
- Format: `your-project-id.firebasestorage.app`

**EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:**
- Under "Cloud Messaging" → Sender ID

**EXPO_PUBLIC_FIREBASE_APP_ID:**
- Under "Your apps" → Android app → App ID

**EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:**
- Same as GOOGLE_CLIENT_ID_WEB from backend

---

## Step 8: Verify Configuration

### 8.1 Check google-services.json Structure
```json
{
  "project_info": {
    "project_id": "your-project-id"
  },
  "client": [{
    "oauth_client": [
      {
        "client_id": "xxxxx.apps.googleusercontent.com",
        "client_type": 1,  // Android client
        "android_info": {
          "package_name": "com.teetimesocial.app",
          "certificate_hash": "your_sha1_without_colons"
        }
      },
      {
        "client_id": "xxxxx.apps.googleusercontent.com",
        "client_type": 3  // Web client
      }
    ]
  }]
}
```

### 8.2 Verify OAuth Clients in Google Cloud
1. Go to Google Cloud Console → Credentials
2. You should see:
   - ✅ Android client (with package name and SHA-1)
   - ✅ Web client (auto created by Google Service)
   - ✅ iOS client (if iOS app added)

---

## Step 9: Test Configuration

### 9.1 Start Backend
```bash
cd backend
npm start
```

Check logs for:
```
[SUPABASE] Connection successful
HTTP Server is running on port 3000
```

### 9.2 Start Mobile App
```bash
cd TTSGolfApp
npx expo run:android
```

### 9.3 Test Google Sign-In
1. Open app on emulator/device
2. Tap "Continue with Google"
3. Select Google account
4. Should successfully sign in

### 9.4 Check Backend Logs
Look for:
```
Firebase token verified successfully
Google sign in successful
```

---

## Troubleshooting

### Error: "DEVELOPER_ERROR"
**Cause**: SHA-1 fingerprint not added or incorrect

**Solution**:
1. Verify SHA-1 is added to Firebase
2. Download updated google-services.json
3. Rebuild app

### Error: "No ID token received"
**Cause**: OAuth client not properly configured

**Solution**:
1. Check google-services.json has Android client (client_type: 1)
2. Verify SHA-1 matches your keystore
3. Ensure google-services.json is in TTSGolfApp/

### Error: "Invalid Google token"
**Cause**: Backend can't verify Firebase token

**Solution**:
1. Check FIREBASE_PROJECT_ID in backend/.env
2. Verify firebase-admin is installed
3. Restart backend server

### Error: "Network request failed"
**Cause**: Mobile app can't reach backend

**Solution**:
1. Check EXPO_PUBLIC_API_URL uses your local IP (not localhost)
2. Verify backend is running
3. Check firewall allows port 3000

---

## Security Best Practices

### 1. Protect Configuration Files
- ✅ Never commit `.env` files
- ✅ Never commit `google-services.json` to public repos
- ✅ Never commit `GoogleService-Info.plist` to public repos
- ✅ Use `.env.example` templates instead

### 2. Use Different Projects for Dev/Prod
- Development: `teetimesocial-dev`
- Production: `teetimesocial-prod`

### 3. Restrict API Keys
1. Go to Google Cloud Console → Credentials
2. Click on API key
3. Set application restrictions:
   - Android apps: Add package name and SHA-1
   - iOS apps: Add bundle ID
4. Set API restrictions to only needed APIs

### 4. Monitor Usage
1. Firebase Console → Usage and billing
2. Set up budget alerts
3. Monitor authentication usage

---

## Configuration Checklist

- [ ] Firebase project created
- [ ] Google Sign-In enabled in Authentication
- [ ] Android app added to Firebase
- [ ] SHA-1 fingerprint added
- [ ] google-services.json downloaded and placed
- [ ] iOS app added (if needed)
- [ ] GoogleService-Info.plist downloaded and placed (if iOS)
- [ ] Web Client ID obtained
- [ ] Backend .env configured with all client IDs
- [ ] Mobile app .env configured with Firebase values
- [ ] Backend starts without errors
- [ ] Mobile app builds successfully
- [ ] Google Sign-In works in app
- [ ] Backend verifies tokens successfully

---

## Quick Reference

### File Locations
```
TeeTimeApp/
├── backend/
│   └── .env                          # Backend configuration
├── TTSGolfApp/
│   ├── .env                          # Mobile app configuration
│   ├── google-services.json          # Firebase Android config
│   └── GoogleService-Info.plist      # Firebase iOS config
└── docs/
    └── FIREBASE_CONFIGURATION.md     # This file
```

### Required Environment Variables

**Backend (.env):**
```env
FIREBASE_PROJECT_ID=your-project-id
GOOGLE_CLIENT_ID_ANDROID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_ID_WEB=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_ID_IOS=xxxxx.apps.googleusercontent.com
```

**Mobile App (.env):**
```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:android:abc123
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

---

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Google Sign-In for Android](https://developers.google.com/identity/sign-in/android)
- [React Native Firebase](https://rnfirebase.io/)

---

## Support

For issues with this configuration:
1. Check [Troubleshooting](#troubleshooting) section
2. Review [CONFIGURATION.md](../CONFIGURATION.md)
3. See [SETUP_GUIDE.md](./SETUP_GUIDE.md)

---

**Last Updated**: February 1, 2026
