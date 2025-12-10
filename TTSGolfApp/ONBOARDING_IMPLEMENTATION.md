# Onboarding Flow Implementation

## Overview

Complete 9-step onboarding experience for TeeTime Golf App with modern UX patterns, magic link authentication, and comprehensive user profile collection.

## Features Implemented

### 1. Welcome Page

- Full-screen branded welcome
- Compact logo (180x120)
- Clear value proposition
- Single CTA button with arrow icon

### 2. Phone Verification Page

- Country code selector with flags
- E.164 phone format validation
- Magic link sending with loading state
- **Waiting Screen**:
  - Email icon with success message
  - Displays sent phone number
  - Instructions box with emoji
  - Loading spinner while waiting
  - Resend button with 30s countdown
  - "Change phone number" option
- Auto-advance simulation (3s delay for demo)

### 3. Name Page

- First name and last name inputs
- Auto-capitalization
- Minimum 2 characters validation
- Clean, minimal design

### 4. Email Page (Optional)

- Email validation with regex
- Visual error indicators
- Skip option with secondary button
- Optional step messaging

### 5. Location Page

- Search interface with icon
- Mock autocomplete suggestions (Google Places ready)
- City/club/zip code support
- Selected location card with checkmark
- Clear button for search input
- Help text about nearby tee times
- **TODO**: Integrate Google Places Autocomplete API

### 6. Club Page (Optional)

- Club search with golf icon
- Mock club database (backend integration ready)
- Selected club card with type badge
- "I'm not a member" skip option
- Help text about home course priority

### 7. Handicap Page (Optional)

- Numeric input with decimal support
- Validation: -10 to 54 range
- Info card: "Don't have a handicap?"
- Range hints: Scratch (0), Average (15-20), Beginner (25+)
- Skip option

### 8. Preferences Page

- **Player Count**: 1-4 players with visual selector
- **Play Style**: Walk/Ride/Either with icons
- **Time of Day**: Multi-select chips
  - Early Morning (6-9am)
  - Morning (9am-12pm)
  - Afternoon (12-4pm)
  - Evening (4pm+)
  - Anytime
- ScrollView for smaller screens
- "Complete Setup" CTA

### 9. Onboarding Container

- Step management with state
- Animated transitions (slide left/right)
- Progress bar at top
- Data accumulation across steps
- Back navigation support
- Complete handler (backend integration ready)

## Files Created

```
constants/
  └── onboarding.js              # Step definitions, options, timing constants

screens/onboarding/
  ├── index.js                   # Barrel exports
  ├── OnboardingScreen.js        # Main container with step management
  ├── WelcomePage.js             # Step 1: Welcome
  ├── PhoneVerificationPage.js   # Step 2-3: Phone + Waiting screen
  ├── NamePage.js                # Step 4: First/Last name
  ├── EmailPage.js               # Step 5: Optional email
  ├── LocationPage.js            # Step 6: City/club/zip search
  ├── ClubPage.js                # Step 7: Optional home course
  ├── HandicapPage.js            # Step 8: Optional handicap
  └── PreferencesPage.js         # Step 9: Players/style/time
```

## Navigation Flow

```
SplashScreen
    ↓
WelcomeScreen
    ↓
OnboardingScreen (9 steps)
    ↓
HomePage
```

## Data Structure Collected

```javascript
{
  phoneNumber: "+13051234567",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",           // Optional
  location: {
    id: "1",
    name: "Miami, FL",
    description: "Florida, United States"
  },
  club: {                              // Optional
    id: "1",
    name: "Doral Golf Resort & Spa",
    location: "Miami, FL",
    type: "Resort"
  },
  handicap: 12.5,                      // Optional (null if skipped)
  preferences: {
    playerCount: 2,                    // 1-4
    playStyle: "walk",                 // walk/ride/either
    timeOfDay: ["morning", "anytime"]  // Array of selected times
  }
}
```

## Configuration Constants

### `ONBOARDING_STEPS`

- `WELCOME`
- `PHONE`
- `PHONE_WAITING`
- `NAME`
- `EMAIL`
- `LOCATION`
- `CLUB`
- `HANDICAP`
- `PREFERENCES`
- `COMPLETE`

### `TIME_OF_DAY_OPTIONS`

- `EARLY_MORNING`: "Early Morning (6-9am)"
- `MORNING`: "Morning (9am-12pm)"
- `AFTERNOON`: "Afternoon (12-4pm)"
- `EVENING`: "Evening (4pm+)"
- `ANYTIME`: "Anytime"

### `PLAYER_COUNT_OPTIONS`

- `ONE` through `FOUR`: 1-4

### `PLAY_STYLE_OPTIONS`

- `WALK`
- `RIDE`
- `EITHER`

### Magic Link Timing

- `MAGIC_LINK_RESEND_DELAY`: 30 seconds
- `MAGIC_LINK_EXPIRY`: 600 seconds (10 minutes)

## Integration TODOs

### Backend Integration

1. **Magic Link API** (`PhoneVerificationPage.js:42`)

   ```javascript
   // POST /api/onboarding/send-magic-link
   {
     phoneNumber: "+13051234567";
   }
   ```

2. **Magic Link Verification Listener** (`PhoneVerificationPage.js:51`)

   - Deep link handler for SMS magic links
   - Auto-advance when link is clicked

3. **Complete Onboarding API** (`OnboardingScreen.js:54`)
   ```javascript
   // POST /api/onboarding/complete
   { ...allUserData }
   ```

### Google Places Integration

1. Install package:

   ```bash
   npm install react-native-google-places-autocomplete
   ```

2. Update `LocationPage.js` (line 10-11):
   - Replace mock suggestions with Google Places API
   - Get API key from Google Cloud Console
   - Add lat/lng to location data

### Club Database Integration

1. Update `ClubPage.js` (line 19):
   - Replace mockClubs with backend API call
   - Add club details (address, phone, website, etc.)

## Design System Usage

All components use the shared theme system:

- **Colors**: `colors.primary` (#5EBC68), gradients, surfaces
- **Spacing**: Consistent `spacing.xl`, `spacing.md`, etc.
- **Typography**: `fontSize.xxl`, `fontWeight.bold`
- **Border Radius**: `borderRadius.lg` for inputs/cards
- **Components**: `PrimaryButton`, `SecondaryButton`, `TextInput`

## Testing the Flow

1. Start the app: Opens on Welcome screen
2. Tap "Create account": Navigates to Onboarding
3. Welcome page: Tap "Get Started"
4. Phone page: Enter phone, tap "Send Magic Link"
5. Waiting screen: Auto-advances after 3 seconds (demo mode)
6. Name page: Enter first/last name
7. Email page: Enter email or skip
8. Location page: Search and select location
9. Club page: Search club or skip
10. Handicap page: Enter handicap or skip
11. Preferences page: Select options, tap "Complete Setup"
12. Navigates to HomePage

## Notes

- All screens have back navigation (except Welcome)
- Progress bar shows completion percentage
- Animations use native driver for performance
- Optional fields clearly marked with skip buttons
- Data persists across back navigation
- Form validation provides clear error messages
- Keyboard dismisses on selection/submit

## Next Steps

1. Implement backend APIs for magic link and data submission
2. Integrate Google Places Autocomplete
3. Connect to club database API
4. Add deep link handling for magic links
5. Store onboarding data in AsyncStorage for recovery
6. Add analytics tracking for step completion
7. A/B test optional vs required fields
