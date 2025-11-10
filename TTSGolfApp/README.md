# TTS Golf App - Mobile (Expo)

React Native mobile application built with Expo for iOS and Android.

## Setup

1. Install dependencies (already done):
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on your device:
- Install **Expo Go** app on your phone (iOS or Android)
- Scan the QR code that appears in the terminal
- The app will load on your phone

## Alternative Run Commands

```bash
npm run android  # Run on Android emulator
npm run ios      # Run on iOS simulator (Mac only)
npm run web      # Run in web browser
```

## Tech Stack

- Expo SDK
- React Native
- Firebase (Push Notifications)
- React Navigation
- Expo Location (for geolocation)
- Expo Camera (for QR scanning)

## Project Structure

```
/src
  /components    - Reusable UI components
  /screens       - App screens
  /navigation    - Navigation configuration
  /services      - API calls and external services
  /utils         - Helper functions
  /assets        - Images, fonts, etc.
```

## Testing on Your Phone

1. Download **Expo Go** from App Store (iOS) or Play Store (Android)
2. Run `npm start` in this directory
3. Scan the QR code with your phone camera (iOS) or Expo Go app (Android)
4. App will load and hot-reload as you make changes

## Building for Production

When ready to deploy:
```bash
npx eas build --platform android
npx eas build --platform ios
```
