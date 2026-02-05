# 🚀 URGENT: Deploy Now - Step by Step

## ⚠️ IMPORTANT: Login Required First

The deployment requires **interactive login** to EAS. You need to run these commands **in your terminal** (not automated).

## Quick Deploy (Copy & Paste)

Open **Terminal** and run:

```bash
cd /Volumes/Macintosh_HD/Users/user284740/Downloads/TeeTimeSocial/Tee-Time/TTSGolfApp
./LOGIN_AND_DEPLOY.sh
```

## Or Manual Steps:

### Step 1: Login to EAS
```bash
cd /Volumes/Macintosh_HD/Users/user284740/Downloads/TeeTimeSocial/Tee-Time/TTSGolfApp
npx --yes eas-cli login
```
**A browser window will open** - authenticate there.

### Step 2: Verify Login
```bash
npx --yes eas-cli whoami
```

### Step 3: Set API URL
```bash
npx --yes eas-cli env:create --scope project --name EXPO_PUBLIC_API_URL --value "https://api.teetimesocial.app" --type string --force
```

### Step 4: Build iOS App
```bash
npx --yes eas-cli build --platform ios --profile internal-testing
```
⏱️ **This takes 15-30 minutes**

### Step 5: Submit to TestFlight
```bash
npx --yes eas-cli submit --platform ios --latest
```

## ✅ After Submission

1. Go to https://appstoreconnect.apple.com
2. Navigate to your app → **TestFlight**
3. Wait 10-30 minutes for processing
4. Build will appear in "iOS Builds"

## 📝 Current Status

- ✅ Build number updated to **8**
- ✅ All fixes applied (atob, error handling, etc.)
- ✅ Deployment scripts ready
- ⏳ **Waiting for login** to proceed

---

**Run the commands above in your terminal to deploy!**
