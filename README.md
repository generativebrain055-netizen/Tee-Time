# TeeTime Golf App

Mobile app for simplifying golf tee time coordination through automated invites, rosters, and communications.

## 🚀 Quick Start

### Windows Users
```bash
start-app.bat
```

### Mac/Linux Users
```bash
# Terminal 1 - Backend
cd backend && npm install && npm start

# Terminal 2 - Frontend  
cd TTSGolfApp && npm install && npm start
```

## 📁 Project Structure

```
TeeTimeGolfApp/
├── backend/           # Node.js/Express API
├── TTSGolfApp/        # React Native mobile app
├── docs/              # Complete documentation
│   ├── README.md      # Full documentation
│   └── requirements.txt
├── .env               # Environment variables
└── start-app.bat      # Windows startup script
```

## 📚 Documentation

**Complete documentation is in [`docs/README.md`](docs/README.md)**

Includes:
- Installation guide
- Twilio OTP setup
- API endpoints
- Troubleshooting
- Deployment guide

## 🔧 Prerequisites

- Node.js 18+
- PostgreSQL (optional for development)
- Twilio account (for OTP)

## ⚙️ Configuration

1. Copy `.env.example` to `.env` (if exists) or update `.env`
2. Add your Twilio credentials:
   ```env
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_VERIFY_SERVICE_SID=VA...
   ```
3. Configure database (optional):
   ```env
   DB_HOST=localhost
   DB_NAME=tts_golf_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```

## 🧪 Testing

Test Twilio setup:
```bash
cd backend
node test-twilio.js +92
```

## 📱 Tech Stack

- **Frontend**: React Native, Expo
- **Backend**: Node.js, Express, PostgreSQL
- **Auth**: Twilio OTP, JWT
- **SMS**: Twilio Verify API

## 🆘 Need Help?

- **Full Documentation**: [`docs/README.md`](docs/README.md)
- **Requirements**: [`docs/requirements.txt`](docs/requirements.txt)
- **Twilio Issues**: Run `node backend/test-twilio.js`

## 📄 License

Proprietary - All rights reserved

---

**For complete setup instructions, troubleshooting, and API documentation, see [`docs/README.md`](docs/README.md)**
