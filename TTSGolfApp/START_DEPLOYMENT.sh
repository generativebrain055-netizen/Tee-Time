#!/bin/bash
# Quick deployment command - Run this in your terminal

cd /Volumes/Macintosh_HD/Users/user284740/Downloads/TeeTimeSocial/Tee-Time/TTSGolfApp

echo "🚀 Starting Deployment..."
echo ""

# Login (interactive - will open browser)
echo "Step 1: Login to EAS"
npx --yes eas-cli login

# Verify login
echo ""
echo "Step 2: Verifying login..."
npx --yes eas-cli whoami

# Set API URL
echo ""
echo "Step 3: Setting API URL..."
npx --yes eas-cli env:create --scope project --name EXPO_PUBLIC_API_URL --value "https://api.teetimesocial.app" --type string --force

# Build
echo ""
echo "Step 4: Building iOS app (15-30 minutes)..."
npx --yes eas-cli build --platform ios --profile internal-testing

# Submit
echo ""
echo "Step 5: Submitting to TestFlight..."
npx --yes eas-cli submit --platform ios --latest

echo ""
echo "✅ Deployment complete! Check App Store Connect in 10-30 minutes."
