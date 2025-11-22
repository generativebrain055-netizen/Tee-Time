# TeeTime Golf App - Complete Documentation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (optional for development)
- Twilio account (for OTP)

### Installation & Running

**Option 1: Use the batch file (Windows)**
```bash
start-app.bat
```

**Option 2: Manual start**
```bash
# Terminal 1 - Backend
cd backend
npm install
npm start

# Terminal 2 - Frontend
cd TTSGolfApp
npm install
npm start
```

---

## 📱 Project Overview

TeeTime Golf App is a React Native mobile application with a Node.js/Express backend, featuring:
- Phone number authentication with OTP
- Password-based login
- PostgreSQL database
- Twilio SMS integration
- JWT session management

### Tech Stack

**Frontend (React Native)**
- React Native 0.81.5
- Expo ~54.0.23
- React 19.1.0

**Backend (Node.js)**
- Express.js
- PostgreSQL with pg
- Twilio (Verify API & Messages API)
- bcryptjs for password hashing
- JWT for authentication

---

## 🔐 Twilio OTP Setup

### Method 1: Verify API (Recommended - FREE for Development)

1. **Get Twilio Credentials**
   - Go to [Twilio Console](https://console.twilio.com/)
   - Copy **Account SID** (starts with `AC`)
   - Copy **Auth Token**

2. **Create Verify Service**
   - Go to [Verify Services](https://console.twilio.com/us1/develop/verify/services)
   - Click "Create new Service"
   - Name it "TeeTime Golf"
   - Copy **Service SID** (starts with `VA`)

3. **Update `.env` file**
   ```env
   TWILIO_ACCOUNT_SID=AC1234567890abcdef1234567890abcdef
   TWILIO_AUTH_TOKEN=your_actual_auth_token_here
   TWILIO_VERIFY_SERVICE_SID=VA1234567890abcdef1234567890abcdef
   ```

4. **Test Setup**
   ```bash
   cd backend
   node test-twilio.js +923001234567
   ```

### Method 2: Messages API (Requires Phone Number)

1. Follow steps 1-2 from Method 1
2. Buy a Twilio phone number with SMS capability
3. Update `.env`:
   ```env
   TWILIO_ACCOUNT_SID=AC1234567890abcdef1234567890abcdef
   TWILIO_AUTH_TOKEN=your_actual_auth_token_here
   TWILIO_FROM_NUMBER=+923054449099
   ```

### Development Mode (No Twilio Needed)

If Twilio is not configured, OTP codes will be logged to the console:
```
🔐 OTP for +923001234567: 123456
```

---

## 📁 Project Structure

```
TeeTimeGolfApp/
├── backend/                    # Node.js backend
│   ├── config/                 # Database & logger config
│   ├── controllers/            # Business logic
│   │   └── authController.js   # Authentication logic
│   ├── db/                     # Database schemas & migrations
│   ├── middleware/             # Express middleware
│   ├── repositories/           # Database operations
│   ├── routes/                 # API routes
│   ├── utils/                  # Helper functions
│   ├── server.js               # Main server file
│   ├── test-twilio.js          # Twilio test script
│   └── package.json
│
├── TTSGolfApp/                 # React Native frontend
│   ├── assets/                 # Images, fonts, etc.
│   ├── screens/                # App screens
│   │   ├── LoginScreen.js      # Phone login with OTP
│   │   └── HomePage.js         # Main app screen
│   ├── App.js                  # Root component
│   └── package.json
│
├── docs/                       # Documentation
│   ├── README.md               # This file
│   └── requirements.txt        # Project requirements
│
├── .env                        # Environment variables
└── start-app.bat               # Windows batch file to start both
```

---

## 🔧 Configuration

### Environment Variables (.env)

```env
# Server
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tts_golf_db
DB_USER=postgres
DB_PASSWORD=your_password

# Twilio (Choose one method)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=VA...    # Recommended
# OR
TWILIO_FROM_NUMBER=+923054449099   # Alternative

# OTP Settings
OTP_TTL_MS=300000                  # 5 minutes
OTP_RESEND_SECONDS=30
OTP_MAX_ATTEMPTS=5
OTP_RATE_LIMIT_PER_HOUR=5

# JWT
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

---

## 🎯 API Endpoints

### Authentication

**Request OTP**
```http
POST /auth/request-otp
Content-Type: application/json

{
  "phoneNumber": "+923001234567"
}
```

**Verify OTP**
```http
POST /auth/verify-otp
Content-Type: application/json

{
  "phoneNumber": "+923001234567",
  "otp": "123456"
}
```

**Set Password**
```http
POST /auth/set-password
Content-Type: application/json

{
  "phoneNumber": "+923001234567",
  "otpSessionToken": "token_from_verify_response",
  "password": "SecurePass123!"
}
```

**Login**
```http
POST /auth/login
Content-Type: application/json

{
  "phoneNumber": "+923001234567",
  "password": "SecurePass123!"
}
```

---

## 🧪 Testing

### Test Twilio Setup
```bash
cd backend
node test-twilio.js +923001234567
```

### Test Backend API
```bash
# Request OTP
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+923001234567"}'

# Verify OTP
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+923001234567", "otp": "123456"}'
```

---

## 🐛 Troubleshooting

### Backend Issues

**"Twilio is not configured"**
- Check `.env` has `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`
- Run `node backend/test-twilio.js` to verify setup

**"Database connection failed"**
- Check PostgreSQL is running
- Verify database credentials in `.env`
- Server will run in-memory mode if DB unavailable

**"Port 3000 already in use"**
- Change `PORT` in `.env`
- Or kill the process using port 3000

### Frontend Issues

**"Network request failed"**
- Ensure backend is running on `http://localhost:3000`
- Check `EXPO_PUBLIC_API_URL` in `.env`

**"Unable to resolve module"**
- Run `cd TTSGolfApp && npm install`
- Clear cache: `npx expo start -c`

### Twilio Issues

**"Invalid phone number"**
- Use E.164 format: `+923001234567`
- Include `+` and country code

**"Unable to send OTP"**
- Trial accounts can only send to verified numbers
- Verify at: https://console.twilio.com/us1/develop/phone-numbers/manage/verified
- Or upgrade to paid account

**OTP not received**
- Check Twilio logs: https://console.twilio.com/monitor/logs/sms
- Verify account balance
- Check phone number format

---

## 💰 Cost Information

### Twilio Verify API (Recommended)
- **Development**: FREE
- **Production**: $0.05 per verification
- **No phone number needed**

### Twilio Messages API
- **Phone Number**: $1-2/month
- **SMS to Pakistan**: ~$0.04/message
- **SMS to US**: ~$0.0075/message

---

## 🔒 Security Best Practices

1. ✅ Never commit `.env` file to git
2. ✅ Use strong JWT secrets (256-bit)
3. ✅ Enable rate limiting (already configured)
4. ✅ Use HTTPS in production
5. ✅ Rotate Twilio credentials regularly
6. ✅ Use Twilio API Keys instead of Auth Token in production
7. ✅ Validate all user inputs
8. ✅ Hash passwords with bcrypt (already implemented)

---

## 📦 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### OTP Requests Table
```sql
CREATE TABLE otp_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id),
  otp_code_hash TEXT NOT NULL,
  purpose TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  is_verified BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  ip_address TEXT,
  device_fingerprint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🚀 Deployment

### Backend Deployment (Heroku/Railway/Render)

1. Set environment variables
2. Configure PostgreSQL database
3. Set `NODE_ENV=production`
4. Update `API_URL` to production URL

### Frontend Deployment (Expo)

1. Update `EXPO_PUBLIC_API_URL` to production backend URL
2. Build for iOS: `eas build --platform ios`
3. Build for Android: `eas build --platform android`
4. Submit to stores: `eas submit`

---

## 📞 Support & Resources

- **Twilio Console**: https://console.twilio.com/
- **Twilio Verify Docs**: https://www.twilio.com/docs/verify/api
- **Expo Docs**: https://docs.expo.dev/
- **React Native Docs**: https://reactnative.dev/

---

## ✅ Checklist

### Initial Setup
- [ ] Node.js 18+ installed
- [ ] PostgreSQL installed (optional)
- [ ] Twilio account created
- [ ] `.env` file configured
- [ ] Dependencies installed (`npm install` in both folders)

### Twilio Setup
- [ ] Account SID copied to `.env`
- [ ] Auth Token copied to `.env`
- [ ] Verify Service created (or phone number purchased)
- [ ] Test script runs successfully
- [ ] OTP received on test phone

### Running the App
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Can request OTP from app
- [ ] Can verify OTP and set password
- [ ] Can login with phone and password

---

## 📝 Development Workflow

1. **Start Development**
   ```bash
   start-app.bat
   ```

2. **Make Changes**
   - Backend: Edit files in `backend/`
   - Frontend: Edit files in `TTSGolfApp/`
   - Server auto-restarts with nodemon

3. **Test Changes**
   - Backend: Use curl or Postman
   - Frontend: Use Expo Go app or simulator

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "Your message"
   git push
   ```

---

**Last Updated**: November 2024
**Version**: 1.0.0
