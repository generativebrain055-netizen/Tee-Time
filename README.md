# TeeTime Social Golf App

A mobile application for organizing golf tee times with friends, built with React Native (Expo) and Node.js backend.

## Project Structure

```
TeeTime/
├── backend/              # Node.js/Express API server
│   ├── config/          # Database, logger, and service configs
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth, validation, error handling
│   ├── repositories/    # Database access layer
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic
│   └── schema/          # Database schema and migrations
│
├── TTSGolfApp/          # React Native mobile app (Expo)
│   ├── components/      # Reusable UI components
│   ├── screens/         # App screens
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API client
│   ├── stores/          # State management (Zustand)
│   └── utils/           # Helper functions
│
├── docs/                # Documentation
│   └── setup/          # Setup and configuration guides
│
└── tests/              # API tests
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- iOS Simulator (Mac) or Android Emulator
- Supabase account (for database)
- Twilio account (for SMS/OTP)

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
npm install
npm start
```

Backend runs on `http://localhost:3000`

### Frontend Setup

```bash
cd TTSGolfApp
cp .env.example .env
# Edit .env with your local IP address
npm install
npx expo start
```

Press `i` for iOS simulator or `a` for Android emulator.

## Documentation

- **[Environment Setup Guide](docs/setup/ENV_SETUP.md)** - Complete setup instructions
- **[OAuth Troubleshooting](docs/setup/OAUTH_TROUBLESHOOTING.md)** - Fix Google/Apple Sign-In issues
- **[API Documentation](docs/API_DOCUMENTATION.pdf)** - Backend API reference
- **[User Stories](docs/USER_STORIES.pdf)** - Feature requirements

## Features

- 📱 Phone number authentication with OTP
- 🔐 OAuth sign-in (Google, Apple)
- ⛳ Create and manage tee times
- 👥 Roster management
- 📅 Calendar view
- 💬 In-app messaging
- 📊 Social rate tracking
- 🎯 Attendance management

## Tech Stack

**Backend:**
- Node.js + Express
- PostgreSQL (via Supabase)
- JWT authentication
- Twilio (SMS)
- SendGrid (Email)

**Frontend:**
- React Native (Expo)
- TypeScript
- Zustand (state management)
- React Navigation

## Development

### Running Tests

```bash
cd tests
./run-tests.ps1
```

### Database Migrations

```bash
cd backend
node scripts/migrate-database.js
```

### Checking Logs

```bash
# Backend logs
tail -f backend/logs/combined.log

# Error logs only
tail -f backend/logs/error.log
```

## Environment Variables

Each part of the app has its own `.env` file:

- `backend/.env` - Server, database, API keys
- `TTSGolfApp/.env` - API URL, OAuth client IDs

See `.env.example` files for required variables.

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Proprietary - All rights reserved

## Support

For setup issues, see [docs/setup/](docs/setup/) directory.
