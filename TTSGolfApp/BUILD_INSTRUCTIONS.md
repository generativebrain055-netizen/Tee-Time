# Build Instructions for App Store Internal Testing

## Prerequisites

1. **Apple Developer Account** (paid, $99/year)
2. **Expo Account** (free) - Sign up at https://expo.dev
3. **EAS CLI** installed globally

## Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

## Step 2: Login to Expo

```bash
cd TTSGolfApp
eas login
```

Enter your Expo account credentials.

## Step 3: Configure Your Project

```bash
eas build:configure
```

This will:
- Link your project to Expo
- Generate a project ID
- Update app.json with the project ID

## Step 4: Update Bundle Identifier (if needed)

The bundle identifier is already set to: `com.teetimesocial.app`

Make sure this matches your App Store Connect app configuration.

## Step 5: Build for iOS (Internal Testing)

```bash
eas build --platform ios --profile internal-testing
```

This will:
- Ask you to log in with your Apple Developer account
- Create a build on Expo's servers
- Generate an IPA file for TestFlight

**Note:** The first build will take 15-30 minutes.

## Step 6: Download the Build

Once the build completes, you'll get a URL to download the IPA file.

You can also view all builds at: https://expo.dev/accounts/[your-account]/projects/teetimesocial/builds

## Step 7: Upload to TestFlight

### Option A: Automatic Upload (Recommended)

```bash
eas submit --platform ios --latest
```

This will automatically upload the latest build to TestFlight.

### Option B: Manual Upload

1. Download the IPA file from the Expo build page
2. Open **Transporter** app on Mac (from App Store)
3. Drag and drop the IPA file
4. Click "Deliver"

## Step 8: Configure TestFlight

1. Go to https://appstoreconnect.apple.com
2. Select your app
3. Go to **TestFlight** tab
4. Wait for the build to process (10-30 minutes)
5. Add internal testers
6. Distribute the build

## Alternative: Build Locally (Faster for Testing)

If you have a Mac with Xcode installed:

```bash
# Build locally
eas build --platform ios --profile internal-testing --local

# This will generate an IPA file in your project directory
```

## Troubleshooting

### "No bundle identifier found"
- Make sure `ios.bundleIdentifier` is set in app.json
- Run `eas build:configure` again

### "Apple Developer account not found"
- Log in to your Apple Developer account when prompted
- Make sure your account has an active membership

### "Build failed"
- Check the build logs on Expo dashboard
- Common issues: missing assets, incorrect configuration

## Important Notes

1. **Bundle ID**: `com.teetimesocial.app` must be registered in App Store Connect
2. **Version**: Currently set to `1.0.0` - increment for each release
3. **Build Number**: Currently `1` - increment for each build
4. **Icons**: Make sure all icon assets exist in the `assets` folder

## Next Steps After Build

1. Test the app on TestFlight
2. Fix any issues
3. Increment build number in app.json
4. Rebuild and resubmit
5. Once stable, submit for App Store review

## Useful Commands

```bash
# Check build status
eas build:list

# View build logs
eas build:view [build-id]

# Cancel a build
eas build:cancel

# Submit to App Store
eas submit --platform ios
```

## Resources

- EAS Build Documentation: https://docs.expo.dev/build/introduction/
- TestFlight Guide: https://developer.apple.com/testflight/
- App Store Connect: https://appstoreconnect.apple.com
