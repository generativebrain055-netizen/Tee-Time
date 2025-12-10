# Deep Linking Setup for TeeTime Golf App

## Overview
This guide explains how to set up deep linking so magic links from emails open directly in the mobile app.

## Deep Link Scheme
- **Scheme:** `teetimegolf://`
- **Magic Link URL:** `teetimegolf://auth/magic-link?token=<token>`

---

## iOS Setup

### 1. Update `app.json` or `app.config.js`

```json
{
  "expo": {
    "scheme": "teetimegolf",
    "ios": {
      "bundleIdentifier": "com.teetimegolf.app",
      "associatedDomains": [
        "applinks:yourdomain.com",
        "applinks:api.yourdomain.com"
      ]
    }
  }
}
```

### 2. Configure Universal Links (iOS)

Create `apple-app-site-association` file on your server at:
`https://yourdomain.com/.well-known/apple-app-site-association`

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.teetimegolf.app",
        "paths": [
          "/auth/magic-link-redirect",
          "/auth/*"
        ]
      }
    ]
  }
}
```

### 3. Test iOS Deep Link
```bash
xcrun simctl openurl booted "teetimegolf://auth/magic-link?token=test123"
```

---

## Android Setup

### 1. Update `app.json`

```json
{
  "expo": {
    "scheme": "teetimegolf",
    "android": {
      "package": "com.teetimegolf.app",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "yourdomain.com",
              "pathPrefix": "/auth"
            },
            {
              "scheme": "teetimegolf"
            }
          ],
          "category": [
            "BROWSABLE",
            "DEFAULT"
          ]
        }
      ]
    }
  }
}
```

### 2. Configure App Links (Android)

Create `assetlinks.json` file on your server at:
`https://yourdomain.com/.well-known/assetlinks.json`

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.teetimegolf.app",
      "sha256_cert_fingerprints": [
        "YOUR_SHA256_FINGERPRINT"
      ]
    }
  }
]
```

### 3. Test Android Deep Link
```bash
adb shell am start -W -a android.intent.action.VIEW -d "teetimegolf://auth/magic-link?token=test123" com.teetimegolf.app
```

---

## React Navigation Setup

### 1. Install Dependencies

```bash
npm install @react-navigation/native
npm install react-native-screens react-native-safe-area-context
npm install @react-navigation/native-stack
npm install @react-native-async-storage/async-storage
```

### 2. Configure Linking in App.js

```javascript
import * as Linking from 'expo-linking';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: [
    'teetimegolf://',
    'https://yourdomain.com',
    'https://api.yourdomain.com',
  ],
  config: {
    screens: {
      Login: 'login',
      MagicLinkHandler: {
        path: 'auth/magic-link',
        parse: {
          token: (token) => token,
        },
      },
      CompleteProfile: 'complete-profile',
      Home: 'home',
    },
  },
};

export default function App() {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="MagicLinkHandler" 
          component={MagicLinkHandler}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="CompleteProfile" 
          component={CompleteProfileScreen}
          options={{ 
            headerShown: true,
            title: 'Complete Profile',
            headerBackVisible: false,
          }}
        />
        <Stack.Screen 
          name="Home" 
          component={HomePage}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### 3. Handle Deep Links in App

```javascript
import { useEffect } from 'react';
import * as Linking from 'expo-linking';

// In your App component or a custom hook
useEffect(() => {
  // Handle initial URL (app opened from closed state)
  Linking.getInitialURL().then((url) => {
    if (url) {
      console.log('App opened with URL:', url);
      // Navigation will handle this automatically with linking config
    }
  });

  // Handle URL when app is in background
  const subscription = Linking.addEventListener('url', ({ url }) => {
    console.log('Deep link received:', url);
    // Navigation will handle this automatically with linking config
  });

  return () => subscription.remove();
}, []);
```

---

## Testing Deep Links

### Test in Development

1. **Start the app:**
   ```bash
   npm start
   ```

2. **Open deep link in simulator/emulator:**
   
   **iOS Simulator:**
   ```bash
   xcrun simctl openurl booted "teetimegolf://auth/magic-link?token=test123"
   ```
   
   **Android Emulator:**
   ```bash
   adb shell am start -W -a android.intent.action.VIEW -d "teetimegolf://auth/magic-link?token=test123"
   ```

3. **Test from browser:**
   - Open Safari/Chrome on device
   - Type: `teetimegolf://auth/magic-link?token=test123`
   - App should open automatically

### Test Magic Link Flow

1. **Request magic link:**
   ```bash
   curl -X POST http://localhost:3000/auth/magic-link \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com"}'
   ```

2. **Check server console for link**

3. **Open the universal link in mobile browser:**
   - The redirect page will attempt to open the app
   - If app is installed: Opens app with token
   - If app is not installed: Shows "Continue in Browser" option

---

## Production Checklist

- [ ] Update `app.json` with production bundle IDs
- [ ] Configure associated domains in Apple Developer Portal
- [ ] Upload `apple-app-site-association` to production server
- [ ] Upload `assetlinks.json` to production server
- [ ] Test universal links on real devices
- [ ] Verify deep links work from email clients (Gmail, Outlook, etc.)
- [ ] Test fallback to web when app not installed
- [ ] Update API_URL in `.env` to production URL
- [ ] Configure SendGrid with production domain

---

## Troubleshooting

### iOS Universal Links Not Working

1. **Verify associated domains:**
   - Check Apple Developer Portal
   - Ensure `apple-app-site-association` is accessible
   - Must be served over HTTPS
   - No redirects allowed

2. **Clear iOS cache:**
   ```bash
   # Uninstall and reinstall app
   # Or use this command:
   xcrun simctl privacy booted reset all
   ```

3. **Check file format:**
   - No `.json` extension
   - Correct MIME type: `application/json`
   - Valid JSON format

### Android App Links Not Working

1. **Verify SHA256 fingerprint:**
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```

2. **Test assetlinks.json:**
   ```bash
   curl https://yourdomain.com/.well-known/assetlinks.json
   ```

3. **Verify intent filter:**
   - Check `AndroidManifest.xml` after build
   - Ensure `autoVerify="true"` is present

### Deep Link Not Opening App

1. **Check scheme registration:**
   - Verify `app.json` configuration
   - Rebuild app after changes

2. **Test with simple URL:**
   ```bash
   # iOS
   xcrun simctl openurl booted "teetimegolf://test"
   
   # Android
   adb shell am start -W -a android.intent.action.VIEW -d "teetimegolf://test"
   ```

3. **Check navigation configuration:**
   - Verify screen names match
   - Check linking config in NavigationContainer

---

## Additional Resources

- [Expo Linking Documentation](https://docs.expo.dev/guides/linking/)
- [React Navigation Deep Linking](https://reactnavigation.org/docs/deep-linking/)
- [iOS Universal Links](https://developer.apple.com/ios/universal-links/)
- [Android App Links](https://developer.android.com/training/app-links)
- [Testing Universal Links](https://branch.io/resources/aasa-validator/)

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review React Navigation documentation
3. Test with simple deep links first
4. Verify server configuration files are accessible
