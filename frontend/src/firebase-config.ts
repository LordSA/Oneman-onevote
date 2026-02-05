import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, signInAnonymously } from "firebase/auth";

// TODO: Replace with your Firebase config from Firebase Console
// Go to: Firebase Console > Your Project > Project Settings > Your Apps > Web > firebaseConfig

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate that all required config values are provided
const requiredKeys = ['apiKey', 'authDomain', 'projectId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

if (missingKeys.length > 0) {
  console.warn(`Missing Firebase config keys: ${missingKeys.join(', ')}. Please add them to your .env file.`);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const rtdb = getDatabase(app);
export const auth = getAuth(app);

// Sign in anonymously immediately
signInAnonymously(auth)
  .then(() => console.log("Web app authenticated anonymously!"))
  .catch((error) => console.error("Auth error:", error));
