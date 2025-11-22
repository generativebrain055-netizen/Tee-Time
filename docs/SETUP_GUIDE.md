# Setup Guide - TeeTime Golf App

## ✅ What's Been Fixed

### 1. **Onboarding Flow**
- ✅ App now starts with Login screen
- ✅ "Don't have an account? Sign Up" link
- ✅ Proper Signup screen with user data collection
- ✅ OTP verification integrated into signup flow

### 2. **Signup Screen**
Collects:
- First Name *
- Last Name *
- Phone Number *
- Handicap (optional)

Then verifies phone with OTP before creating account.

### 3. **Login Screen**
Simple login with:
- Phone Number
- Password
- Link to Signup

### 4. **PostgreSQL Setup**
- ✅ Database setup script created
- ✅ Tables: users, otp_requests, sessions
- ✅ Proper indexes
- ✅ Default password set to 'postgres'

---

## 🚀 Quick Start

### Step 1: Setup Database (Optional but Recommended)

**If you have PostgreSQL installed:**
```bash
cd backend
node setup-database.js
```

**If you don't have PostgreSQL:**
- The app will run in-memory mode (data won't persist)
- To install PostgreSQL:
  - Windows: https://www.postgresql.org/download/windows/
  - Mac: `brew install postgresql`
  - Linux: `sudo apt-get install postgresql`

### Step 2: Start the App
```bash
start-app.bat
```

Or manually:
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd TTSGolfApp
npm start
```

---

## 📱 User Flow

### New User (Signup)
1. Open app → See Login screen
2. Click "Don't have an account? Sign Up"
3. Enter:
   - First Name: John
   - Last Name: Doe
   - Phone: +923054449099
   - Handicap: 15 (optional)
4. Click "Send OTP"
5. Check backend console for OTP:
   ```
   👉 [TEST MODE] OTP for +923054449099: 123456
   ```
6. Enter OTP → Click "Verify & Continue"
7. Account created! → Redirected to Home

### Existing User (Login)
1. Open app → See Login screen
2. Enter:
   - Phone: +923054449099
   - Password: your_password
3. Click "Login"
4. Logged in! → Redirected to Home

---

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  handicap INTEGER,
  social_rate INTEGER DEFAULT 100,
  password_hash TEXT,
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

## 🔧 Configuration

### Database (.env)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tts_golf_db
DB_USER=postgres
DB_PASSWORD=postgres
```

### Twilio (Still in TEST MODE)
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=+923054449099
TWILIO_SID=SKcbe425f9b935d184c98979b3459de9dd
TWILIO_SECRET=cSSFzhizCfiKk7APpbW8W6S0CNJYE8G6
```

---

## 🧪 Testing

### Test Signup Flow
1. Start app
2. Click "Sign Up"
3. Fill form with test data
4. Use OTP from console
5. Verify account created

### Test Login Flow
1. After signup, you'll be logged in
2. Close app and reopen
3. Enter phone and password
4. Verify login works

### Check Database
```bash
# Connect to PostgreSQL
psql -U postgres -d tts_golf_db

# View users
SELECT * FROM users;

# View OTP requests
SELECT * FROM otp_requests;
```

---

## 📁 New Files Created

```
TTSGolfApp/
├── screens/
│   ├── SignupScreen.js          # NEW: Signup with OTP
│   └── SimpleLoginScreen.js     # NEW: Simple login
│
backend/
├── setup-database.js            # NEW: Database setup script
└── repositories/
    └── userRepository.js        # UPDATED: New fields
```

---

## ⚠️ Important Notes

### In-Memory Mode (No Database)
- ✅ App works without PostgreSQL
- ⚠️ Data is lost when backend restarts
- ⚠️ Can't test login after restart

### With Database
- ✅ Data persists between restarts
- ✅ Can test full login flow
- ✅ Production-ready

### OTP in TEST MODE
- ✅ No SMS costs
- ✅ OTP logged to console
- ✅ Perfect for development
- ⚠️ Need Account SID for real SMS

---

## 🐛 Troubleshooting

### "Database connection failed"
- Check PostgreSQL is running
- Verify password in .env
- Run: `psql -U postgres` to test connection
- Or just use in-memory mode (it's fine!)

### "OTP not working"
- Check backend console for OTP code
- Make sure backend is running
- OTP expires in 5 minutes

### "Can't login after signup"
- If using in-memory mode, restart loses data
- Set up PostgreSQL for persistence
- Or just signup again after restart

### "Network request failed"
- Make sure backend is running on port 3000
- Check `http://localhost:3000/health`

---

## ✅ Success Checklist

- [ ] Backend running without errors
- [ ] Frontend running (Expo)
- [ ] Can see Login screen
- [ ] Can navigate to Signup
- [ ] Can fill signup form
- [ ] Can receive OTP (console)
- [ ] Can verify OTP
- [ ] Account created successfully
- [ ] Can login with credentials

---

## 🎯 Next Steps

1. **Test the flow** - Signup and login
2. **Setup PostgreSQL** (optional) - For data persistence
3. **Add Twilio Account SID** - For real SMS
4. **Build more screens** - Profile, Roster, etc.

---

**Status**: ✅ Onboarding flow complete and ready to test!
