#!/bin/bash
# Fix Watchman issues for Expo/Metro

echo "🔧 Fixing Watchman issues..."

# Shutdown Watchman server
echo "Shutting down Watchman server..."
watchman shutdown-server 2>/dev/null || true

# Clean up watchman cookie files
echo "Cleaning up Watchman cookie files..."
find . -name ".watchman-cookie-*" -type f -delete 2>/dev/null || true

# Reset Watchman for this project
echo "Resetting Watchman watch..."
watchman watch-del-all 2>/dev/null || true

# Clear Metro cache
echo "Clearing Metro cache..."
rm -rf .metro 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true

echo "✅ Watchman cleanup complete!"
echo ""
echo "Now run: npx expo start --dev-client --clear"
