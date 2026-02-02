# TeeTime Social - Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites

- Node.js v18+
- Android Studio with Android SDK
- Expo CLI: `npm install -g expo-cli`
- Supabase account
- Firebase account

---

## 1. Clone & Install (2 minutes)

```bash
# Clone repository
git clone <repository-url>
cd TeeTimeApp

# Install backend dependencies
cd backend
npm install

# Install mobile app dependencies
cd ../TTSGolfApp
npm install
```

---

## 2. Configure Backend (2 minutes)

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your credentials:
```env
# Minimum required for development
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_random_secret
FIREBASE_PROJECT_ID=your_firebase_project_id
```

---

## 3. Configure Mobile App (1 minute)

```bash
cd TTSGolfApp
cp .env.example .env
```

Edit `TTSGolfApp/.env`:
```env
# Find your IP: ipconfig (Windows) or ifconfig (Mac/Linux)
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000

# From Firebase Console
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
# ... other Firebase values

# From Google Cloud Console
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id
```

---

## 4. Setup Database (1 minute)

1. Go to your Supabase project
2. Open SQL Editor
3. Run `backend/schema/unified_schema.sql`

---

## 5. Start Development (30 seconds)

### Option A: Use Quick Start Script (Windows)
```bash
# From root directory
start-app.bat
```

### Option B: Manual Start

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Mobile App:**
```bash
cd TTSGolfApp
npx expo start
```

---

## 6. Run on Device

### Android Emulator
```bash
cd TTSGolfApp
npx expo run:android
```

### Physical Device
1. Install Expo Go app
2. Scan QR code from terminal

---

## Verify Installation

### Backend Health Check
Open browser: `http://localhost:3000/health`

Should return:
```json
{
  "status": "ok",
  "timestamp": "2026-02-01T..."
}
```

### Mobile App
- App should load without errors
- Try phone/OTP login
- Try Google Sign-In

---

## Common Issues

### Backend won't start
```bash
# Check if port 3000 is in use
netstat -ano | findstr :3000

# Kill process if needed
taskkill /PID <process_id> /F
```

### Mobile app can't connect
- Use your local IP, not `localhost`
- Check firewall allows port 3000
- Verify backend is running

### Google Sign-In fails
- Add SHA-1 to Firebase (see CONFIGURATION.md)
- Update google-services.json
- Rebuild app

---

## Next Steps

1. **Complete Configuration**: See [CONFIGURATION.md](CONFIGURATION.md)
2. **Read Documentation**: See [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md)
3. **Understand Structure**: See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
4. **API Reference**: See [docs/API_REFERENCE.md](docs/API_REFERENCE.md)

---

## Development Workflow

### Making Changes

**Backend:**
1. Edit code in `backend/`
2. Server auto-restarts (nodemon)
3. Test changes

**Mobile App:**
1. Edit code in `TTSGolfApp/`
2. Save file
3. App hot-reloads automatically

### Testing

**Backend:**
```bash
cd backend
npm test
```

**Mobile App:**
```bash
cd TTSGolfApp
npm test
```

### Building

**Android APK:**
```bash
cd TTSGolfApp
npx expo run:android --variant release
```

**iOS:**
```bash
cd TTSGolfApp
eas build --platform ios
```

---

## Useful Commands

### Backend
```bash
npm start              # Start server
npm run dev            # Start with nodemon
npm test               # Run tests
```

### Mobile App
```bash
npx expo start         # Start dev server
npx expo start -c      # Clear cache and start
npx expo run:android   # Run on Android
npx expo run:ios       # Run on iOS
```

### Database
```bash
# Run migrations
node backend/scripts/migrate-database.js

# Check tee times
node backend/scripts/check-tee-times.js
```

---

## Getting Help

1. Check [CONFIGURATION.md](CONFIGURATION.md) for setup issues
2. See [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) for detailed instructions
3. Review [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for code organization
4. Check logs in `backend/logs/`

---

## Quick Reference

### Important Files
- `backend/.env` - Backend configuration
- `TTSGolfApp/.env` - Mobile app configuration
- `backend/schema/unified_schema.sql` - Database schema
- `clubs.csv` - Golf course database

### Important URLs
- Backend: `http://localhost:3000`
- Health Check: `http://localhost:3000/health`
- API Docs: See `docs/API_REFERENCE.md`

### Important Ports
- Backend: 3000
- Expo Dev Server: 8081
- Metro Bundler: 8081

---

**Ready to code!** 🚀

For detailed setup, see [CONFIGURATION.md](CONFIGURATION.md)
