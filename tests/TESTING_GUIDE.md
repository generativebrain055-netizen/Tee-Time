# Testing Guide - New Features

## Quick Start

1. **Start the backend server:**
```bash
cd backend
npm start
```

2. **Check server is running:**
```bash
curl http://localhost:3000/health
```

## Test Scenarios

### Scenario 1: Magic Link Authentication

**Step 1: Request Magic Link**
```bash
curl -X POST http://localhost:3000/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Magic link generated. Check server console.",
  "mode": "console"
}
```

**Step 2: Check Server Console**
Look for output like:
```
🔗 [MAGIC LINK] for test@example.com:
http://localhost:3000/auth/verify-magic?token=abc123...
```

**Step 3: Verify Magic Link**
```bash
curl "http://localhost:3000/auth/verify-magic?token=YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Magic link verified successfully.",
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "test@example.com",
    "phoneNumber": null
  }
}
```

---

### Scenario 2: Refresh Token Flow

**Step 1: Login to Get Tokens**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+923001234567",
    "password": "YourPassword123!"
  }'
```

**Save the `refreshToken` from response**

**Step 2: Refresh Access Token**
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN_HERE"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully.",
  "accessToken": "new_access_token",
  "refreshToken": "new_refresh_token"
}
```

---

### Scenario 3: Session Management

**Step 1: Login**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+923001234567",
    "password": "YourPassword123!"
  }'
```

**Save the `token` from response**

**Step 2: Logout Current Session**
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

**Step 3: Try Using Token Again (Should Fail)**
```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "message": "Session expired",
    "code": "SESSION_EXPIRED"
  }
}
```

---

### Scenario 4: Logout All Devices

**Step 1: Login from Multiple "Devices"**
```bash
# Login 1
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 (iPhone)" \
  -d '{"phoneNumber": "+923001234567", "password": "YourPassword123!"}'

# Login 2
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 (Windows)" \
  -d '{"phoneNumber": "+923001234567", "password": "YourPassword123!"}'
```

**Step 2: Logout All Sessions**
```bash
curl -X POST http://localhost:3000/auth/logout-all \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Logged out from 2 device(s).",
  "revokedSessions": 2
}
```

---

### Scenario 5: Device Fingerprinting

**Step 1: Login with Different User Agents**
```bash
# From iPhone
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)" \
  -d '{"phoneNumber": "+923001234567", "password": "YourPassword123!"}'

# From Android
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 (Linux; Android 12; SM-G991B)" \
  -d '{"phoneNumber": "+923001234567", "password": "YourPassword123!"}'

# From Desktop
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/96.0" \
  -d '{"phoneNumber": "+923001234567", "password": "YourPassword123!"}'
```

**Step 2: Check Database**
```sql
SELECT device_name, device_type, os, browser, last_seen_at 
FROM devices 
WHERE user_id = 1;
```

**Expected Results:**
```
device_name    | device_type | os      | browser
---------------|-------------|---------|--------
iPhone         | Mobile      | iOS     | Safari
Android Device | Mobile      | Android | Chrome
Windows Desktop| Desktop     | Windows | Chrome
```

---

### Scenario 6: Analytics Tracking

**Step 1: Perform Various Auth Actions**
```bash
# Request OTP
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+923001234567"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+923001234567", "password": "YourPassword123!"}'

# Request Magic Link
curl -X POST http://localhost:3000/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**Step 2: Check Analytics Database**
```sql
SELECT event_name, event_category, created_at, ip_address 
FROM analytics_events 
ORDER BY created_at DESC 
LIMIT 10;
```

**Expected Results:**
```
event_name          | event_category  | created_at
--------------------|-----------------|------------
magic_link_requested| authentication  | 2025-11-23...
login               | authentication  | 2025-11-23...
otp_requested       | authentication  | 2025-11-23...
```

---

## Testing with SendGrid (Production)

### Setup SendGrid

1. **Get API Key from SendGrid:**
   - Go to https://app.sendgrid.com/settings/api_keys
   - Create new API key with "Mail Send" permission

2. **Update .env:**
```env
SENDGRID_API_KEY=SG.your-actual-api-key-here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=TeeTime Golf App
```

3. **Verify Sender Email:**
   - Go to https://app.sendgrid.com/settings/sender_auth
   - Verify your sender email address

4. **Test Magic Link:**
```bash
curl -X POST http://localhost:3000/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email": "your-real-email@example.com"}'
```

5. **Check Your Email:**
   - You should receive an email with a magic link
   - Click the link or copy it to test

---

## Common Issues & Solutions

### Issue: "SendGrid API key not configured"
**Solution:** Add `SENDGRID_API_KEY` to `.env` file

### Issue: "Session not found"
**Solution:** Make sure you're using the access token, not the refresh token

### Issue: "Invalid or expired magic link"
**Solution:** Magic links expire after 15 minutes. Request a new one.

### Issue: "Too many requests"
**Solution:** Rate limiting is active. Wait a few minutes and try again.

### Issue: "Database connection failed"
**Solution:** Check PostgreSQL is running and credentials in `.env` are correct

---

## Automated Testing Script

Create a file `test-auth.sh`:

```bash
#!/bin/bash

API_URL="http://localhost:3000"

echo "🧪 Testing TeeTime Auth System"
echo "================================"

# Test 1: Health Check
echo "\n1️⃣ Testing Health Check..."
curl -s "$API_URL/health" | jq

# Test 2: Request Magic Link
echo "\n2️⃣ Testing Magic Link Request..."
curl -s -X POST "$API_URL/auth/magic-link" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}' | jq

# Test 3: Login
echo "\n3️⃣ Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+923001234567", "password": "YourPassword123!"}')
echo $LOGIN_RESPONSE | jq

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.refreshToken')

# Test 4: Get Current User
echo "\n4️⃣ Testing Get Current User..."
curl -s "$API_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN" | jq

# Test 5: Refresh Token
echo "\n5️⃣ Testing Token Refresh..."
curl -s -X POST "$API_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}" | jq

# Test 6: Logout
echo "\n6️⃣ Testing Logout..."
curl -s -X POST "$API_URL/auth/logout" \
  -H "Authorization: Bearer $TOKEN" | jq

echo "\n✅ Testing Complete!"
```

Run with:
```bash
chmod +x test-auth.sh
./test-auth.sh
```

---

## Database Queries for Verification

### Check Active Sessions
```sql
SELECT s.id, u.phone_number, s.created_at, s.last_activity_at, s.ip_address
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.is_active = true
ORDER BY s.created_at DESC;
```

### Check Magic Links
```sql
SELECT email, purpose, is_used, created_at, expires_at
FROM magic_links
ORDER BY created_at DESC
LIMIT 10;
```

### Check Devices
```sql
SELECT u.phone_number, d.device_name, d.device_type, d.os, d.last_seen_at
FROM devices d
JOIN users u ON d.user_id = u.id
ORDER BY d.last_seen_at DESC;
```

### Check Analytics Events
```sql
SELECT event_name, event_category, COUNT(*) as count
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_name, event_category
ORDER BY count DESC;
```

---

**Happy Testing! 🚀**
