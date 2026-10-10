import AsyncStorage from '@react-native-async-storage/async-storage';
import {initializeApp, getApps, getApp} from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';

// Every Firebase import comes from the `firebase/*` entry points so app, auth and firestore share one
// module instance (mixing `@firebase/*` and `firebase/*` can create duplicate registries).
const firebaseConfig = {
  apiKey: "AIzaSyDlP_0E1QJYybCilxqeyPQrbQc9vtuefVY",
  authDomain: "cranium-conscious-33f4f.firebaseapp.com",
  projectId: "cranium-conscious-33f4f",
  storageBucket: "cranium-conscious-33f4f.appspot.com",
  messagingSenderId: "631323509014",
  appId: "1:631323509014:web:5f701d0dc83b5eaa779037"
};

// Initialize Firebase app (reuse it if Fast Refresh evaluates this module again)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore database
const db = getFirestore(app);

// Initialize Auth service; initializeAuth throws if it already ran for this app
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  if (error && error.code === 'auth/already-initialized') {
    auth = getAuth(app);
  } else {
    throw error;
  }
}

// Export initialized Firebase app, Firestore database, and Auth service
export {
  app,
  db,
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
};
