# Deployment Guide for TeeTime Social iOS App

## Prerequisites

1. **EAS CLI installed globally:**
   ```bash
   npm install -g eas-cli
   ```

2. **Logged in to Expo account:**
   ```bash
   eas login
   ```

3. **Environment variables set in EAS:**
   All `EXPO_PUBLIC_*` variables need to be set in EAS for the build.

## Step 1: Set Environment Variables in EAS

Before building, you need to set all environment variables in EAS. Run:

```bash
cd TTSGolfApp
eas secret:create
```

You'll need to set these variables:
- `EXPO_PUBLIC_API_URL=https://api.teetimesocial.app`
- `EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id`
- `EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_web_client_id`

Or set them all at once:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://api.teetimesocial.app"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "your_value"
# ... repeat for each variable
```

## Step 2: Verify Build Configuration

The build profile is already configured in `eas.json`:
- Profile: `internal-testing`
- Distribution: `internal`
- Build configuration: `Release`

## Step 3: Build the iOS App

Build for TestFlight (internal testing):

```bash
cd TTSGolfApp
eas build --platform ios --profile internal-testing
```

This will:
1. Upload your code to EAS servers
2. Build the iOS app in the cloud
3. Generate an `.ipa` file ready for TestFlight

**Note:** The build will take 15-30 minutes. You can monitor progress in the terminal or at https://expo.dev

## Step 4: Submit to TestFlight

Once the build completes, submit it to TestFlight:

```bash
eas submit --platform ios --latest
```

Or submit a specific build:
```bash
eas submit --platform ios --id <build-id>
```

This will automatically:
1. Upload the build to App Store Connect
2. Process it for TestFlight
3. Make it available to your testers

## Step 5: Verify in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to your app → TestFlight
3. Wait for processing to complete (usually 10-30 minutes)
4. Add testers and distribute the build

## Troubleshooting

### Build Fails
- Check that all environment variables are set: `eas secret:list`
- Verify Firebase configuration is correct
- Check build logs in Expo dashboard

### Submission Fails
- Ensure you're logged in: `eas whoami`
- Verify Apple credentials in `eas.json` are correct
- Check App Store Connect for any issues

### App Crashes on Launch
- Verify `EXPO_PUBLIC_API_URL` is set correctly
- Check Firebase configuration variables
- Review crash logs in TestFlight

## Quick Commands Reference

```bash
# Check EAS login status
eas whoami

# List all secrets
eas secret:list

# Create a secret
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://api.teetimesocial.app"

# Build iOS app
eas build --platform ios --profile internal-testing

# Submit to TestFlight
eas submit --platform ios --latest

# View build status
eas build:list

# View build logs
eas build:view <build-id>
```

## Current Configuration

- **Bundle ID:** com.teetimesocial.app
- **Version:** 1.0.7
- **Build Number:** 8 (just updated)
- **EAS Project ID:** 0f694ef1-a1bb-4fda-bc59-05760bcbe22c
- **Build Profile:** internal-testing
- **Apple Team ID:** P2DD49N89K
- **App Store Connect App ID:** 6757623508

## Next Steps After Deployment

1. Test the app thoroughly in TestFlight
2. Monitor crash reports in App Store Connect
3. Gather feedback from testers
4. Fix any issues and increment build number
5. Repeat deployment process
