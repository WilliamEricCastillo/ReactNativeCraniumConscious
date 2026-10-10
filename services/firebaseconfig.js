import AsyncStorage from '@react-native-async-storage/async-storage';
import {initializeApp} from '@firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  initializeAuth,
} from '@firebase/auth';

import { getReactNativePersistence } from "firebase/auth";
import {getFirestore} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDlP_0E1QJYybCilxqeyPQrbQc9vtuefVY",
  authDomain: "cranium-conscious-33f4f.firebaseapp.com",
  projectId: "cranium-conscious-33f4f",
  storageBucket: "cranium-conscious-33f4f.appspot.com",
  messagingSenderId: "631323509014",
  appId: "1:631323509014:web:5f701d0dc83b5eaa779037"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firestore database
const db = getFirestore(app);

// Initialize Auth service
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Export initialized Firebase app, Firestore database, and Auth service
export {
  app,
  db,
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
};
