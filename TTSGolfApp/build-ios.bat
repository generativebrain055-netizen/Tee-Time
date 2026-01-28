@echo off
echo ========================================
echo TeeTime Social - iOS Build Script
echo ========================================
echo.

echo Step 1: Installing EAS CLI (if not installed)...
call npm install -g eas-cli

echo.
echo Step 2: Logging in to Expo...
call eas login

echo.
echo Step 3: Configuring project...
call eas build:configure

echo.
echo Step 4: Starting iOS build for internal testing...
echo This will take 15-30 minutes...
call eas build --platform ios --profile internal-testing

echo.
echo ========================================
echo Build process started!
echo Check https://expo.dev for build status
echo ========================================
pause
