# TeeTime Social - Project Structure

## Overview
This document provides a comprehensive overview of the project structure and organization.

## Root Directory

```
TeeTimeApp/
├── backend/              # Node.js/Express backend server
├── TTSGolfApp/          # React Native mobile application
├── docs/                # Documentation files
├── .gitignore           # Git ignore rules
├── clubs.csv            # Golf course database (14,000+ courses)
├── CONFIGURATION.md     # Configuration guide
├── PROJECT_STRUCTURE.md # This file
├── README.md            # Main project documentation
└── start-app.bat        # Quick start script (Windows)
```

---

## Backend Structure

```
backend/
├── config/              # Configuration files
│   ├── database.js      # Database configuration
│   ├── index.js         # Config exports
│   ├── logger.js        # Winston logger setup
│   └── supabase.js      # Supabase client
│
├── controllers/         # Route controllers (thin layer)
│   ├── auth/           # Authentication controllers
│   │   ├── index.js            # Auth exports
│   │   ├── loginController.js  # Login/logout
│   │   ├── magicLinkController.js # Magic link auth
│   │   ├── oauthController.js  # Google/Apple OAuth
│   │   ├── otpController.js    # OTP verification
│   │   ├── profileController.js # User profile
│   │   ├── registerController.js # Registration
│   │   └── tokenController.js  # Token refresh
│   ├── attendanceController.js
│   ├── courseController.js
│   ├── draftController.js
│   ├── friendController.js
│   ├── index.js
│   ├── invite/         # Invite system controllers
│   │   ├── constants.js
│   │   ├── handlers/
│   │   │   ├── createHandlers.js
│   │   │   ├── queryHandlers.js
│   │   │   └── responseHandlers.js
│   │   ├── index.js
│   │   └── smsService.js
│   ├── notificationController.js
│   ├── rosterController.js
│   ├── socialRateController.js
│   └── teeTimeController.js
│
├── formatters/          # Response formatters
│   ├── index.js
│   ├── rosterFormatter.js
│   ├── teeTimeFormatter.js
│   └── userFormatter.js
│
├── logs/               # Application logs (gitignored)
│   ├── combined.log
│   ├── error.log
│   ├── exceptions.log
│   └── rejections.log
│
├── middleware/         # Express middleware
│   ├── analytics.js    # Request analytics
│   ├── auth.js         # JWT authentication
│   ├── errorHandler.js # Global error handler
│   ├── index.js
│   ├── rateLimiter.js  # Rate limiting
│   └── validator.js    # Request validation
│
├── repositories/       # Data access layer
│   ├── authProviderRepository.js
│   ├── courseRepository.js
│   ├── deviceRepository.js
│   ├── friendRepository.js
│   ├── index.js
│   ├── inviteRepository.js
│   ├── inviteResponseRepository.js
│   ├── magicLinkRepository.js
│   ├── otpRepository.js
│   ├── profileRepository.js
│   ├── rosterRepository.js
│   ├── sessionRepository.js
│   ├── teeTimeRepository.js
│   └── userRepository.js
│
├── routes/             # API route definitions
│   ├── attendance.js
│   ├── auth.js
│   ├── courses.js
│   ├── drafts.js
│   ├── friends.js
│   ├── index.js
│   ├── invites.js
│   ├── notifications.js
│   ├── rosters.js
│   ├── socialRates.js
│   └── teeTimes.js
│
├── schema/             # Database schema
│   ├── migrations/     # Database migrations
│   │   ├── 001_oauth_identity_fix.sql
│   │   ├── add_oauth_providers.sql
│   │   └── add_organizer_fill_warning.sql
│   └── unified_schema.sql # Complete database schema
│
├── scripts/            # Utility scripts
│   ├── tests/          # Test scripts
│   └── utilities/      # Utility scripts
│
├── services/           # Business logic layer
│   ├── attendanceService.js
│   ├── checkInReminderService.js
│   ├── clubsService.js
│   ├── draftService.js
│   ├── emailService.js
│   ├── fcfsDeadlineService.js
│   ├── index.js
│   ├── inviteManagementService.js
│   ├── notificationService.js
│   ├── oauthService.js
│   ├── rosterNotificationService.js
│   ├── rosterService.js
│   ├── schedulerService.js
│   ├── sessionService.js
│   ├── socialRateService.js
│   ├── teeTimeService.js
│   └── twilioService.js
│
├── utils/              # Utility functions
│   ├── crypto.js       # Encryption utilities
│   ├── dateUtils.js    # Date manipulation
│   ├── deviceFingerprint.js
│   ├── index.js
│   └── validation.js   # Validation helpers
│
├── views/              # HTML templates
│   └── oauth-success.html
│
├── .env                # Environment variables (gitignored)
├── .env.example        # Environment template
├── .gitignore
├── package.json
├── README.md
└── server.js           # Application entry point
```

---

## Mobile App Structure

```
TTSGolfApp/
├── assets/             # Static assets
│   ├── adaptive-icon.png
│   ├── AppIcon.png
│   ├── compact-logo.png
│   ├── favicon.png
│   ├── icon.png
│   ├── splash-icon.png
│   ├── striplogo.png
│   └── TEETIMElogo.png
│
├── components/         # Reusable components
│   ├── auth/          # Authentication components
│   │   ├── index.ts
│   │   └── OAuthButtons.tsx
│   ├── common/        # Common UI components
│   │   ├── Avatar.tsx
│   │   ├── BottomNav.tsx
│   │   ├── Header.tsx
│   │   └── index.ts
│   ├── notifications/ # Notification components
│   │   ├── index.ts
│   │   └── NotificationItem.tsx
│   ├── Button.tsx
│   ├── Container.tsx
│   ├── CountryPicker.tsx
│   ├── GolfCourseAutocomplete.tsx
│   ├── GoogleLogo.tsx
│   ├── index.ts
│   └── Input.tsx
│
├── config/            # App configuration
│   ├── api.ts         # API configuration
│   ├── firebase.ts    # Firebase setup
│   └── index.ts
│
├── constants/         # App constants
│   ├── colors.ts      # Color palette
│   ├── index.ts
│   └── onboarding.ts  # Onboarding flow
│
├── hooks/             # Custom React hooks
│   ├── index.ts
│   ├── useAnimations.ts
│   ├── useAuth.ts
│   └── useNotifications.ts
│
├── screens/           # App screens
│   ├── calendar/      # Calendar screen
│   ├── chat-detail/   # Chat detail screen
│   ├── CreateTeeTime/ # Tee time creation flow
│   ├── friend-profile/ # Friend profile screen
│   ├── Home/          # Home screen
│   ├── login/         # Login screen
│   ├── Messages/      # Messages screen
│   ├── notifications/ # Notifications screen
│   ├── onboarding/    # Onboarding flow
│   ├── profile/       # User profile screens
│   └── roster/        # Roster management screens
│
├── services/          # API services
│   ├── api/          # API client
│   │   ├── types/    # TypeScript types
│   │   ├── attendanceApi.ts
│   │   ├── core.ts
│   │   ├── courseApi.ts
│   │   ├── draftApi.ts
│   │   ├── friendApi.ts
│   │   ├── index.ts
│   │   ├── inviteApi.ts
│   │   ├── notificationApi.ts
│   │   ├── profileApi.ts
│   │   ├── rosterApi.ts
│   │   ├── socialRateApi.ts
│   │   └── teeTimeApi.ts
│   ├── index.ts
│   └── oauthService.ts
│
├── stores/            # State management (Zustand)
│   ├── authStore.ts
│   └── index.ts
│
├── theme/             # Design system
│   ├── colors.ts      # Color tokens
│   ├── index.ts
│   ├── metrics.ts     # Spacing/sizing
│   ├── styles.ts      # Common styles
│   └── tokens.ts      # Design tokens
│
├── types/             # TypeScript types
│   ├── index.ts
│   └── oauth.ts
│
├── utils/             # Utility functions
│   ├── deviceInfo.ts
│   ├── index.ts
│   └── sessionManager.ts
│
├── android/           # Android native code
│   └── app/
│       ├── build.gradle
│       └── teetimesocial-release.keystore
│
├── .env               # Environment variables (gitignored)
├── .env.example       # Environment template
├── .gitignore
├── app.json           # Expo configuration
├── App.tsx            # App entry point
├── babel.config.js
├── eas.json           # EAS Build configuration
├── global.css
├── google-services.json # Firebase Android config
├── GoogleService-Info.plist # Firebase iOS config
├── index.js
├── metro.config.js
├── package.json
├── README.md
├── tailwind.config.js
└── tsconfig.json
```

---

## Documentation Structure

```
docs/
├── API_REFERENCE.md      # Complete API documentation
├── AWS_DEPLOYMENT.md     # AWS deployment guide
├── ENVIRONMENT_SETUP.md  # Environment setup instructions
├── README.md             # Documentation index
└── SETUP_GUIDE.md        # Complete setup guide
```

---

## Key Files

### Configuration Files
- **backend/.env**: Backend environment variables
- **TTSGolfApp/.env**: Mobile app environment variables
- **backend/.env.example**: Backend configuration template
- **TTSGolfApp/.env.example**: Mobile app configuration template

### Build Files
- **backend/package.json**: Backend dependencies
- **TTSGolfApp/package.json**: Mobile app dependencies
- **TTSGolfApp/app.json**: Expo configuration
- **TTSGolfApp/eas.json**: EAS Build configuration

### Security Files (gitignored)
- **TTSGolfApp/google-services.json**: Firebase Android config
- **TTSGolfApp/GoogleService-Info.plist**: Firebase iOS config
- **TTSGolfApp/android/app/teetimesocial-release.keystore**: Android signing key
- **backend/config/keys/**: Apple Sign In private keys

### Database
- **backend/schema/unified_schema.sql**: Complete database schema
- **backend/schema/migrations/**: Database migration files
- **clubs.csv**: Golf course database (14,090 courses)

---

## Architecture Patterns

### Backend
- **Layered Architecture**: Controllers → Services → Repositories
- **Thin Controllers**: Minimal logic, delegate to services
- **Service Layer**: Business logic and orchestration
- **Repository Pattern**: Data access abstraction
- **Middleware**: Cross-cutting concerns (auth, logging, validation)

### Mobile App
- **Component-Based**: Reusable UI components
- **Screen-Based Navigation**: React Navigation
- **State Management**: Zustand for global state
- **Service Layer**: API abstraction
- **Design System**: Centralized theme and tokens

---

## Data Flow

### Authentication Flow
```
Mobile App → Firebase Auth → Backend Verification → JWT Token → Session
```

### API Request Flow
```
Mobile App → API Service → Backend Route → Controller → Service → Repository → Database
```

### OAuth Flow
```
Mobile App → OAuth Provider → Firebase → Backend → User Creation/Login → Session
```

---

## Environment-Specific Files

### Development
- Use `.env` files with local configuration
- Backend runs on `http://localhost:3000`
- Mobile app connects via local IP

### Production
- Use environment variables from hosting provider
- Backend runs on production domain
- Mobile app uses production API URL
- Use production keystores and certificates

---

## Security Considerations

### Gitignored Files
- All `.env` files
- Keystores and certificates
- Private keys
- Firebase configuration files (keep templates)
- Build outputs
- Logs

### Version Controlled
- `.env.example` templates
- Documentation
- Source code
- Schema files
- Configuration templates

---

## Build Outputs

### Backend
- No build step required (Node.js)
- Logs in `backend/logs/`

### Mobile App
- **Android APK**: `TTSGolfApp/android/app/build/outputs/apk/`
- **iOS IPA**: Built via EAS Build
- **Web**: `TTSGolfApp/web-build/`

---

## Testing

### Backend Tests
Located in `backend/scripts/tests/`

### Mobile App
- Component tests (if implemented)
- E2E tests (if implemented)

---

## Deployment

### Backend
- AWS EC2 / Elastic Beanstalk
- Environment variables via AWS Systems Manager
- See `docs/AWS_DEPLOYMENT.md`

### Mobile App
- **Android**: Google Play Store
- **iOS**: Apple App Store
- Build via EAS Build

---

For more information, see:
- [README.md](README.md) - Project overview
- [CONFIGURATION.md](CONFIGURATION.md) - Configuration guide
- [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) - Setup instructions
