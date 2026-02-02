# Build and Test Native Google Sign-In

## Prerequisites

1. **Install EAS CLI** (if not already installed):
```bash
npm install -g eas-cli
```

2. **Login to Expo**:
```bash
eas login
```

3. **Have an emulator ready**:
   - **iOS**: Xcode with iOS Simulator installed
   - **Android**: Android Studio with an emulator set up

---

## Build for iOS Simulator

```bash
cd TTSGolfApp
eas build --profile development --platform ios --local
```

**What this does:**
- Creates a development build with native modules
- Builds for iOS Simulator (can't run on Expo Go)
- Builds locally on your Mac (faster than cloud build)
- Includes the Google Sign-In native module

**After build completes:**
1. Find the `.app` file in the output
2. Drag it to your iOS Simulator
3. Or run: `xcrun simctl install booted path/to/app.app`

---

## Build for Android Emulator

```bash
cd TTSGolfApp
eas build --profile development --platform android --local
```

**What this does:**
- Creates a development APK
- Includes Google Sign-In native module
- Can be installed on Android emulator

**After build completes:**
1. Find the `.apk` file
2. Drag it to your Android emulator
3. Or run: `adb install path/to/app.apk`

---

## Alternative: Cloud Build (Slower but Easier)

If you don't want to build locally:

**iOS:**
```bash
eas build --profile development --platform ios
```

**Android:**
```bash
eas build --profile development --platform android
```

Then download the build from the Expo dashboard.

---

## Running the Development Build

### 1. Start the Metro bundler:
```bash
cd TTSGolfApp
npx expo start --dev-client
```

### 2. Open the app on your emulator

The app will connect to Metro and you can develop with hot reload!

---

## Testing Google Sign-In

Once the app is running:

1. Click "Continue with Google"
2. **Native Google account picker appears** (no browser!)
3. Select your Google account
4. App gets ID token and sends to backend
5. You're logged in!

**Expected logs:**
```
[OAuth] Starting native Google Sign-In...
[OAuth] Google Sign-In successful
[OAuth] User: your-email@gmail.com
[OAuth] Sending ID token to backend for verification...
```

---

## Google Cloud Console Setup

Make sure you have the correct OAuth client configured:

### For iOS:
1. Go to Google Cloud Console
2. Create **iOS** OAuth client
3. Bundle ID: `com.teetimesocial.app`
4. No redirect URI needed for native

### For Android:
1. Go to Google Cloud Console
2. Create **Android** OAuth client
3. Package name: `com.teetimesocial.app`
4. Get SHA-1 certificate fingerprint:
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
5. Add the SHA-1 to Google Cloud Console

### Web Client ID (Backend Verification):
Keep your existing Web Client ID for backend token verification:
```
759920946936-s36v2m281o4kthv7blofv0rfij53jl2l.apps.googleusercontent.com
```

---

## Troubleshooting

### Build fails with "No bundle identifier"
Make sure `bundleIdentifier` is set in `app.json`:
```json
"ios": {
  "bundleIdentifier": "com.teetimesocial.app"
}
```

### "Google Sign-In SDK not configured"
Make sure the plugin is in `app.json`:
```json
"plugins": [
  ["@react-native-google-signin/google-signin", {
    "iosUrlScheme": "com.googleusercontent.apps.759920946936-8avkln9fd3c6h3e1hdao3a9amg3g67qs"
  }]
]
```

### "Developer mode not enabled"
On iOS Simulator, shake the device (Cmd+Ctrl+Z) and enable "Fast Refresh"

### Android: "Google Play Services not available"
Make sure your emulator has Google Play Services:
- Use an emulator with "Google APIs" or "Google Play"
- Not the basic "AOSP" image

---

## Development Workflow

1. **Build once** (takes 10-20 minutes)
2. **Install on emulator**
3. **Develop with hot reload** (instant updates!)
4. **Rebuild only when**:
   - Adding new native modules
   - Changing native configuration
   - Updating app.json plugins

---

## Quick Start Commands

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build for iOS Simulator (local)
cd TTSGolfApp
eas build --profile development --platform ios --local

# Build for Android (local)
eas build --profile development --platform android --local

# Start development server
npx expo start --dev-client
```

---

## Next Steps

After successful build and test:

1. ✅ Google Sign-In works natively (no browser)
2. ✅ Backend verifies tokens correctly
3. ✅ User can log in and use the app
4. 🚀 Ready for production builds!

For production:
```bash
eas build --profile production --platform ios
eas build --profile production --platform android
```
