# Additional Features to Add from TTSGolfApp_new

## 1. Google Sign-Up Flow Enhancement ✅
**Current State:** Google OAuth works but goes directly to home
**Target:** Add proper onboarding flow for OAuth users

### Changes Needed:
- Update OAuthButtons to handle sign-up vs sign-in
- Add OAuth onboarding flow for new users
- Collect missing profile information

## 2. Find Players Screen
**File:** `TTSGolfApp_new/screens/FindPlayersScreen.tsx`
**Purpose:** Search and discover other golfers

### Features:
- Search by name, location, handicap
- Filter by availability
- View player profiles
- Send friend requests

## 3. User Profile Screen (Public View)
**File:** `TTSGolfApp_new/screens/UserProfileScreen.tsx`
**Purpose:** View other users' public profiles

### Features:
- View user stats
- See availability
- View recent rounds
- Add as friend
- Send messages

## 4. Edit Availability Screen
**File:** `TTSGolfApp_new/screens/EditAvailabilityScreen.tsx`
**Purpose:** Edit weekly availability after onboarding

### Features:
- Update availability preferences
- Set time slots per day
- Save changes

## 5. Settings Screen
**File:** `TTSGolfApp_new/screens/SettingsScreen.tsx`
**Purpose:** App settings and preferences

### Features:
- Account settings
- Notification preferences
- Privacy settings
- About/Help
- Logout

## 6. Notification Settings Screen
**File:** `TTSGolfApp_new/screens/NotificationSettingsScreen.tsx`
**Purpose:** Manage notification preferences

### Features:
- Email notifications
- SMS notifications
- Push notifications
- Notification types

## 7. Help & Support Screen
**File:** `TTSGolfApp_new/screens/HelpSupportScreen.tsx`
**Purpose:** Help documentation and support

### Features:
- FAQ
- Contact support
- Terms of service
- Privacy policy

## 8. Create Group Screen
**File:** `TTSGolfApp_new/screens/CreateGroupScreen.tsx`
**Purpose:** Create new roster groups

### Features:
- Group name and description
- Add members
- Set group preferences

## Implementation Order

### Phase 1: Core Screens (Priority)
1. ✅ Settings Screen
2. ✅ Edit Availability Screen
3. ✅ Find Players Screen
4. ✅ User Profile Screen

### Phase 2: Enhanced Features
5. ✅ Notification Settings Screen
6. ✅ Help & Support Screen
7. ✅ Create Group Screen

### Phase 3: OAuth Flow Enhancement
8. ✅ Update OAuth sign-up flow
9. ✅ Add navigation to new screens

## Files to Copy

### Screens
- `screens/FindPlayersScreen.tsx`
- `screens/UserProfileScreen.tsx`
- `screens/EditAvailabilityScreen.tsx`
- `screens/SettingsScreen.tsx`
- `screens/NotificationSettingsScreen.tsx`
- `screens/HelpSupportScreen.tsx`
- `screens/CreateGroupScreen.tsx`

### Navigation Updates
- Update `App.tsx` to add new screen routes
- Update navigation types

### Backend (if needed)
- Check if any new API endpoints are needed
