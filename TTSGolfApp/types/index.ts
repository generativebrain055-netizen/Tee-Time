// Navigation Types
export interface NavigationProps {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
  replace: (screen: string, params?: Record<string, unknown>) => void;
  goBack?: () => void;
}

// User Types
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  phoneNumber: string;
  email?: string;
  handicap?: number;
  location?: Location;
  club?: Club;
  preferences?: UserPreferences;
}

export interface Location {
  id?: string;
  name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

export interface Club {
  id: string;
  name: string;
  location: string;
  type: "Public" | "Private" | "Semi-Private" | "Resort";
}

export interface UserPreferences {
  playStyle: "walk" | "ride" | "either";
  timeOfDay?: string[];
  preferredTimes?: string[];
  playingPartnerPreference?: string;
  drinkOfChoice?: string;
}

// Preferences Data Type for onboarding
export interface PreferencesData {
  preferredTimes?: string[];
  playStyle?: "walk" | "ride" | "either";
  playingPartnerPreference?: string; // golf vibe
  drinkOfChoice?: string;
}

// Onboarding Types
export interface OnboardingData {
  phoneNumber?: string;
  magicLinkVerified?: boolean;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
  picture?: string;
  zipCode?: string | null;
  profilePhotoBase64?: string | null;
  profilePhotoUri?: string;
  location?: Location;
  club?: Club | null;
  clubs?: Club[];  // New: array of all clubs
  handicap?: number | string | null;
  preferences?: PreferencesData | UserPreferences | null;
}

// Option Types
export interface SelectOption<T = string> {
  label: string;
  value: T;
}

export interface PlayStyleOption extends SelectOption<string> {
  icon: string;
  description: string;
}

// Component Props
export interface OnboardingPageProps {
  onNext: (data: Partial<OnboardingData>) => void;
  onBack: () => void;
}

export interface PhoneVerificationPageProps extends OnboardingPageProps {
  initialPhone?: string;
}

export interface NamePageProps extends OnboardingPageProps {
  initialData?: { firstName?: string; lastName?: string };
}

export interface EmailPageProps extends OnboardingPageProps {
  initialEmail?: string;
}

export interface ProfileImagePageProps extends OnboardingPageProps {
  initialData?: { picture?: string; avatar?: string; firstName?: string; lastName?: string };
}

export interface LocationPageProps extends OnboardingPageProps {
  initialLocation?: string;
}

export interface ClubPageProps extends OnboardingPageProps {
  initialClub?: string;
}

export interface HandicapPageProps extends OnboardingPageProps {
  initialHandicap?: string;
}

export interface PreferencesPageProps extends OnboardingPageProps {
  initialPreferences?: Partial<UserPreferences>;
  isSubmitting?: boolean;
  onSkip?: () => void;
}

export interface PhotoZipPageProps extends OnboardingPageProps {
  initialData?: { profilePhotoUri?: string; zipCode?: string };
  initialProfilePhotoUri?: string;
  initialZipCode?: string;
}

export interface ZipCodePageProps extends OnboardingPageProps {
  initialZipCode?: string;
}

export interface WelcomePageProps {
  onNext?: () => void;
  onBack?: () => void;
  onGetStarted?: () => void;
  onLogin?: () => void;
}

// Button Props
export interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: object;
}

// Re-export OAuth types
export * from "./oauth";
