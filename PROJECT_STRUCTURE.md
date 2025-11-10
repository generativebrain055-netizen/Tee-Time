# TTS Golf App - Project Structure

## Overview

This project consists of two main components:

1. **TTSGolfApp/** - Expo/React Native mobile application (iOS & Android)
2. **backend/** - Node.js REST API server

## Directory Structure

```
TEETIME/
├── TTSGolfApp/              # Expo/React Native mobile app
│   ├── assets/              # Images, fonts, icons
│   ├── src/                 # Source code (to be created)
│   │   ├── components/      # Reusable components
│   │   ├── screens/         # App screens
│   │   ├── navigation/      # Navigation setup
│   │   ├── services/        # API & external services
│   │   └── utils/           # Helper functions
│   ├── App.js               # Root component
│   ├── app.json             # Expo configuration
│   └── package.json
│
├── backend/                 # Node.js backend
│   ├── server.js            # Entry point
│   ├── package.json
│   ├── .env.example         # Environment variables template
│   ├── .gitignore
│   └── README.md
│
└── requirements.txt         # Project requirements document
```

## Getting Started

### Backend Setup
```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

### Mobile App Setup
```bash
cd TTSGolfApp
npm install
npm start  # Scan QR code with Expo Go app on your phone
```

## Technology Stack

### Mobile App
- Expo SDK
- React Native
- Firebase Cloud Messaging
- React Navigation
- Expo Location (Geolocation)
- Expo Camera (QR Scanning)

### Backend
- Node.js + Express
- PostgreSQL
- Twilio API
- Firebase Admin SDK
- Google Maps API

## Next Steps

1. Install dependencies for both projects
2. Set up PostgreSQL database
3. Configure environment variables
4. Implement authentication flow
5. Build core features per requirements.txt
