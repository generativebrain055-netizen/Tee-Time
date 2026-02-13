/**
 * Firebase Configuration
 * Initializes Firebase for authentication and other services
 * React Native: uses @firebase/auth (RN build) for initializeAuth + getReactNativePersistence
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { logger } from '../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Use @firebase/auth React Native build (has initializeAuth + getReactNativePersistence)
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  Auth,
} from '@firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Check if Firebase config is valid
const isFirebaseConfigValid = (): boolean => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
  );
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

// Initialize Firebase with error handling
try {
  if (isFirebaseConfigValid()) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    // Initialize Auth with AsyncStorage persistence (React Native)
    try {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch (authError: any) {
      // Auth might already be initialized, try to get it
      if (authError.code === 'auth/already-initialized') {
        auth = getAuth(app);
      } else {
        logger.error('Firebase Auth initialization error:', authError);
        // Fallback to getAuth if initializeAuth fails
        auth = getAuth(app);
      }
    }
  } else {
    logger.warn('Firebase configuration is incomplete. Firebase features will be disabled.');
    logger.warn('Missing environment variables:', {
      apiKey: !firebaseConfig.apiKey,
      authDomain: !firebaseConfig.authDomain,
      projectId: !firebaseConfig.projectId,
      storageBucket: !firebaseConfig.storageBucket,
      messagingSenderId: !firebaseConfig.messagingSenderId,
      appId: !firebaseConfig.appId,
    });
  }
} catch (error) {
  logger.error('Firebase initialization error:', error);
  // App will continue without Firebase, but OAuth features won't work
}

export { app, auth };
export default app;
