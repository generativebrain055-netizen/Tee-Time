# Configuration Files

This directory contains sensitive configuration files that should NOT be committed to version control.

## Directory Structure

```
config/
├── firebase/              # Firebase configuration files
│   ├── google-services.json          # Android Firebase config
│   └── GoogleService-Info.plist      # iOS Firebase config
│
└── keys/                  # Private keys and certificates
    └── AuthKey_*.p8       # Apple Sign In private key
```

## Important Notes

### Security
- ⚠️ **NEVER commit these files to version control**
- ⚠️ These files contain sensitive credentials
- ⚠️ Keep backups in a secure location
- ⚠️ Use different configs for development and production

### Firebase Files

**google-services.json** (Android)
- Downloaded from Firebase Console
- Contains Android OAuth client credentials
- Required for Google Sign-In on Android
- Copied to `TTSGolfApp/` during build

**GoogleService-Info.plist** (iOS)
- Downloaded from Firebase Console
- Contains iOS OAuth client credentials
- Required for Google Sign-In on iOS
- Copied to `TTSGolfApp/` during build

### Apple Sign In Keys

**AuthKey_*.p8**
- Downloaded from Apple Developer Portal
- Private key for Apple Sign In
- Used by backend for token verification
- Referenced in backend `.env` as `APPLE_PRIVATE_KEY_PATH`

## Setup Instructions

### 1. Firebase Configuration
See [docs/FIREBASE_CONFIGURATION.md](../docs/FIREBASE_CONFIGURATION.md) for detailed setup.

**Quick Steps:**
1. Create Firebase project
2. Add Android/iOS apps
3. Download config files
4. Place in `config/firebase/`

### 2. Apple Sign In Keys
See [docs/CONFIGURATION.md](../docs/CONFIGURATION.md) for detailed setup.

**Quick Steps:**
1. Create key in Apple Developer Portal
2. Download `.p8` file
3. Place in `config/keys/`
4. Update `APPLE_PRIVATE_KEY_PATH` in backend `.env`

## File Locations

### Source (Secure Storage)
```
config/
├── firebase/
│   ├── google-services.json
│   └── GoogleService-Info.plist
└── keys/
    └── AuthKey_XXXXXXXXXX.p8
```

### Build Time (Copied)
```
TTSGolfApp/
├── google-services.json          # Copied from config/firebase/
└── GoogleService-Info.plist      # Copied from config/firebase/

backend/
└── config/keys/
    └── AuthKey_XXXXXXXXXX.p8     # Symlinked or copied from config/keys/
```

## Git Ignore

These files are automatically ignored by `.gitignore`:
```gitignore
# Firebase configs
config/firebase/google-services.json
config/firebase/GoogleService-Info.plist

# Apple keys
config/keys/*.p8

# Build copies
TTSGolfApp/google-services.json
TTSGolfApp/GoogleService-Info.plist
```

## Backup Strategy

### Recommended Backup Locations
1. **Secure Cloud Storage** (encrypted)
   - Google Drive (encrypted folder)
   - 1Password / LastPass (secure notes)
   - AWS S3 (encrypted bucket)

2. **Local Secure Storage**
   - Encrypted USB drive
   - Password-protected archive

3. **Team Access**
   - Share via secure password manager
   - Use environment-specific configs

### What to Backup
- ✅ `google-services.json`
- ✅ `GoogleService-Info.plist`
- ✅ `AuthKey_*.p8`
- ✅ `.env` files (all environments)
- ✅ Keystore files (`.keystore`, `.jks`)

## Troubleshooting

### Firebase files not found
**Error**: `google-services.json not found`

**Solution**:
1. Check file exists in `config/firebase/`
2. Copy to `TTSGolfApp/` manually if needed
3. Rebuild the app

### Apple key not found
**Error**: `ENOENT: no such file or directory, open 'config/keys/AuthKey_*.p8'`

**Solution**:
1. Check file exists in `config/keys/`
2. Verify `APPLE_PRIVATE_KEY_PATH` in backend `.env`
3. Ensure path is relative to backend directory

### Permission denied
**Error**: `EACCES: permission denied`

**Solution**:
1. Check file permissions: `chmod 600 config/keys/*.p8`
2. Ensure files are readable by the application

## Best Practices

### Development
- Use separate Firebase projects for dev/staging/prod
- Use test Apple Sign In keys for development
- Never use production keys in development

### Production
- Store configs in secure environment variables
- Use CI/CD secrets management
- Rotate keys regularly
- Monitor key usage

### Team Collaboration
- Share configs via secure password manager
- Document which configs are for which environment
- Use `.env.example` files for structure
- Never share via email or chat

## Related Documentation

- [Firebase Configuration Guide](../docs/FIREBASE_CONFIGURATION.md)
- [Configuration Guide](../docs/CONFIGURATION.md)
- [Setup Guide](../docs/SETUP_GUIDE.md)
- [Quick Start](../docs/QUICK_START.md)

---

**Last Updated**: February 1, 2026
