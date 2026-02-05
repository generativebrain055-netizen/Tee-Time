# Secrets and Build Configuration

## Never Commit These Files

The following files contain secrets and **must not** be committed to version control:

- `GoogleService-Info.plist` (iOS Firebase config – contains API key)
- `google-services.json` (Android Firebase config)
- `.env` (environment variables)

These are listed in `.gitignore`. If they were ever committed, rotate any exposed keys in Firebase Console.

## EAS Build: Use Secrets Instead of Files

For EAS cloud builds, use **EAS Secrets** instead of committing config files:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://api.teetimesocial.app"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "your_key"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "your_project.firebaseapp.com"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "your_project_id"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "your_project.firebasestorage.app"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "your_sender_id"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value "1:xxx:ios:xxx"
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "your_web_client_id.apps.googleusercontent.com"
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID --value "your_ios_client_id.apps.googleusercontent.com"
```

## GoogleService-Info.plist (iOS)

For **local Xcode builds**, you need this file in the iOS app bundle:

1. Download from [Firebase Console](https://console.firebase.google.com) → Project Settings → Your iOS app
2. Copy to `ios/TeeTimeSocial/GoogleService-Info.plist` (if using prebuild)
3. Or place in `TTSGolfApp/` and ensure it's added to the Xcode project

For **EAS builds**, the Firebase config is injected via `EXPO_PUBLIC_*` env vars. EAS may also use a config plugin or you can add the plist as an EAS secret for build-time injection—see [Expo Firebase docs](https://docs.expo.dev/guides/using-firebase/).

## google-services.json (Android)

1. Copy from `config/firebase/google-services.json.example` or download from Firebase Console
2. Place at `TTSGolfApp/google-services.json` (same directory as `app.json`)
3. The path in `app.json` is `./google-services.json`

## Verify .gitignore

Before pushing, run:

```bash
git status
# Ensure GoogleService-Info.plist, google-services.json, .env are NOT listed
```
