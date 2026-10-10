jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn()},
}));
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({name: 'test-app'})),
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
}));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  initializeAuth: jest.fn(() => ({currentUser: null})),
  getReactNativePersistence: jest.fn(storage => ({storage})),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  sendEmailVerification: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({getFirestore: jest.fn(() => ({}))}));

test('Firebase Auth uses AsyncStorage persistence for restoration after app restart', () => {
  const storage = require('@react-native-async-storage/async-storage').default;
  const {getReactNativePersistence, initializeAuth} = require('firebase/auth');
  const app = require('../firebaseconfig').app;

  expect(getReactNativePersistence).toHaveBeenCalledWith(storage);
  expect(initializeAuth).toHaveBeenCalledWith(app, {persistence: {storage}});
});