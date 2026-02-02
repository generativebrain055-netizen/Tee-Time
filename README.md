# TeeTime Social

A mobile application for organizing golf tee times with friends, managing rosters, and coordinating golf outings.

## Features

- **Authentication**: Phone/OTP, Google Sign-In, Apple Sign-In
- **Tee Time Management**: Create, manage, and track golf tee times
- **Roster System**: Organize players into groups with priority ordering
- **Invite System**: FCFS (First Come First Served), Manual, and Roster-based invites
- **Real-time Notifications**: Push notifications for invites and updates
- **Social Features**: Friend management, player profiles, and social ratings
- **Course Database**: 14,000+ golf courses with search and autocomplete

## Tech Stack

### Mobile App
- **Framework**: React Native with Expo
- **UI**: NativeWind (Tailwind CSS for React Native)
- **State Management**: Zustand
- **Navigation**: React Navigation
- **Authentication**: Firebase Auth (Google Sign-In), Expo Apple Authentication

### Backend
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL (Supabase)
- **Authentication**: JWT, Firebase Admin SDK (Google OAuth)
- **SMS/OTP**: Twilio
- **Email**: SendGrid
- **OAuth**: Firebase Authentication (Google), Apple Sign In

## Project Structure

```
TeeTimeApp/
├── backend/              # Node.js/Express backend
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── data/            # Data files (golf courses CSV)
│   ├── middleware/      # Express middleware
│   ├── repositories/    # Database access layer
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   └── server.js        # Entry point
│
├── TTSGolfApp/          # React Native mobile app
│   ├── assets/          # Images, fonts, etc.
│   ├── components/      # Reusable components
│   ├── config/          # App configuration
│   ├── constants/       # Constants and tokens
│   ├── hooks/           # Custom React hooks
│   ├── screens/         # App screens
│   ├── services/        # API services
│   ├── stores/          # State management
│   ├── theme/           # Design system
│   ├── types/           # TypeScript types
│   └── utils/           # Utility functions
│
├── docs/                # Documentation
│   ├── SETUP_GUIDE.md   # Complete setup instructions
│   ├── FIREBASE_CONFIGURATION.md # Firebase setup guide
│   ├── API_REFERENCE.md # API documentation
│   └── AWS_DEPLOYMENT.md # Deployment guide
│
└── start-app.bat        # Quick start script (Windows)
```

## Quick Start

### Prerequisites
- Node.js (v18+)
- Android Studio with Android SDK
- Expo CLI
- PostgreSQL database (Supabase account)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd TeeTimeApp
```

2. **Backend Setup**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

3. **Mobile App Setup**
```bash
cd TTSGolfApp
npm install
cp .env.example .env
# Edit .env with your configuration
npx expo start
```

### Configuration

See [docs/CONFIGURATION.md](docs/CONFIGURATION.md) for detailed setup instructions including:
- Environment variables configuration
- Firebase setup (see [docs/FIREBASE_CONFIGURATION.md](docs/FIREBASE_CONFIGURATION.md))
- OAuth configuration
- Database setup
- Keystore generation

## Development

### Running the App

**Start Backend:**
```bash
cd backend
npm start
```

**Start Mobile App:**
```bash
cd TTSGolfApp
npx expo start
```

**Run on Android:**
```bash
cd TTSGolfApp
npx expo run:android
```

**Run on iOS:**
```bash
cd TTSGolfApp
npx expo run:ios
```

### Building for Production

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

## API Documentation

See [docs/API_REFERENCE.md](docs/API_REFERENCE.md) for complete API documentation.

## Deployment

See [docs/AWS_DEPLOYMENT.md](docs/AWS_DEPLOYMENT.md) for AWS deployment instructions.

## Quick Start

See [docs/QUICK_START.md](docs/QUICK_START.md) for a 5-minute quick start guide.

## Environment Variables

### Backend (.env)
- Database credentials (Supabase)
- JWT secrets
- Twilio credentials (SMS/OTP)
- SendGrid API key (Email)
- Google OAuth credentials
- Apple Sign In credentials
- Firebase project ID

### Mobile App (.env)
- Backend API URL
- Firebase configuration
- Google OAuth web client ID

See `.env.example` files in each directory for complete list.

## Security Notes

- Never commit `.env` files to version control
- Keep your keystore file secure
- Rotate secrets regularly
- Use different credentials for development and production
- Enable 2FA on all service accounts

## License

Proprietary - All rights reserved

## Support

For issues and questions, please contact the development team.
