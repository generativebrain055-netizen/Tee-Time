# Setup Required - Environment Variables and Firebase Files

## 📋 What I Need From You

### 1. Environment Variables (.env file)

Please provide the following values so I can create the `.env` file:

#### Backend API
```
EXPO_PUBLIC_API_URL=
```
**Example:** `http://192.168.1.100:3000` (your local IP, not localhost)

#### Firebase Configuration
```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

#### Google OAuth
```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
```

---

### 2. Firebase Configuration Files

You mentioned you have these files in the root. Please confirm their exact location:

#### For Android:
- **File:** `google-services.json`
- **Current location:** (please specify)
- **Needed at:** `TTSGolfApp/google-services.json`

#### For iOS:
- **File:** `GoogleService-Info.plist`
- **Current location:** (please specify)
- **Needed at:** `TTSGolfApp/GoogleService-Info.plist`

---

## 🔍 How to Find These Values

### Firebase Configuration
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon → Project Settings
4. Scroll to "Your apps" section
5. Select your app (Android/iOS)
6. Copy the configuration values

### Google OAuth Client IDs
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to APIs & Services → Credentials
4. Find your OAuth 2.0 Client IDs
5. Copy the Web Client ID and iOS Client ID

### Backend API URL
- If running locally: Use your computer's local IP address
  - Windows: Run `ipconfig` in CMD, look for IPv4 Address
  - Mac/Linux: Run `ifconfig`, look for inet address
- Format: `http://YOUR_IP:3000` (replace YOUR_IP with actual IP)

---

## 📝 Please Provide

**Option 1: Paste the values here in this format:**

```
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:android:abc123
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-abc.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=123456789-xyz.apps.googleusercontent.com
```

**Option 2: Tell me where the google-services.json and GoogleService-Info.plist files are located**

Example:
- google-services.json is at: `D:\Projects\TT\TeeTimeApp\google-services.json`
- GoogleService-Info.plist is at: `D:\Projects\TT\TeeTimeApp\GoogleService-Info.plist`

---

Once you provide these, I will:
1. ✅ Create the `.env` file with your values
2. ✅ Copy the Firebase config files to the correct locations
3. ✅ Run the build script successfully
4. ✅ Fix any remaining TypeScript errors
5. ✅ Verify backend compatibility
