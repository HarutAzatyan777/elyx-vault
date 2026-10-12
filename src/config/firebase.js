import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

/**
 * Firebase configuration using Vite environment variables (`import.meta.env.VITE_*`).
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    'https://elyx-vault-default-rtdb.firebaseio.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase Application
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
const auth = getAuth(app);

// Initialize Cloud Firestore
const db = getFirestore(app);

// Initialize Cloud Storage
let storage = null;
try {
  storage = getStorage(app);
} catch (err) {
  console.warn('[Firebase] Storage initialization warning:', err);
}

// Initialize Realtime Database
let rtdb = null;
try {
  rtdb = getDatabase(app);
} catch (err) {
  console.warn('[Firebase] Realtime Database initialization warning:', err);
}

export { app, auth, db, storage, rtdb };

