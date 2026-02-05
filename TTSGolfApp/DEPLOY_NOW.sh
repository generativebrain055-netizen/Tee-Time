#!/bin/bash

# Deploy Now Script - Execute this to deploy immediately
# This script will guide you through the deployment process

set -e

cd "$(dirname "$0")"

echo "🚀 TeeTime Social - Deploy Now"
echo "=============================="
echo ""

# Step 1: Login
echo "Step 1: Login to EAS"
echo "A browser window will open for authentication..."
npx --yes eas-cli login

# Step 2: Verify login
echo ""
echo "Step 2: Verifying login..."
npx --yes eas-cli whoami

# Step 3: Check environment variables
echo ""
echo "Step 3: Checking environment variables..."
npx --yes eas-cli env:list || echo "No environment variables set yet"

# Step 4: Set API URL if not set
echo ""
read -p "Set EXPO_PUBLIC_API_URL to https://api.teetimesocial.app? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx --yes eas-cli env:create --scope project --name EXPO_PUBLIC_API_URL --value "https://api.teetimesocial.app" --type string --force
fi

# Step 5: Build
echo ""
echo "Step 4: Building iOS app..."
echo "This will take 15-30 minutes..."
read -p "Proceed with build? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx --yes eas-cli build --platform ios --profile internal-testing --non-interactive
    
    # Step 6: Submit
    echo ""
    read -p "Submit to TestFlight? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Submitting to TestFlight..."
        npx --yes eas-cli submit --platform ios --latest --non-interactive
        echo "✅ Submitted! Check App Store Connect in 10-30 minutes."
    fi
fi

echo ""
echo "✅ Deployment process completed!"
