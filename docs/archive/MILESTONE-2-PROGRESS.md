# Milestone 2: Mobile App Development Progress

This document tracks the implementation status of the TTS Golf mobile app features.

## Session Date: December 21, 2025

---

## ✅ Completed Features

### 1. Group Visibility Fix
- [x] Fixed issue where only group creator could see groups
- [x] Updated backend `rosterRepository.js` to return groups where user is owner OR member
- [x] Added `isOwner` field to distinguish ownership
- [x] Updated frontend to show "Member" badge for non-owners
- [x] Hide edit/delete buttons for non-owners in `GroupDetail.tsx`

**Files Modified:**
- `backend/repositories/rosterRepository.js`
- `backend/controllers/rosterController.js`
- `TTSGolfApp/services/api.ts`
- `TTSGolfApp/screens/roster/GroupsList.tsx`
- `TTSGolfApp/screens/roster/GroupDetail.tsx`

---

### 2. Login Screen Redesign
- [x] Clean white background design
- [x] Formatted phone input `(555) 123-4567`
- [x] Clear button for phone input
- [x] Focus and error states
- [x] Green "Next" button
- [x] 6-box OTP input design

**Files Modified:**
- `TTSGolfApp/screens/LoginScreen.tsx`

---

### 3. Signup Flow Updates
- [x] Updated `PhoneVerificationPage.tsx` to match login design
- [x] Hardcoded +1 country code (US only)
- [x] Removed country code modal
- [x] Updated `PreferencesPage.tsx` with dropdown selectors
- [x] Deleted unused `CountryCodeModal.tsx` and `countryCodes.ts`
- [x] Fixed `OnboardingScreen.tsx` validation to check all required fields

**Files Modified:**
- `TTSGolfApp/screens/LoginScreen.tsx`
- `TTSGolfApp/screens/onboarding/PhoneVerificationPage.tsx`
- `TTSGolfApp/screens/onboarding/PreferencesPage.tsx`
- `TTSGolfApp/screens/onboarding/OnboardingScreen.tsx`
- `TTSGolfApp/components/index.ts`
- `TTSGolfApp/constants/index.ts`
- `TTSGolfApp/types/index.ts`

**Files Deleted:**
- `TTSGolfApp/components/CountryCodeModal.tsx`
- `TTSGolfApp/constants/countryCodes.ts`

---

### 4. Manual Invite API Fix
- [x] Added "manual" to allowed invite types in backend route validation
- [x] Created `ExtendedFriend` interface with `phone` and `rosterId` properties
- [x] Fixed player ID handling for different user types:
  - Friends (valid user UUIDs) → use `userId`
  - On-deck/group members with `contact.userId` → use `userId`
  - On-deck/group members without `contact.userId` (non-app users) → use `phone` only
- [x] Added `onGroupMembersLoaded` callback to `ManualInviteStep`
- [x] Added `useRef` for immediate access to loaded players (avoids stale closure)
- [x] Fixed type signature for callback to include `phone` and `rosterId`
- [x] Added logging for debugging invite creation

**Files Modified:**
- `backend/routes/teeTimes.js`
- `backend/controllers/inviteController.js`
- `TTSGolfApp/screens/CreateTeeTime/index.tsx`
- `TTSGolfApp/screens/CreateTeeTime/ManualInviteStep.tsx`
- `TTSGolfApp/services/api.ts` (added "manual" to TeeTime inviteType)

---

### 5. Date Picker Calendar Fix
- [x] Changed calendar to US format (Sunday first)
- [x] Removed Monday-first conversion that caused day misalignment
- [x] Past dates are now grayed out and disabled
- [x] Added visual feedback for past dates with lighter text color
- [x] Users can now select any future date (not limited to one week)

**Files Modified:**
- `TTSGolfApp/screens/CreateTeeTime/DatePickerModal.tsx`

---

### 6. Full Calendar View Fix
- [x] Extended date range from 1 month to 4 months (1 month before, 3 months after)
- [x] Tee times now visible beyond one week in calendar view
- [x] Calendar reloads data when navigating between months

**Files Modified:**
- `TTSGolfApp/screens/FullCalendarScreen.tsx`

---

## 📋 Feature Checklist (From Requirements)

### Authentication & Onboarding
- [x] Phone number-based registration
- [x] Magic link authentication
- [x] Profile setup (handicap, memberships, phone number)
- [x] OTP verification with 6-digit code
- [x] Formatted phone input (US format)

### User Profile
- [x] Display: Social Rate, handicap, golf history
- [ ] QR code generation for "Get Drafted"
- [ ] QR scanner for "Scan to Draft"
- [ ] Remove/block users functionality

### Roster Management
- [x] Create and manage personal roster
- [x] Drag-and-drop ordering
- [x] "On Deck" section for backup players
- [x] View player profiles from roster
- [x] Group creation and management
- [x] Group visibility for members (not just owners)
- [ ] Sort by: Yes Rate, Distance to course, Handicap, Club Membership

### Invite Types
- [x] Roster Invite (sequential with response window)
- [x] First Come First Serve (FCFS)
- [x] Manual Invite (select specific players)
- [ ] Open Invite (community board)

### Send Invite Flow
- [x] Select date/time
- [x] Choose golf course (text input)
- [x] Set group size: Twosome, Threesome, or Foursome
- [x] Select invite type
- [x] Invite from roster/groups
- [x] Invite non-app users via phone number
- [ ] Golf course autocomplete with database

### My Golf Dashboard
- [x] Calendar view of upcoming tee times
- [x] Extended calendar range (3+ months)
- [ ] Quick access buttons (Notifications, Send Invite, Roster, Waiver Wire)

### My Tee Times
- [x] View created tee times
- [x] View tee times as participant
- [ ] In-progress invites view with status indicators
- [ ] Timer countdown for response windows

### Notifications System
- [ ] Inbox (received invites)
- [ ] Outbox (sent invite status)
- [ ] Community notifications
- [ ] Push notifications (Firebase)
- [ ] SMS notifications (Twilio)

### Waiver Wire
- [ ] Post week-of availability
- [ ] Time slots selection
- [ ] View posts from roster members

### Group Chat
- [ ] Auto-create SMS group chat when group fills
- [ ] Check-in functionality

---

## 🔧 Technical Improvements Made

### Performance
- [x] Using `FlashList` for all lists (not ScrollView with .map())
- [x] Components memoized with `React.memo()`
- [x] Callbacks using `useCallback`
- [x] Using `useRef` for immediate state access in async functions

### Code Quality
- [x] TypeScript interfaces for all data types
- [x] Proper error handling with detailed messages
- [x] Console logging for debugging
- [x] Clean separation of concerns

---

## 🐛 Bugs Fixed Today

1. **Group visibility** - Non-owners couldn't see groups they were members of
2. **Manual invite API error** - "manual" wasn't in allowed invite types
3. **Player ID handling** - Roster entry IDs were being sent as user IDs
4. **Group member selection** - Phone numbers weren't being passed for non-app users
5. **Stale state in async** - Used `useRef` to fix closure issues
6. **Calendar day alignment** - Monday-first format caused wrong day selection
7. **Calendar date range** - Only showed tee times for current month

---

## 📝 Notes

- Friends and Roster are the SAME thing - friends are automatically in roster
- Phone number uses hardcoded +1 (US only), no country code selector needed
- All tee time invites now support: roster, fcfs, manual, and open types
- Calendar fetches 4 months of data for smooth navigation

---

## 🚀 Next Steps

1. Implement Open Invite (community board)
2. Add golf course autocomplete with database
3. Implement notifications system
4. Add Waiver Wire feature
5. Implement group chat functionality
6. Add QR code features for profile
