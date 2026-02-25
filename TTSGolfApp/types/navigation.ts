/**
 * Navigation Types
 * Shared navigation type definitions for the entire app
 */

/** All screen names in the app */
export type ScreenName =
  | "Splash"
  | "Welcome"
  | "Login"
  | "Onboarding"
  | "OAuthOnboarding"
  | "AvailabilityOnboarding"
  | "HomePage"
  | "Home"
  | "Roster"
  | "RosterProfile"
  | "Messages"
  | "ChatDetail"
  | "FullCalendar"
  | "Profile"
  | "EditProfile"
  | "QRCode"
  | "ScanQR"
  | "Settings"
  | "AccountSettings"
  | "CreateTeeTime"
  | "Invites"
  | "Availability"
  | "EditAvailability"
  | "Community"
  | "FriendProfile"
  | "GroupProfile"
  | "Notifications"
  | "TeeTimeDetail"
  | "TeeTimeHistory"
  | "CheckIn"
  | "SelectOnDeck"
  | "FindPlayers"
  | "UserProfile";

/** Minimal navigation prop used across screens */
export interface AppNavigation {
  navigate: (screen: ScreenName, params?: Record<string, unknown>) => void;
  replace: (screen: ScreenName, params?: Record<string, unknown>) => void;
  goBack: () => void;
}

/** Common screen props pattern */
export interface ScreenProps<P = undefined> {
  navigation: AppNavigation;
  route: P extends undefined
    ? { params?: Record<string, unknown> }
    : { params: P };
}
