#!/bin/bash

# Quick Deployment Script - Uses npx to avoid installation issues

set -e

echo "🚀 TeeTime Social - Quick Deployment"
echo "===================================="
echo ""

cd "$(dirname "$0")"

# Use npx to run EAS CLI without installation
EAS_CMD="npx --yes eas-cli"

echo "📦 Using EAS CLI via npx (no installation required)"
echo ""

# Check login
echo "🔐 Checking EAS login..."
$EAS_CMD whoami || {
    echo "Please login to EAS:"
    $EAS_CMD login
}

# List secrets
echo ""
echo "🔑 Current environment variables:"
$EAS_CMD secret:list || echo "No secrets found"

# Build
echo ""
echo "🔨 Building iOS app for TestFlight..."
echo "This will take 15-30 minutes..."
$EAS_CMD build --platform ios --profile internal-testing

# Submit
echo ""
read -p "Submit to TestFlight? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📤 Submitting to TestFlight..."
    $EAS_CMD submit --platform ios --latest
    echo "✅ Submitted! Check App Store Connect in 10-30 minutes."
fi

echo ""
echo "✅ Done!"
