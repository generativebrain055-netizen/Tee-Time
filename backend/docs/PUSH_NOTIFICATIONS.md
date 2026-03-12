# Push Notifications (FCM / Expo)

Admin website can send broadcast push notifications to all mobile app users. The backend delivers them via **Expo Push API** (for Expo push tokens) and/or **Firebase Cloud Messaging (FCM)** (for native FCM tokens).

## Flow

```
Admin Website → Backend (broadcast or in-app trigger) → Expo Push API / FCM
                                                              ↓
Mobile App users ← "Your loan was approved!" / "Tee time reminder" etc.
```

- **Admin Broadcast**: Admin → **Broadcast** page → Compose title/body → **Send** → Backend collects all device push tokens and sends via Expo and/or FCM.
- **In-app triggers**: Invites, friend requests, check-in reminders, etc. use the same `notificationService.sendPushNotifications()` so they work for both Expo and FCM tokens.

## Backend configuration

### 1. Expo Push (default)

No extra config. Devices that register an **Expo push token** (`ExponentPushToken[...]`) receive notifications through the Expo Push API.

### 2. Firebase Cloud Messaging (FCM)

To send to **FCM registration tokens** (e.g. from a native client):

1. **Firebase project**
   - Use the same project as the mobile app (or one that has FCM enabled).
   - In Firebase Console → Project settings → Service accounts, create a **service account key** (JSON) and download it.

2. **Backend `.env`**
   - `GOOGLE_APPLICATION_CREDENTIALS` = path to that JSON file (e.g. `./config/firebase-service-account.json`).
   - Optional: `FIREBASE_PROJECT_ID` if you need to override the project.

3. **Token handling**
   - The backend treats any push token that does **not** start with `ExponentPushToken[` as an FCM token and sends it with `admin.messaging().sendEachForMulticast()`.

## Mobile app

- **Expo (this app)**: Uses `expo-notifications` to get an **Expo push token**, then `POST /api/notifications/push-token` to register it. Admin broadcast and in-app push then work for that device.
- **Optional**: Login/register request body can include `pushToken` and `pushPlatform` so the device is registered on first auth.

## API

- **Register token (authenticated)**  
  `POST /api/notifications/push-token`  
  Body: `{ "pushToken": "<Expo or FCM token>", "pushPlatform": "expo" | "fcm" }`  
  Associates the current user’s device (by fingerprint) with the given token.

- **Admin broadcast**  
  Admin only: **Broadcast** → Send; backend uses `notificationService.sendPushNotifications()` for all stored tokens (Expo + FCM).
