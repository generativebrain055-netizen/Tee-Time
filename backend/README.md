# TTS Golf App - Backend

Node.js backend API for the TTS Golf App.

## Project Structure

```
backend/
├── config/           # Configuration files (database, logger)
├── controllers/      # Request handlers
├── db/              # Database schema and migrations
│   ├── migrations/  # Database migrations
│   └── schema.sql   # Full database schema
├── middleware/      # Express middleware (auth, rate limiting, validation)
├── repositories/    # Data access layer
├── routes/          # API route definitions
├── scripts/         # Utility scripts
│   ├── migrate-database.js
│   ├── run-full-schema.js
│   ├── setup-database.js
│   └── test-twilio.js
├── utils/           # Helper utilities
├── server.js        # Main application entry point
└── package.json
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your configuration:

```bash
copy .env.example .env
```

3. Setup the database:

```bash
node scripts/setup-database.js
```

4. Start the development server:

```bash
npm run dev
```

## Scripts

- `node scripts/setup-database.js` - Initial database setup
- `node scripts/migrate-database.js` - Run database migrations
- `node scripts/run-full-schema.js` - Execute full schema
- `node scripts/test-twilio.js +1234567890` - Test Twilio configuration

## Tech Stack

- Node.js
- Express.js
- PostgreSQL (Supabase)
- Twilio (SMS OTP)
- JWT Authentication

## API Endpoints

### Authentication

- `POST /auth/request-otp` - Request OTP for phone verification
- `POST /auth/verify-otp` - Verify OTP code
- `POST /auth/set-password` - Set user password after OTP verification
- `POST /auth/login` - Login with phone and password
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user info
- `PUT /auth/profile` - Update user profile

### Health

- `GET /health` - Server health check
