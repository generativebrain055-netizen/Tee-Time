# EAS Build & Deploy Guide

Complete CLI commands for building and deploying to Apple App Store and Google Play Store using Expo Application Services (EAS).

## Prerequisites

1. **EAS CLI installed globally:**
   ```bash
   npm install -g eas-cli
   ```

2. **Logged into Expo account:**
   ```bash
   eas login
   ```

3. **Required credentials configured:**
   - **iOS**: Apple ID, Team ID, App Store Connect App ID (configured in `eas.json`)
   - **Android**: Google Play Service Account JSON file (located at `../google-play-service-account.json`)

4. **Version updates:**
   - Update `version` and `buildNumber` in `TTSGolfApp/app.json` before building
   - For Android, also increment `versionCode` in `app.json`

---

## iOS - Apple App Store

### Build for iOS

```bash
cd TTSGolfApp
eas build --platform ios --profile production
```

**Options:**
- `--platform ios` - Build for iOS
- `--profile production` - Use production profile from `eas.json`
- `--local` - Build locally (requires macOS and Xcode)
- `--non-interactive` - Skip prompts (useful for CI/CD)

**What it does:**
- Creates an `.ipa` file (iOS App Store package)
- Uploads to Expo servers
- Builds using Apple's infrastructure
- Returns a build ID and download URL

### Submit to App Store

```bash
cd TTSGolfApp
eas submit --platform ios --profile production
```

**What it does:**
- Uploads the latest production build to App Store Connect
- Uses credentials from `eas.json` (or prompts for Apple ID password)
- Submits for App Store review

**Note:** If using API key authentication, ensure `ascApiKeyPath`, `ascApiKeyId`, and `ascApiIssuer` are configured in `eas.json`.

### Check Build Status

```bash
cd TTSGolfApp
eas build:list --platform ios --limit 5
```

---

## Android - Google Play Store

### Build for Android

```bash
cd TTSGolfApp
eas build --platform android --profile production
```

**Options:**
- `--platform android` - Build for Android
- `--profile production` - Use production profile from `eas.json`
- `--local` - Build locally (requires Android SDK)
- `--non-interactive` - Skip prompts

**What it does:**
- Creates an `.aab` file (Android App Bundle)
- Uploads to Expo servers
- Builds using Google's infrastructure
- Returns a build ID and download URL

### Submit to Google Play

```bash
cd TTSGolfApp
eas submit --platform android --profile production
```

**What it does:**
- Uploads the latest production build to Google Play Console
- Uses service account from `../google-play-service-account.json`
- Submits to the track specified in `eas.json` (currently: `internal`)

**Tracks available:**
- `internal` - Internal testing track
- `alpha` - Alpha testing track
- `beta` - Beta testing track
- `production` - Production release

To change the track, update `eas.json`:
```json
"android": {
    "serviceAccountKeyPath": "../google-play-service-account.json",
    "track": "production"  // Change this
}
```

### Check Build Status

```bash
cd TTSGolfApp
eas build:list --platform android --limit 5
```

---

## Build Both Platforms

### Build iOS and Android Simultaneously

```bash
cd TTSGolfApp
eas build --platform all --profile production
```

### Submit Both Platforms

```bash
cd TTSGolfApp
eas submit --platform all --profile production
```

---

## Common Workflows

### 1. Full Deployment (Build + Submit)

**iOS:**
```bash
cd TTSGolfApp
eas build --platform ios --profile production
# Wait for build to complete, then:
eas submit --platform ios --profile production
```

**Android:**
```bash
cd TTSGolfApp
eas build --platform android --profile production
# Wait for build to complete, then:
eas submit --platform android --profile production
```

### 2. Build Only (Manual Submission Later)

```bash
cd TTSGolfApp
eas build --platform all --profile production
```

Then download the `.ipa` (iOS) or `.aab` (Android) from:
- Expo Dashboard: https://expo.dev/accounts/caspianbridge/projects/TTSGolfApp/builds
- Or use the URL provided in the build output

### 3. View Build Artifacts

```bash
cd TTSGolfApp
eas build:list --platform ios --limit 1
eas build:list --platform android --limit 1
```

Look for the "Application Archive URL" in the output.

---

## Version Management

### Before Building

1. **Update version in `TTSGolfApp/app.json`:**
   ```json
   {
     "expo": {
       "version": "1.0.5",  // Update this
       "ios": {
         "buildNumber": "5"  // Increment for iOS
       },
       "android": {
         "versionCode": 2  // Increment for Android
       }
     }
   }
   ```

2. **Commit changes:**
   ```bash
   git add TTSGolfApp/app.json
   git commit -m "Bump version to 1.0.5"
   ```

---

## Troubleshooting

### iOS Issues

**Error: "Invalid Apple App Store Connect App ID"**
- Verify `ascAppId` in `eas.json` matches your App Store Connect app ID
- Check the URL in App Store Connect: `https://appstoreconnect.apple.com/apps/[ascAppId]`

**Error: "Entity not authorized"**
- Verify `projectId` in `app.json` matches your Expo project
- Ensure you're logged into the correct Expo account: `eas whoami`

**Build fails with permissions error**
- Check Apple Team ID is correct in `eas.json`
- Verify Apple ID has proper permissions in App Store Connect

### Android Issues

**Error: "PERMISSION_DENIED: Google Play Android Developer"**
- Ensure Google Play Android Developer API is enabled in Google Cloud Console
- Verify service account has "Release Manager" or "Admin" role in Google Play Console
- Check service account email is added in Google Play Console → Users and permissions

**Error: "A Google Service Account JSON key is required"**
- Verify `serviceAccountKeyPath` in `eas.json` points to the correct file
- Ensure the file exists at the specified path (relative to `TTSGolfApp/` directory)

**Build fails with "buildType" error**
- Ensure `buildType` in `eas.json` is either `"apk"` or `"app-bundle"` (not `"aab"`)

### General Issues

**Build stuck or slow**
- Check build status: `eas build:list`
- View build logs from Expo Dashboard
- Large builds can take 15-30 minutes

**Credentials not found**
- Run `eas credentials` to view/manage credentials
- For iOS: May need to re-authenticate with Apple ID
- For Android: Verify service account file path is correct

---

## Useful Commands

### View Current Credentials
```bash
cd TTSGolfApp
eas credentials
```

### Check Login Status
```bash
eas whoami
```

### View Project Info
```bash
cd TTSGolfApp
eas project:info
```

### Cancel a Build
```bash
cd TTSGolfApp
eas build:cancel [BUILD_ID]
```

### Download Build Artifact
```bash
cd TTSGolfApp
eas build:download [BUILD_ID]
```

---

## Configuration Files

### `TTSGolfApp/eas.json`
Contains build and submit profiles with credentials and settings.

### `TTSGolfApp/app.json`
Contains app metadata, version numbers, bundle identifiers, and plugins.

### Required Files (in project root)
- `google-play-service-account.json` - Google Play service account credentials
- `google-services.json` - Firebase configuration for Android
- `AuthKey_56NH9S782N-1.p8` - Apple App Store Connect API key (optional, if using API key auth)

---

## Quick Reference

| Action | iOS Command | Android Command |
|--------|------------|----------------|
| Build | `eas build --platform ios --profile production` | `eas build --platform android --profile production` |
| Submit | `eas submit --platform ios --profile production` | `eas submit --platform android --profile production` |
| List Builds | `eas build:list --platform ios` | `eas build:list --platform android` |
| View Credentials | `eas credentials` | `eas credentials` |

---

## Notes

- **Build times**: Typically 15-30 minutes per platform
- **Build costs**: Free tier includes limited builds, paid plans available
- **Service account**: Required for Android submissions (interactive auth not supported)
- **API key**: Optional for iOS (can use interactive Apple ID login instead)
- **Version codes**: Must increment for each new build submission
- **Tracks**: Android supports multiple tracks (internal, alpha, beta, production)

---

## Support

- **Expo Docs**: https://docs.expo.dev/build/introduction/
- **EAS CLI Docs**: https://docs.expo.dev/build/building-on-ci/
- **Expo Dashboard**: https://expo.dev/accounts/caspianbridge/projects/TTSGolfApp
