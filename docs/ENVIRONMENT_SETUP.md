# Local Development Environment Setup

## Prerequisites

- Node.js 20.x or later
- npm 9.x or later
- Git
- Supabase account
- Twilio account (for SMS)
- SendGrid account (for email)

---

## Backend Setup

### 1. Clone and Install

```bash
git clone https://github.com/your-repo/teetime.git
cd teetime/backend
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# Server
NODE_ENV=development
PORT=3000

# No SSL for local development
SSL_KEY_PATH=
SSL_CERT_PATH=

# Supabase (get from supabase.com dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT (generate a random string)
JWT_SECRET=your-local-dev-secret-key

# Twilio (optional for local dev)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# SendGrid (optional for local dev)
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=

# Google OAuth (from console.cloud.google.com)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# Apple OAuth (from developer.apple.com)
APPLE_CLIENT_ID=com.yourapp.bundle
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=

# CORS
ALLOWED_ORIGINS=http://localhost:3000,exp://192.168.1.x:8081
```

### 3. Database Setup

Run the schema migration:

```bash
npm run setup-db
```

Or manually run the SQL in `schema/unified_schema.sql` in Supabase SQL editor.

### 4. Start Development Server

```bash
npm run dev
```

Server runs at `http://localhost:3000`

Verify: `curl http://localhost:3000/health`

---

## Mobile App Setup

### 1. Install Dependencies

```bash
cd TTSGolfApp
npm install
```

### 2. Configure API URL

Edit `config/api.ts` or environment config:

```typescript
// For local development with physical device
export const API_URL = 'http://YOUR_COMPUTER_IP:3000';

// For iOS simulator
export const API_URL = 'http://localhost:3000';

// For Android emulator
export const API_URL = 'http://10.0.2.2:3000';
```

### 3. Start Expo

```bash
npx expo start
```

---

## Testing

### Run Backend Tests

```bash
cd backend
npm test
```

### API Testing with curl

```bash
# Health check
curl http://localhost:3000/health

# Get courses (public)
curl http://localhost:3000/api/courses/search?q=scottsdale
```

---

## Common Issues

### Port 3000 already in use

```bash
# Find and kill the process
npx kill-port 3000
```

### Database connection failed

- Verify Supabase URL and keys in `.env`
- Check Supabase dashboard for connection issues
- Ensure your IP is allowed in Supabase settings

### OAuth not working locally

- Add `http://localhost:3000` to Google OAuth redirect URIs
- Apple OAuth requires HTTPS (use production or ngrok for testing)

### Mobile app can't connect to backend

- Ensure computer and phone are on same network
- Use computer's local IP (not localhost) in API_URL
- Check firewall allows port 3000

---

## Useful Commands

```bash
# Backend
npm run dev          # Start with nodemon (auto-reload)
npm start            # Start production
npm run setup-db     # Run database migrations
npm test             # Run tests

# Mobile
npx expo start       # Start Expo dev server
npx expo start --ios # Start iOS simulator
npx expo start --android # Start Android emulator
```
