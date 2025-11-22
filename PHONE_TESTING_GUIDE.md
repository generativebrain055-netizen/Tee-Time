# Testing on Physical Phone - Quick Guide

## ✅ Fixed Issues

### 1. Network Error - FIXED
- Updated API config with your computer's IP: `192.168.18.103`
- App will now connect to backend from your phone

### 2. In-Memory Mode Warning - FIXED
- Removed confusing warning message
- Database is actually connected (Supabase)
- Warning was just showing before connection completed

---

## 🚀 How to Test on Your Phone

### Step 1: Make Sure Both Are on Same WiFi
- Computer: Connected to WiFi
- Phone: Connected to **same WiFi network**

### Step 2: Allow Firewall (Windows)
Right-click `allow-port-3000.bat` and select **"Run as Administrator"**

This allows your phone to connect to port 3000.

### Step 3: Start Backend
```bash
cd backend
npm start
```

You should see:
```
✅ Server is running on port 3000
✅ Database connected successfully
✅ Database mode active
```

### Step 4: Start Frontend
```bash
cd TTSGolfApp
npm start
```

### Step 5: Open on Phone
1. Scan the QR code with Expo Go app
2. Or enter the URL manually in Expo Go

### Step 6: Test Connection
Open your phone's browser and go to:
```
http://192.168.18.103:3000/health
```

You should see:
```json
{"status":"ok","message":"TTS Golf App API is running"}
```

If you see this, everything is working! ✅

---

## 🧪 Test the Signup Flow

1. Open app on phone
2. Click "Sign Up"
3. Fill in:
   - First Name: John
   - Last Name: Doe
   - Country: 🇺🇸 +1 (or your country)
   - Phone: 2345678900
   - Handicap: 15
4. Click "Send OTP"
5. Check backend console for OTP:
   ```
   👉 [TEST MODE] OTP for +12345678900: 123456
   ```
6. Enter OTP in app
7. Click "Verify & Continue"
8. Account created! ✅

---

## 🐛 Troubleshooting

### "Network request failed"
**Solution:**
1. Check if backend is running
2. Verify both devices on same WiFi
3. Run `allow-port-3000.bat` as Administrator
4. Check IP is correct in `TTSGolfApp/config/api.js`

### "Connection refused"
**Solution:**
1. Make sure backend is running on port 3000
2. Try restarting backend
3. Check Windows Firewall settings

### "Timeout"
**Solution:**
1. Verify IP address: `ipconfig` in Command Prompt
2. Update IP in `TTSGolfApp/config/api.js` if changed
3. Restart Expo app

### IP Address Changed
**Solution:**
1. Run `ipconfig` to get new IP
2. Update `TTSGolfApp/config/api.js` line 22
3. Restart Expo
4. See `TTSGolfApp/UPDATE_IP.md` for details

---

## 📱 Current Configuration

- **Computer IP**: `192.168.18.103`
- **Backend Port**: `3000`
- **API URL**: `http://192.168.18.103:3000`
- **Database**: Supabase (connected)
- **OTP Mode**: TEST MODE (console logs)

---

## ✅ Success Checklist

- [ ] Backend running without errors
- [ ] Database connected (no in-memory warning)
- [ ] Firewall rule added (port 3000)
- [ ] Phone and computer on same WiFi
- [ ] Health check works in phone browser
- [ ] Expo app opens on phone
- [ ] Can see login screen
- [ ] Can navigate to signup
- [ ] Can send OTP (no network error)
- [ ] Can verify OTP
- [ ] Account created successfully

---

**Everything is configured! Start testing on your phone!** 📱✅
