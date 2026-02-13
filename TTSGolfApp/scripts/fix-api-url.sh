#!/bin/bash

# Script to find local IP and update .env file
# Usage: ./scripts/fix-api-url.sh

echo "🔍 Finding your local IP address..."

# Try different methods to get local IP
LOCAL_IP=""

# Method 1: ifconfig (macOS/Linux)
if command -v ifconfig &> /dev/null; then
    LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
fi

# Method 2: ipconfig (Windows) or fallback
if [ -z "$LOCAL_IP" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
    fi
fi

# Method 3: Network preferences (macOS)
if [ -z "$LOCAL_IP" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        LOCAL_IP=$(route get default 2>/dev/null | grep interface | awk '{print $2}' | xargs ifconfig 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
    fi
fi

if [ -z "$LOCAL_IP" ]; then
    echo "❌ Could not automatically detect local IP."
    echo ""
    echo "Please find your IP manually:"
    echo "  macOS: System Preferences → Network → Wi-Fi/Ethernet → IP Address"
    echo "  Or run: ifconfig | grep 'inet ' | grep -v 127.0.0.1"
    echo ""
    read -p "Enter your local IP address: " LOCAL_IP
fi

if [ -z "$LOCAL_IP" ]; then
    echo "❌ No IP address provided. Exiting."
    exit 1
fi

echo "✅ Found local IP: $LOCAL_IP"
echo ""

ENV_FILE=".env"
ENV_BACKUP=".env.backup.$(date +%Y%m%d_%H%M%S)"

# Backup .env file
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$ENV_BACKUP"
    echo "📦 Backed up .env to $ENV_BACKUP"
fi

# Update or add EXPO_PUBLIC_API_URL
NEW_API_URL="http://${LOCAL_IP}:3000"

if grep -q "^EXPO_PUBLIC_API_URL=" "$ENV_FILE" 2>/dev/null; then
    # Update existing line
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=${NEW_API_URL}|" "$ENV_FILE"
    else
        # Linux
        sed -i "s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=${NEW_API_URL}|" "$ENV_FILE"
    fi
    echo "✅ Updated EXPO_PUBLIC_API_URL in .env"
else
    # Add new line
    echo "" >> "$ENV_FILE"
    echo "EXPO_PUBLIC_API_URL=${NEW_API_URL}" >> "$ENV_FILE"
    echo "✅ Added EXPO_PUBLIC_API_URL to .env"
fi

echo ""
echo "🎉 API URL updated to: $NEW_API_URL"
echo ""
echo "📋 Next steps:"
echo "  1. Make sure backend is running: cd backend && npm run dev"
echo "  2. Restart Expo with cache clear: npx expo start -c"
echo "  3. Try accepting an invite again"
echo ""
echo "💡 To verify backend is accessible, test:"
echo "  curl http://${LOCAL_IP}:3000/health"
