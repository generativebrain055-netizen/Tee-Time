# TeeTime - Latest Changes

## Architecture Improvements (Production-Grade Cleanup)

### Date: Latest Session

This document describes the production-grade architecture improvements made to the TeeTime codebase.

---

## 🎨 Design System & Tokens

### New Files Created:

- **`TTSGolfApp/theme/tokens.ts`** - Centralized design tokens

The design token system provides a single source of truth for all UI styling:

```typescript
// Color Tokens
colorTokens.primary.main; // #5DB075
colorTokens.text.primary; // #1C1C1E
colorTokens.semantic.error; // #EF4444

// Spacing Tokens (8px grid)
spacingTokens.xs; // 4
spacingTokens.sm; // 8
spacingTokens.md; // 16

// Typography Tokens
typographyTokens.sizes.md; // 16
typographyTokens.weights.medium; // "500"

// Border Tokens
borderTokens.radius.md; // 12
borderTokens.width.sm; // 1

// Shadow Tokens
(shadowTokens.sm, shadowTokens.md, shadowTokens.lg);
```

---

## 📁 File Structure Improvements

### Mobile App (`TTSGolfApp/`)

```
TTSGolfApp/
├── components/
│   ├── auth/                    # NEW: Auth-related components
│   │   ├── index.ts             # Auth exports
│   │   └── OAuthButtons.tsx     # Production OAuth buttons
│   ├── common/                  # Shared UI components
│   └── index.ts                 # Updated root exports
├── config/
│   └── index.ts                 # NEW: Config exports
├── constants/
│   └── index.ts                 # Updated exports
├── hooks/
│   └── index.ts                 # Updated hook exports
├── services/
│   ├── oauthService.ts          # NEW: OAuth service layer
│   ├── api.ts                   # API service
│   └── index.ts                 # NEW: Service exports
├── stores/
│   └── index.ts                 # Updated store exports
├── theme/
│   ├── tokens.ts                # NEW: Design tokens
│   └── index.ts                 # Updated theme exports
├── types/
│   ├── oauth.ts                 # NEW: OAuth type definitions
│   └── index.ts                 # Updated type exports
└── utils/
    └── index.ts                 # NEW: Utility exports
```

### Backend (`backend/`)

```
backend/
├── config/
│   └── index.js                 # NEW: Config exports
├── controllers/
│   └── index.js                 # NEW: Controller exports
├── middleware/
│   └── index.js                 # NEW: Middleware exports
├── repositories/
│   └── index.js                 # NEW: Repository exports
├── routes/
│   └── index.js                 # NEW: Route exports
├── services/
│   └── index.js                 # NEW: Service exports
└── utils/
    └── index.js                 # NEW: Utility exports
```

---

## 🔐 OAuth Architecture

### Type System (`types/oauth.ts`)

```typescript
// Provider types
type OAuthProvider = "google" | "apple";

// Response structure
interface OAuthResponse {
  success: boolean;
  user?: OAuthUser;
  accessToken?: string;
  refreshToken?: string;
  isNewUser?: boolean;
  needsOnboarding?: boolean;
  missingFields?: OAuthMissingField[];
  message?: string;
  error?: string;
}

// Profile completion
interface ProfileCompletionPayload {
  firstName?: string;
  lastName?: string;
  location?: string;
  homeCourse?: string;
}
```

### Service Layer (`services/oauthService.ts`)

```typescript
// Custom error classes
class OAuthError extends Error { ... }
class NetworkError extends OAuthError { ... }

// Service functions
signInWithGoogle(idToken: string): Promise<OAuthResponse>
signInWithApple(credential: AppleCredential): Promise<OAuthResponse>
completeOAuthProfile(payload: ProfileCompletionPayload, accessToken: string): Promise<OAuthResponse>

// Helper functions
isUserCancellation(error: unknown): boolean
formatOAuthError(error: unknown): string
```

---

## ✨ Component Improvements

### OAuthButtons (`components/auth/OAuthButtons.tsx`)

- Uses design tokens for consistent styling
- Proper TypeScript types
- Error handling with user-friendly messages
- Loading states with visual feedback
- Accessible design

### OAuthOnboardingScreen (`screens/onboarding/OAuthOnboardingScreen.tsx`)

- Custom `useDebouncedSearch` hook for search optimization
- Design token-based styling
- Step-based navigation (name → location → club)
- Proper error handling and loading states

---

## 🛠 Import Patterns

### Before (Anti-pattern)

```typescript
import OAuthButtons from "../../components/OAuthButtons";
import { API_URL } from "../../config/api";
```

### After (Production Pattern)

```typescript
import { OAuthButtons } from "../../components";
import { API_URL } from "../../config";
```

---

## 📋 TypeScript Configuration

Updated `tsconfig.json`:

- Added `ignoreDeprecations: "6.0"` for baseUrl deprecation warning
- Path aliases configured for cleaner imports

---

## 🔄 Migration Notes

### Files Replaced:

1. `components/OAuthButtons.tsx` → `components/auth/OAuthButtons.tsx`
2. `screens/onboarding/OAuthOnboardingScreen.tsx` → Refactored in-place

### Import Updates Required:

- Any direct imports of `OAuthButtons` should use the new path
- All files using old `components/OAuthButtons` have been updated

---

## 🔄 Architecture Refactoring (Session 2)

### God File Elimination

Major files refactored to follow single-responsibility principle:

| File                      | Before    | After     | Reduction |
| ------------------------- | --------- | --------- | --------- |
| `teeTimeController.js`    | 472 lines | 252 lines | 47%       |
| `notifications/index.tsx` | 754 lines | 156 lines | 79%       |

### Backend - Controller/Service/Formatter Pattern

**New Structure:**

```
backend/
├── controllers/
│   └── teeTimeController.js  # Thin HTTP layer only
├── services/
│   └── teeTimeService.js     # Business logic
└── formatters/
    ├── teeTimeFormatter.js   # Response formatting
    ├── rosterFormatter.js
    └── index.js
```

**Key Changes:**

- Controllers only handle HTTP request/response
- Business logic moved to services with custom error classes
- Response formatting centralized in formatters
- Eliminated inline object mapping from controllers

### Frontend - API Service Split

Split monolithic `api.ts` (1263 lines) into domain-specific services:

**New Structure:**

```
TTSGolfApp/services/api/
├── core.ts           # Shared utilities (apiCall, getAuthHeaders)
├── types/            # Type definitions
│   ├── roster.ts
│   ├── teeTime.ts
│   └── index.ts
├── rosterApi.ts      # Roster operations
├── teeTimeApi.ts     # Tee time operations
├── inviteApi.ts      # Invite operations
├── friendApi.ts      # Friend operations
├── profileApi.ts     # Profile operations
├── courseApi.ts      # Course operations
├── notificationApi.ts
├── socialRateApi.ts
├── attendanceApi.ts
├── draftApi.ts
└── index.ts          # Re-exports all APIs & types
```

### Frontend - Notifications Screen Split

Split 754-line notifications screen into focused modules:

```
TTSGolfApp/screens/notifications/
├── index.tsx              # Main screen (156 lines)
├── NotificationItem.tsx   # Item component (235 lines)
├── useNotificationActions.ts  # Action handlers hook (221 lines)
└── styles.ts              # StyleSheet definitions (214 lines)
```

### NativeWind + Tailwind CSS Integration

Installed and configured NativeWind v4 for styling:

**New Files:**

- `tailwind.config.js` - Custom colors, spacing, typography
- `metro.config.js` - NativeWind bundler configuration
- `global.css` - Tailwind base styles
- `nativewind-env.d.ts` - TypeScript references

---

## ✅ Checklist for Production

- [x] Design tokens system
- [x] TypeScript type definitions
- [x] Service layer abstraction
- [x] Error handling with custom error classes
- [x] Index files for all major directories
- [x] Proper module exports
- [x] TypeScript configuration updated
- [x] No TypeScript errors
- [x] God files eliminated (<300 lines)
- [x] Controller/Service/Formatter pattern
- [x] Domain-specific API services
- [x] NativeWind styling integration

---

## Future Improvements

1. **Testing**: Add unit tests for OAuth service
2. **Storybook**: Component documentation
3. **CI/CD**: Automated testing pipeline
4. **Error Monitoring**: Sentry integration
5. **Analytics**: User flow tracking
6. **Zod Validation**: Add schema validation for API endpoints
7. **Migrate Remaining Screens**: Continue NativeWind adoption
