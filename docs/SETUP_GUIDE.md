# TeeTime Social - Complete Setup Guide

This guide consolidates all setup instructions for the TeeTime Social application.

## Table of Contents
1. [Environment Setup](#environment-setup)
2. [Firebase Configuration](#firebase-configuration)
3. [OAuth Setup](#oauth-setup)
4. [Keystore Configuration](#keystore-configuration)
5. [Installation on Device](#installation-on-device)

---

## Environment Setup

### Prerequisites
- Node.js (v18 or higher)
- Android Studio with Android SDK
- Expo CLI
- PostgreSQL (via Supabase)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
npm install
```

2. Configure environment variables in `backend/.env`:
```env
# Server
NODE_ENV=development
PORT=3000

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Twilio (SMS/OTP)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=your_phone_number

# SendGrid (Email)
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Google OAuth
GOOGLE_CLIENT_ID_IOS=your_ios_client_id
GOOGLE_CLIENT_ID_ANDROID=your_android_client_id
GOOGLE_CLIENT_ID_WEB=your_web_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
FIREBASE_PROJECT_ID=your_firebase_project_id

# Apple Sign In
APPLE_CLIENT_ID=com.teetimesocial.app
APPLE_SERVICE_ID=com.teetimesocial.app.signin
APPLE_TEAM_ID=your_team_id
APPLE_KEY_ID=your_key_id
APPLE_PRIVATE_KEY_PATH=config/keys/AuthKey.p8
```

3. Start backend:
```bash
npm start
```

### Mobile App Setup

1. Navigate to app directory:
```bash
cd TTSGolfApp
npm install
```

2. Configure environment variables in `TTSGolfApp/.env`:
```env
# Backend API
EXPO_PUBLIC_API_URL=http://your_ip:3000

# Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google OAuth
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id
```

3. Start development server:
```bash
npx expo start
```

---

## Firebase Configuration

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Enable Google Sign-In in Authentication → Sign-in method

### 2. Android App Setup
1. Add Android app in Project Settings
2. Package name: `com.teetimesocial.app`
3. Download `google-services.json`
4. Place in `TTSGolfApp/google-services.json`

### 3. iOS App Setup
1. Add iOS app in Project Settings
2. Bundle ID: `com.teetimesocial.app`
3. Download `GoogleService-Info.plist`
4. Place in `TTSGolfApp/GoogleService-Info.plist`

### 4. Add SHA-1 Fingerprint
Get your debug keystore SHA-1:
```bash
keytool -list -v -keystore TTSGolfApp/android/app/teetimesocial-release.keystore -alias teetimesocial-key-alias -storepass teetimesocial2024
```

Add the SHA-1 fingerprint to Firebase:
- Go to Project Settings → Your Android App
- Scroll to SHA certificate fingerprints
- Click "Add fingerprint" and paste SHA-1

---

## OAuth Setup

### Google OAuth Configuration

1. **Google Cloud Console**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Select your Firebase project
   - Navigate to APIs & Services → Credentials

2. **Create OAuth Credentials**
   - Android OAuth Client:
     - Package name: `com.teetimesocial.app`
     - SHA-1: Your keystore fingerprint
   - Web OAuth Client (for backend)
   - iOS OAuth Client (if needed)

3. **Update Environment Variables**
   - Add all client IDs to backend `.env`
   - Add web client ID to app `.env`

### Apple Sign In Configuration

1. **Apple Developer Account**
   - Create App ID with Sign In with Apple capability
   - Create Service ID for web authentication
   - Create Key for Sign In with Apple

2. **Configure Backend**
   - Place Apple private key in `backend/config/keys/`
   - Update Apple credentials in backend `.env`

---

## Keystore Configuration

### Production Keystore
Location: `TTSGolfApp/android/app/teetimesocial-release.keystore`

**Credentials:**
- Alias: `teetimesocial-key-alias`
- Store Password: `teetimesocial2024`
- Key Password: `teetimesocial2024`
- Validity: 10,000 days (until June 19, 2053)

**Certificate Fingerprints:**
- SHA-1: `4E:60:C0:95:4D:4B:97:88:26:AD:1B:16:34:34:0C:1C:AC:5B:7D:8C`
- SHA-256: `92:F2:96:54:EE:C4:62:B8:60:72:E6:D9:11:F4:26:AC:1E:F0:61:02:5F:66:B4:B4:70:44:78:B6:5B:B1:98:F1`

**Important:** Keep keystore file secure and never commit to version control.

---

## Installation on Device

### Install on Physical Android Device

1. **Enable USB Debugging:**
   - Settings → About Phone
   - Tap "Build Number" 7 times
   - Settings → Developer Options
   - Enable "USB Debugging"

2. **Connect Device:**
```bash
adb devices
```

3. **Install APK:**
```bash
adb install TTSGolfApp/android/app/build/outputs/apk/debug/app-debug.apk
```

### Build Production APK

```bash
cd TTSGolfApp
npx expo run:android --variant release
```

### Share APK
APK location: `TTSGolfApp/android/app/build/outputs/apk/debug/app-debug.apk`

You can:
- Copy to device via USB
- Upload to Google Drive
- Send via email/messaging
- Install directly (enable "Install from Unknown Sources")

---

## Troubleshooting

### Google Sign-In Issues
- Verify SHA-1 fingerprint is added to Firebase
- Check that Android OAuth client exists in Google Cloud Console
- Ensure google-services.json is up to date
- Verify GOOGLE_CLIENT_ID_ANDROID in backend .env

### Backend Connection Issues
- Check API_URL in app .env matches your local IP
- Ensure backend is running on correct port
- Verify firewall allows connections on port 3000

### Build Issues
- Clean build: `cd TTSGolfApp/android && ./gradlew clean`
- Clear Metro cache: `npx expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`

---

## Quick Start Script

Use the provided `start-app.bat` (Windows) to start both backend and app:
```bash
start-app.bat
```

This will:
1. Start backend server
2. Start Expo development server
3. Open Android emulator (if configured)

---

For more detailed information, see:
- [API Reference](./API_REFERENCE.md)
- [AWS Deployment](./AWS_DEPLOYMENT.md)
- [Environment Setup](./ENVIRONMENT_SETUP.md)
