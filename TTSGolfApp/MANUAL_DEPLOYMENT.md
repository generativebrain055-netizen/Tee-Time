# Manual Deployment Instructions

Due to system permission restrictions, please follow these steps manually in your terminal.

## Prerequisites

1. **Open Terminal** and navigate to the project:
   ```bash
   cd /Volumes/Macintosh_HD/Users/user284740/Downloads/TeeTimeSocial/Tee-Time/TTSGolfApp
   ```

2. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g eas-cli
   ```
   
   If that fails due to permissions, use:
   ```bash
   sudo npm install -g eas-cli
   ```

## Step-by-Step Deployment

### Step 1: Login to EAS

```bash
npx eas-cli login
```

Or if EAS CLI is installed globally:
```bash
eas login
```

### Step 2: Verify Login

```bash
npx eas-cli whoami
```

### Step 3: Set Environment Variables

You need to set these environment variables in EAS. Run these commands one by one:

```bash
# API URL (Production)
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://api.teetimesocial.app"

# Firebase Configuration
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "YOUR_FIREBASE_API_KEY"
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "YOUR_FIREBASE_AUTH_DOMAIN"
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "YOUR_FIREBASE_PROJECT_ID"
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "YOUR_FIREBASE_STORAGE_BUCKET"
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "YOUR_FIREBASE_MESSAGING_SENDER_ID"
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value "YOUR_FIREBASE_APP_ID"

# Google OAuth
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "YOUR_GOOGLE_WEB_CLIENT_ID"
```

**Note:** Replace `YOUR_*` values with your actual credentials.

To update an existing secret, add `--force` flag:
```bash
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://api.teetimesocial.app" --force
```

### Step 4: Verify Environment Variables

```bash
npx eas-cli secret:list
```

Make sure all required variables are listed.

### Step 5: Build the iOS App

```bash
npx eas-cli build --platform ios --profile internal-testing
```

Or use the npm script:
```bash
npm run deploy:build
```

**This will take 15-30 minutes.** You can monitor progress:
- In the terminal
- At https://expo.dev (login required)

### Step 6: Submit to TestFlight

Once the build completes, submit it:

```bash
npx eas-cli submit --platform ios --latest
```

Or use the npm script:
```bash
npm run deploy:submit
```

### Step 7: Verify in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Navigate to your app → **TestFlight**
3. Wait for processing (10-30 minutes)
4. The build will appear in "iOS Builds"
5. Add testers and distribute

## Quick Commands (Using npm scripts)

I've added these scripts to `package.json` for convenience:

```bash
# Login to EAS
npm run eas:login

# Check login status
npm run eas:whoami

# List environment variables
npm run eas:secrets

# Build only
npm run deploy:build

# Submit only
npm run deploy:submit

# Build and submit in one command
npm run deploy
```

## Troubleshooting

### Permission Errors with npm

If you get permission errors, try:
```bash
sudo npm install -g eas-cli
```

Or use npx (no installation needed):
```bash
npx eas-cli <command>
```

### Build Fails

1. Check environment variables: `npm run eas:secrets`
2. Verify all required variables are set
3. Check build logs in Expo dashboard
4. Ensure Firebase configuration is correct

### Submission Fails

1. Verify Apple credentials in `eas.json` are correct
2. Check App Store Connect for any issues
3. Ensure you're logged in: `npm run eas:whoami`

### App Crashes on Launch

1. Verify `EXPO_PUBLIC_API_URL` is set correctly
2. Check all Firebase configuration variables
3. Review crash logs in TestFlight
4. Ensure backend API is accessible from mobile devices

## Current Configuration

- **Bundle ID:** com.teetimesocial.app
- **Version:** 1.0.7
- **Build Number:** 8
- **EAS Project ID:** 0f694ef1-a1bb-4fda-bc59-05760bcbe22c
- **Build Profile:** internal-testing
- **Apple Team ID:** P2DD49N89K
- **App Store Connect App ID:** 6757623508

## Next Steps After Deployment

1. ✅ Test the app thoroughly in TestFlight
2. ✅ Monitor crash reports in App Store Connect
3. ✅ Gather feedback from testers
4. ✅ Fix any issues and increment build number
5. ✅ Repeat deployment process

---

**Ready to deploy?** Start with Step 1 above!
