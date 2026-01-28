# Tee Time Social - Development Workflow

## Project Structure

```
TeeTime/
├── backend/           # Node.js Express API
├── TTSGolfApp/        # React Native Mobile App
├── docs/              # Documentation
└── tests/             # Test files
```

## Development Commands

### Backend
```bash
cd backend
npm install
npm run dev          # Start development server (port 3000)
```

### Mobile App
```bash
cd TTSGolfApp
npm install
npx expo start       # Start Expo development server
```

## Phase Overview

### Phase 1: Backend Authentication (COMPLETED)
- PostgreSQL database setup
- User authentication (OTP, password, magic link)
- JWT token management
- Session handling
- Device fingerprinting

### Phase 2: Mobile App Development (75% COMPLETE)
- State management with Zustand
- Performance optimization (FlashList, memo, callbacks)
- API integration for all screens
- UI/UX improvements

**Remaining:**
- FCFS invite logic
- Group member assignment fix
- GroupDetail API connection
- Real-time messaging

### Phase 3: Production (PLANNED)
- Push notifications
- Real-time WebSocket messaging
- App store deployment
- Performance monitoring

## Key Files

| File | Purpose |
|------|---------|
| `TTSGolfApp/services/api.ts` | All API calls |
| `TTSGolfApp/stores/authStore.ts` | Auth state management |
| `backend/server.js` | API entry point |
| `backend/controllers/` | API controllers |

## Testing

```bash
# Backend health check
curl http://localhost:3000/health

# Run mobile app on iOS
npx expo run:ios

# Run mobile app on Android
npx expo run:android
```
