import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';

const mockAuth = {};
const mockSignIn = jest.fn();
const mockCreate = jest.fn();
const mockVerify = jest.fn(() => Promise.resolve());
const mockReset = jest.fn();

jest.mock('../../../services/firebaseconfig', () => ({
  auth: mockAuth,
  signInWithEmailAndPassword: (...a) => mockSignIn(...a),
  createUserWithEmailAndPassword: (...a) => mockCreate(...a),
  sendEmailVerification: (...a) => mockVerify(...a),
  sendPasswordResetEmail: (...a) => mockReset(...a),
}));
jest.mock('../../components/BrainMark', () => () => null);

const LoginScreen = require('../LoginScreen').default;

beforeEach(() => jest.clearAllMocks());

const fill = (utils, label, value) => fireEvent.changeText(utils.getByLabelText(label), value);

test('invalid input never reaches Firebase and explains the problem', () => {
  const utils = render(<LoginScreen />);
  fireEvent.press(utils.getByText('Sign in'));
  expect(utils.getByText('Enter a valid email address.')).toBeTruthy();
  fill(utils, 'Email', 'a@example.com');
  fireEvent.press(utils.getByText('Sign in'));
  expect(utils.getByText('Enter your password.')).toBeTruthy();
  expect(mockSignIn).not.toHaveBeenCalled();
});

test('a wrong password shows a message that does not reveal whether the account exists', async () => {
  mockSignIn.mockRejectedValueOnce({code: 'auth/user-not-found'});
  const utils = render(<LoginScreen />);
  fill(utils, 'Email', 'a@example.com');
  fill(utils, 'Password', 'secret123');
  fireEvent.press(utils.getByText('Sign in'));
  await waitFor(() => expect(utils.getByText('The email or password is not correct.')).toBeTruthy());
});

test('sign-up enforces password rules and sends a verification email', async () => {
  mockCreate.mockResolvedValueOnce({user: {uid: 'u1'}});
  const utils = render(<LoginScreen />);
  fireEvent.press(utils.getByText('Create an account'));
  fill(utils, 'Email', 'new@example.com');
  fill(utils, 'Password', 'short');
  fill(utils, 'Confirm password', 'short');
  fireEvent.press(utils.getByText('Create account'));
  expect(utils.getByText('Choose a password with at least 8 characters.')).toBeTruthy();

  fill(utils, 'Password', 'longenough1');
  fill(utils, 'Confirm password', 'different1');
  fireEvent.press(utils.getByText('Create account'));
  expect(utils.getByText('The passwords do not match.')).toBeTruthy();

  fill(utils, 'Confirm password', 'longenough1');
  fireEvent.press(utils.getByText('Create account'));
  await waitFor(() => expect(mockVerify).toHaveBeenCalledWith({uid: 'u1'}));
  expect(mockCreate).toHaveBeenCalledWith(mockAuth, 'new@example.com', 'longenough1');
});

test('password reset gives the same answer whether or not the account exists', async () => {
  mockReset.mockRejectedValueOnce({code: 'auth/user-not-found'});
  const utils = render(<LoginScreen />);
  fireEvent.press(utils.getByText('Forgot password?'));
  fill(utils, 'Email', 'nobody@example.com');
  fireEvent.press(utils.getByText('Send reset email'));
  await waitFor(() => expect(utils.getByText(/If an account exists/)).toBeTruthy());
});
