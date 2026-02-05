#!/bin/bash
#
# Fix "module map file not found" (EXApplication, Expo, etc.) and build iOS.
# Run from project root: TTSGolfApp/
#
set -e

cd "$(dirname "$0")/.."
APP_ROOT="$(pwd)"
IOS_DIR="$APP_ROOT/ios"
DERIVED=~/Library/Developer/Xcode/DerivedData
PROJECT_NAME="TeeTimeSocial"

echo "═══════════════════════════════════════════════════════════════"
echo "  Fix iOS build: clean, re-pod, build with Expo"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# 1. Clean Derived Data
echo "[1/4] Cleaning Xcode Derived Data..."
rm -rf "${DERIVED}/${PROJECT_NAME}"-*
echo "      Done."

# 2. Clean ios
echo ""
echo "[2/4] Cleaning ios/Pods and build..."
cd "$IOS_DIR"
rm -rf build Pods Podfile.lock
echo "      Done."

# 3. Pod install
echo ""
echo "[3/4] Running pod install..."
pod install
echo "      Done."

# 4. Build and run with Expo (builds Pods then app in correct order)
echo ""
echo "[4/4] Building and running iOS (this builds Pods first)..."
cd "$APP_ROOT"
npx expo run:ios

echo ""
echo "If the app launched in the simulator, the fix worked."
echo "To build from Xcode: open ios/TeeTimeSocial.xcworkspace, then Product → Build."
