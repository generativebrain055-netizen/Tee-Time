#!/bin/bash

# TeeTime Social - iOS Deployment Script
# This script automates the deployment process to TestFlight

set -e  # Exit on error

echo "🚀 TeeTime Social - iOS Deployment Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "app.json" ]; then
    echo -e "${RED}❌ Error: app.json not found. Please run this script from TTSGolfApp directory.${NC}"
    exit 1
fi

# Step 1: Install EAS CLI if not available
echo -e "${YELLOW}📦 Step 1: Checking EAS CLI installation...${NC}"
if ! command -v eas &> /dev/null; then
    echo "EAS CLI not found. Installing..."
    npm install -g eas-cli
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}⚠️  Global installation failed. Trying local installation...${NC}"
        npm install --save-dev eas-cli
        export PATH="./node_modules/.bin:$PATH"
    fi
else
    echo -e "${GREEN}✓ EAS CLI is already installed${NC}"
fi

# Step 2: Check EAS login
echo ""
echo -e "${YELLOW}🔐 Step 2: Checking EAS login status...${NC}"
if eas whoami &> /dev/null; then
    echo -e "${GREEN}✓ Already logged in to EAS${NC}"
    eas whoami
else
    echo -e "${YELLOW}⚠️  Not logged in. Please login:${NC}"
    eas login
fi

# Step 3: List current secrets
echo ""
echo -e "${YELLOW}🔑 Step 3: Current environment variables in EAS:${NC}"
eas secret:list || echo "No secrets found or error listing secrets"

# Step 4: Prompt for environment variables if needed
echo ""
echo -e "${YELLOW}📝 Step 4: Environment Variables Setup${NC}"
echo "The following environment variables are required:"
echo "  - EXPO_PUBLIC_API_URL"
echo "  - EXPO_PUBLIC_FIREBASE_API_KEY"
echo "  - EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"
echo "  - EXPO_PUBLIC_FIREBASE_PROJECT_ID"
echo "  - EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"
echo "  - EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
echo "  - EXPO_PUBLIC_FIREBASE_APP_ID"
echo "  - EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID"
echo ""
read -p "Do you want to set/update environment variables now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Setting EXPO_PUBLIC_API_URL..."
    read -p "Enter API URL [https://api.teetimesocial.app]: " api_url
    api_url=${api_url:-https://api.teetimesocial.app}
    eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "$api_url" --force || echo "Failed to set API URL"
    
    echo "Setting Firebase variables..."
    read -p "Enter EXPO_PUBLIC_FIREBASE_API_KEY: " firebase_api_key
    if [ ! -z "$firebase_api_key" ]; then
        eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "$firebase_api_key" --force || echo "Failed to set Firebase API Key"
    fi
    
    read -p "Enter EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: " firebase_auth_domain
    if [ ! -z "$firebase_auth_domain" ]; then
        eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "$firebase_auth_domain" --force || echo "Failed to set Firebase Auth Domain"
    fi
    
    read -p "Enter EXPO_PUBLIC_FIREBASE_PROJECT_ID: " firebase_project_id
    if [ ! -z "$firebase_project_id" ]; then
        eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "$firebase_project_id" --force || echo "Failed to set Firebase Project ID"
    fi
    
    read -p "Enter EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: " firebase_storage_bucket
    if [ ! -z "$firebase_storage_bucket" ]; then
        eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "$firebase_storage_bucket" --force || echo "Failed to set Firebase Storage Bucket"
    fi
    
    read -p "Enter EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: " firebase_messaging_sender_id
    if [ ! -z "$firebase_messaging_sender_id" ]; then
        eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "$firebase_messaging_sender_id" --force || echo "Failed to set Firebase Messaging Sender ID"
    fi
    
    read -p "Enter EXPO_PUBLIC_FIREBASE_APP_ID: " firebase_app_id
    if [ ! -z "$firebase_app_id" ]; then
        eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value "$firebase_app_id" --force || echo "Failed to set Firebase App ID"
    fi
    
    read -p "Enter EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: " google_web_client_id
    if [ ! -z "$google_web_client_id" ]; then
        eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "$google_web_client_id" --force || echo "Failed to set Google Web Client ID"
    fi
fi

# Step 5: Build the app
echo ""
echo -e "${YELLOW}🔨 Step 5: Building iOS app for TestFlight...${NC}"
read -p "Proceed with build? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting build (this will take 15-30 minutes)..."
    eas build --platform ios --profile internal-testing --non-interactive
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Build completed successfully!${NC}"
        
        # Step 6: Submit to TestFlight
        echo ""
        echo -e "${YELLOW}📤 Step 6: Submit to TestFlight?${NC}"
        read -p "Submit the latest build to TestFlight? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Submitting to TestFlight..."
            eas submit --platform ios --latest --non-interactive
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ Successfully submitted to TestFlight!${NC}"
                echo ""
                echo "Next steps:"
                echo "1. Go to https://appstoreconnect.apple.com"
                echo "2. Navigate to your app → TestFlight"
                echo "3. Wait for processing (10-30 minutes)"
                echo "4. Add testers and distribute the build"
            else
                echo -e "${RED}❌ Failed to submit to TestFlight${NC}"
                exit 1
            fi
        fi
    else
        echo -e "${RED}❌ Build failed. Check the logs above for details.${NC}"
        exit 1
    fi
else
    echo "Build cancelled."
fi

echo ""
echo -e "${GREEN}✅ Deployment process completed!${NC}"
