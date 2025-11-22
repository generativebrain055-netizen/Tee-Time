# Update IP Address for Physical Device Testing

## Current IP: 192.168.18.103

If you get "Network Error" on your phone, your computer's IP might have changed.

## Quick Fix:

### Step 1: Find Your Computer's IP

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually WiFi or Ethernet)

**Mac/Linux:**
```bash
ifconfig
```
Look for "inet" address

### Step 2: Update the IP

Open `TTSGolfApp/config/api.js` and update line 22:

```javascript
return 'http://YOUR_NEW_IP:3000';
```

Example:
```javascript
return 'http://192.168.18.103:3000';
```

### Step 3: Restart Expo

```bash
# Stop the app (Ctrl+C)
# Start again
npm start
```

---

## Important Notes:

1. **Same WiFi Network**: Your phone and computer must be on the same WiFi network
2. **Firewall**: Make sure Windows Firewall allows Node.js connections
3. **Port 3000**: Backend must be running on port 3000

---

## Testing Connection:

Open your phone's browser and go to:
```
http://192.168.18.103:3000/health
```

You should see:
```json
{"status":"ok","message":"TTS Golf App API is running"}
```

If you see this, your connection is working! ✅

---

## Troubleshooting:

### "Network request failed"
- Check if backend is running
- Verify IP address is correct
- Make sure phone and computer are on same WiFi
- Try disabling Windows Firewall temporarily

### "Connection refused"
- Backend might not be running
- Port 3000 might be blocked
- Try restarting backend

### "Timeout"
- IP address might be wrong
- Check WiFi connection
- Try pinging the IP from your phone's browser

---

**Current Setup:**
- Computer IP: `192.168.18.103`
- Backend Port: `3000`
- API URL: `http://192.168.18.103:3000`
