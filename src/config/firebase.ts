// Firebase configuration and initialization

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace with your Firebase project configuration
// Get this from Firebase Console -> Project Settings -> Your Apps
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Check if Firebase config is set
const isConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";

if (!isConfigured) {
  console.error(
    '⚠️ Firebase is not configured!\n\n' +
    'Please update src/config/firebase.ts with your Firebase project configuration.\n' +
    'Get it from: https://console.firebase.google.com/ -> Project Settings -> Your Apps\n\n' +
    'See TESTING.md for detailed setup instructions.'
  );
}

// Initialize Firebase (only if not already initialized and configured)
let app;
if (isConfigured) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
} else {
  app = null;
}

// Initialize Firebase services (will be undefined if not configured)
export const auth = app ? getAuth(app) : (undefined as any);
export const db = app ? getFirestore(app) : (undefined as any);

export default app;
