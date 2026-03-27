// src/firebase.js
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

// ✅ Load config from environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// ✅ Initialize Firebase app
export const app = initializeApp(firebaseConfig);

// ✅ Initialize storage
export const storage = getStorage(app);

// ✅ Initialize Firestore
// Uses long-polling in Electron dev to avoid IndexedDB errors
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, // fixes Electron dev errors
  merge: true, // keeps default Firestore behavior
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(), // multi-tab / multi-window sync
  }),
});

// ✅ Initialize and export Auth
export const auth = getAuth(app);