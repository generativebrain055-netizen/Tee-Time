# TeeTime Social - Configuration Guide

This guide helps you configure all necessary environment variables and services for the TeeTime Social application.

## Quick Configuration Checklist

- [ ] Supabase database setup
- [ ] Firebase project configuration
- [ ] Google OAuth credentials
- [ ] Apple Sign In setup (iOS only)
- [ ] Twilio SMS configuration
- [ ] SendGrid email configuration
- [ ] Backend environment variables
- [ ] Mobile app environment variables
- [ ] Android keystore configuration

---

## 1. Supabase Configuration

### Setup
1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to Project Settings → API
4. Copy the following values:

### Required Values
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Database Schema
Run the schema file: `backend/schema/unified_schema.sql`

---

## 2. Firebase Configuration

**For detailed Firebase setup, see [docs/FIREBASE_CONFIGURATION.md](docs/FIREBASE_CONFIGURATION.md)**

### Quick Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project or select existing
3. Add Android app (package: `com.teetimesocial.app`)
4. Add iOS app (bundle ID: `com.teetimesocial.app`)
5. Enable Google Sign-In in Authentication

### Required Files
- Download `google-services.json` → Place in `TTSGolfApp/`
- Download `GoogleService-Info.plist` → Place in `TTSGolfApp/`

### Required Values (from Project Settings)
```env
# Backend
FIREBASE_PROJECT_ID=your-project-id

# Mobile App
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:android:abc123
```

---

## 3. Google OAuth Configuration (via Firebase)

**Note**: Google OAuth is handled through Firebase Authentication.

### Get Client IDs
1. **Android Client ID**: From `google-services.json` (client_type: 1)
2. **Web Client ID**: Google Cloud Console → Credentials → "Web client (auto created)"
3. **iOS Client ID**: From `GoogleService-Info.plist` (if iOS app added)

### Required Values
```env
# Backend
GOOGLE_CLIENT_ID_ANDROID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_ID_WEB=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_ID_IOS=xxxxx.apps.googleusercontent.com

# Mobile App
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

---

## 4. Apple Sign In Configuration (iOS Only)

### Setup
1. Go to [Apple Developer](https://developer.apple.com/account/)
2. Create App ID with Sign In with Apple capability
3. Create Service ID for web authentication
4. Create Key for Sign In with Apple
5. Download private key (.p8 file)

### Required Values
```env
APPLE_CLIENT_ID=com.teetimesocial.app
APPLE_SERVICE_ID=com.teetimesocial.app.signin
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_KEY_ID=XXXXXXXXXX
APPLE_PRIVATE_KEY_PATH=config/keys/AuthKey_XXXXXXXXXX.p8
```

### File Placement
Place the `.p8` file in `backend/config/keys/`

---

## 5. Twilio Configuration (SMS/OTP)

### Setup
1. Create account at [twilio.com](https://www.twilio.com/)
2. Get a phone number
3. Go to Console → Account → API Keys & Tokens

### Required Values
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM_NUMBER=+1234567890
```

### Optional (Recommended for Production)
```env
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 6. SendGrid Configuration (Email)

### Setup
1. Create account at [sendgrid.com](https://sendgrid.com/)
2. Go to Settings → API Keys
3. Create new API key with full access

### Required Values
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

### Email Verification
Verify your sender email in SendGrid dashboard

---

## 7. JWT Configuration

### Generate Secret
Use a secure random string generator:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Required Values
```env
JWT_SECRET=your_generated_secret_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

---

## 8. Backend API URL

### Development
Find your local IP address:
- **Windows**: `ipconfig`
- **Mac/Linux**: `ifconfig`

Use your IP (not localhost) for mobile app to connect:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

### Production
Update to your production API URL:
```env
EXPO_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## 9. Android Keystore

### Existing Keystore
Location: `TTSGolfApp/android/app/teetimesocial-release.keystore`

Credentials:
- **Alias**: `teetimesocial-key-alias`
- **Password**: `teetimesocial2024`

### Generate New Keystore (if needed)
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore TTSGolfApp/android/app/your-app.keystore -alias your-alias -keyalg RSA -keysize 2048 -validity 10000
```

Update `TTSGolfApp/android/gradle.properties`:
```properties
MYAPP_RELEASE_STORE_FILE=your-app.keystore
MYAPP_RELEASE_KEY_ALIAS=your-alias
MYAPP_RELEASE_STORE_PASSWORD=your_password
MYAPP_RELEASE_KEY_PASSWORD=your_password
```

---

## 10. CORS Configuration

### Development
```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:19006
```

### Production
Add your production frontend URLs:
```env
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

---

## Configuration Files Summary

### Backend (`backend/.env`)
```env
# Server
NODE_ENV=development
PORT=3000

# Database
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# SendGrid
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=

# Google OAuth
GOOGLE_CLIENT_ID_ANDROID=
GOOGLE_CLIENT_ID_WEB=
GOOGLE_CLIENT_ID_IOS=
GOOGLE_CLIENT_SECRET=
FIREBASE_PROJECT_ID=

# Apple Sign In
APPLE_CLIENT_ID=
APPLE_SERVICE_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY_PATH=

# CORS
ALLOWED_ORIGINS=
```

### Mobile App (`TTSGolfApp/.env`)
```env
# Backend API
EXPO_PUBLIC_API_URL=http://YOUR_IP:3000

# Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

# Google OAuth
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
```

---

## Verification Checklist

After configuration, verify:

1. **Backend starts without errors**
   ```bash
   cd backend && npm start
   ```

2. **Mobile app connects to backend**
   - Check API_URL is correct
   - Test health endpoint: `http://YOUR_IP:3000/health`

3. **Google Sign-In works**
   - SHA-1 added to Firebase
   - OAuth clients created
   - google-services.json updated

4. **SMS/OTP works**
   - Twilio credentials correct
   - Phone number verified

5. **Database connection works**
   - Supabase credentials correct
   - Schema applied

---

## Troubleshooting

### Backend won't start
- Check all required environment variables are set
- Verify database connection
- Check port 3000 is not in use

### Mobile app can't connect
- Use IP address, not localhost
- Check firewall allows port 3000
- Verify backend is running

### Google Sign-In fails
- Verify SHA-1 fingerprint in Firebase
- Check google-services.json is up to date
- Verify OAuth client IDs match

### SMS not sending
- Check Twilio credentials
- Verify phone number format
- Check Twilio account balance

---

## Security Best Practices

1. **Never commit `.env` files**
2. **Use different credentials for dev/prod**
3. **Rotate secrets regularly**
4. **Keep keystore file secure**
5. **Enable 2FA on all service accounts**
6. **Use environment variables in production**
7. **Restrict API keys to specific IPs/domains**

---

For more help, see [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md)
