# OAuth Quick Reference

## 🚀 Quick Start

### 1. Run Migration
```sql
-- In Supabase SQL Editor, run:
backend/schema/migrations/add_oauth_providers.sql
```

### 2. Configure .env
```bash
GOOGLE_CLIENT_ID_IOS=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_ID_ANDROID=your-id.apps.googleusercontent.com
APPLE_CLIENT_ID=com.yourapp.bundle
```

### 3. Test Setup
```bash
node backend/scripts/test-oauth-setup.js
```

## 📡 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/google` | POST | Google Sign-In |
| `/auth/apple` | POST | Apple Sign-In |
| `/auth/complete-profile` | POST | Complete OAuth profile |

## 🔄 Response Types

### Authenticated
```json
{
  "status": "authenticated",
  "accessToken": "...",
  "refreshToken": "...",
  "user": { "id": "...", "email": "..." }
}
```

### Additional Info Required
```json
{
  "status": "additional_info_required",
  "tempToken": "...",
  "requiredFields": ["email", "phoneNumber"],
  "providedData": { "firstName": "...", "lastName": "..." }
}
```

## 🔐 Security Checklist

- ✅ Token signature verified
- ✅ Issuer validated
- ✅ Expiration checked
- ✅ Audience validated
- ✅ Email verification enforced
- ✅ No long-term OAuth tokens stored

## 📱 Mobile Integration

### Google
```typescript
const { idToken } = await GoogleSignin.signIn();
await fetch('/auth/google', {
  method: 'POST',
  body: JSON.stringify({ idToken })
});
```

### Apple
```typescript
const credential = await AppleAuthentication.signInAsync({...});
await fetch('/auth/apple', {
  method: 'POST',
  body: JSON.stringify({
    identityToken: credential.identityToken,
    user: credential.fullName
  })
});
```

## 🗄️ Database

```sql
auth_providers (
  id, user_id, provider, provider_user_id,
  provider_email, provider_data, created_at
)
```

## 🔍 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid token" | Check client IDs match |
| "Table not found" | Run migration |
| "Email exists" | Expected - will link provider |
| "Token expired" | Get fresh token |

## 📚 Full Documentation

See: `backend/docs/OAUTH_IMPLEMENTATION.md`
