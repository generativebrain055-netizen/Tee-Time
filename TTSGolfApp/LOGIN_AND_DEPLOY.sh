#!/bin/bash
# Login and Deploy - Run this in your terminal (not automated)

cd /Volumes/Macintosh_HD/Users/user284740/Downloads/TeeTimeSocial/Tee-Time/TTSGolfApp

echo "═══════════════════════════════════════════════════════════════"
echo "  TeeTime Social - Login and Deploy"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "This script requires interactive login."
echo "A browser window will open for authentication."
echo ""
read -p "Press Enter to start login process..."

# Step 1: Login (interactive)
echo ""
echo "Step 1: Logging in to EAS..."
echo "A browser window will open. Please authenticate there."
npx --yes eas-cli login

# Verify login
echo ""
echo "Verifying login..."
npx --yes eas-cli whoami

# Step 2: Set API URL
echo ""
echo "Step 2: Setting API URL..."
npx --yes eas-cli env:create --scope project --name EXPO_PUBLIC_API_URL --value "https://api.teetimesocial.app" --type string --force

# Step 3: Build
echo ""
echo "Step 3: Building iOS app..."
echo "This will take 15-30 minutes. You can monitor progress at https://expo.dev"
read -p "Press Enter to start build..."
npx --yes eas-cli build --platform ios --profile internal-testing

# Step 4: Submit
echo ""
echo "Step 4: Submitting to TestFlight..."
read -p "Press Enter to submit to TestFlight..."
npx --yes eas-cli submit --platform ios --latest

echo ""
echo "✅ Deployment complete!"
echo "Check App Store Connect in 10-30 minutes:"
echo "https://appstoreconnect.apple.com"
