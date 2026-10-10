import React from 'react';
import {Text} from 'react-native';
import {act, render, waitFor} from '@testing-library/react-native';

let authListener;
let scopeSwitch;
const mockOnAuthStateChanged = jest.fn((auth, listener) => {
  authListener = listener;
  return jest.fn();
});
const mockSetActiveScope = jest.fn(() => Promise.resolve());

jest.mock('../../../services/firebaseconfig', () => ({
  auth: {},
  onAuthStateChanged: (...args) => mockOnAuthStateChanged(...args),
}));
jest.mock('../../../services/data/localStore', () => ({
  setActiveScope: (...args) => mockSetActiveScope(...args),
}));
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({children}) => children,
}));
jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({children}) => children,
    Screen: ({component: Component}) => <Component />,
  }),
}));
jest.mock('../../screens/LoginScreen', () => () =>
  require('react').createElement(require('react-native').Text, null, 'Login screen'),
);

const AuthGate = require('../AuthGate').default;
const {AUTH_ENABLED, CLOUD_SYNC_ENABLED, FIRESTORE_RULES_VERIFIED} = require('../../config/features');

beforeEach(() => {
  jest.clearAllMocks();
  scopeSwitch = null;
  mockSetActiveScope.mockImplementation(uid => (uid === 'account-b' && scopeSwitch ? scopeSwitch : Promise.resolve()));
});

test('auth is development-only while cloud sync and rules stay disabled', () => {
  expect(AUTH_ENABLED).toBe(__DEV__);
  expect(CLOUD_SYNC_ENABLED).toBe(false);
  expect(FIRESTORE_RULES_VERIFIED).toBe(false);
});

test('restores auth state, changes local scope before showing another account, and clears scope on sign-out', async () => {
  const screen = render(<AuthGate><Text>Account data</Text></AuthGate>);

  await act(async () => authListener({uid: 'account-a'}));
  expect(mockSetActiveScope).toHaveBeenLastCalledWith('account-a');
  expect(screen.getByText('Account data')).toBeTruthy();

  let releaseScope;
  scopeSwitch = new Promise(resolve => { releaseScope = resolve; });
  let switching;
  act(() => { switching = authListener({uid: 'account-b'}); });
  expect(screen.queryByText('Account data')).toBeNull();

  await act(async () => {
    releaseScope();
    await switching;
  });
  expect(mockSetActiveScope).toHaveBeenLastCalledWith('account-b');
  expect(screen.getByText('Account data')).toBeTruthy();

  await act(async () => authListener(null));
  expect(mockSetActiveScope).toHaveBeenLastCalledWith(null);
  await waitFor(() => expect(screen.getByText('Login screen')).toBeTruthy());
});