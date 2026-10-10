import React, {useState} from 'react';
import {KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from '../../services/firebaseconfig';
import {Button, Field, Note, Title} from '../components/ui';
import BrainMark from '../components/BrainMark';
import {colors, space} from '../theme/theme';

const MIN_PASSWORD = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sign-in problems are described without revealing whether an account exists.
const messageFor = error => {
  switch (error?.code) {
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'The email or password is not correct.';
    case 'auth/email-already-in-use':
      return 'Could not create that account. Try signing in, or reset your password.';
    case 'auth/weak-password':
      return `Choose a password with at least ${MIN_PASSWORD} characters.`;
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'No connection. Check your internet and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    default:
      return 'Something went wrong. Please try again.';
  }
};

const MODES = {
  signIn: {title: 'Welcome back', action: 'Sign in'},
  signUp: {title: 'Create your account', action: 'Create account'},
  reset: {title: 'Reset your password', action: 'Send reset email'},
};

const LoginScreen = () => {
  const [mode, setMode] = useState('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const switchMode = next => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  const validate = () => {
    if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email address.';
    if (mode === 'reset') return null;
    if (mode === 'signUp') {
      if (password.length < MIN_PASSWORD) return `Choose a password with at least ${MIN_PASSWORD} characters.`;
      if (password !== confirm) return 'The passwords do not match.';
    } else if (!password) {
      return 'Enter your password.';
    }
    return null;
  };

  const submit = async () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const address = email.trim();
      if (mode === 'reset') {
        await sendPasswordResetEmail(auth, address).catch(e => {
          // Do not reveal whether the address has an account.
          if (e?.code !== 'auth/user-not-found') throw e;
        });
        setInfo('If an account exists for that email, a reset link is on its way.');
      } else if (mode === 'signUp') {
        const credential = await createUserWithEmailAndPassword(auth, address, password);
        await sendEmailVerification(credential.user).catch(() => {});
      } else {
        await signInWithEmailAndPassword(auth, address, password);
      }
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}>
            <BrainMark width={150} height={90} />
          </View>
          <Title subtitle="Your journal stays private to your account">{MODES[mode].title}</Title>

          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          {mode !== 'reset' ? (
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
              textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
            />
          ) : null}
          {mode === 'signUp' ? (
            <Field
              label="Confirm password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
            />
          ) : null}

          {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
          {info ? <Note>{info}</Note> : null}
          {mode === 'signUp' ? <Note>We will email you a link to verify your address. Cloud sync needs a verified email.</Note> : null}

          <Button title={busy ? 'Please wait...' : MODES[mode].action} onPress={submit} disabled={busy} />

          <View style={styles.links}>
            {mode !== 'signIn' ? <Link label="I already have an account" onPress={() => switchMode('signIn')} /> : null}
            {mode !== 'signUp' ? <Link label="Create an account" onPress={() => switchMode('signUp')} /> : null}
            {mode === 'signIn' ? <Link label="Forgot password?" onPress={() => switchMode('reset')} /> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const Link = ({label, onPress}) => (
  <TouchableOpacity onPress={onPress} accessibilityRole="button" style={styles.link}>
    <Text style={styles.linkText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.bg},
  content: {padding: space.lg, paddingBottom: space.xl * 2},
  logo: {alignItems: 'center', marginVertical: space.lg},
  error: {color: colors.red, fontSize: 14, marginBottom: space.md},
  links: {alignItems: 'center', marginTop: space.lg},
  link: {minHeight: 44, justifyContent: 'center'},
  linkText: {color: colors.primary, fontSize: 15, fontWeight: '600'},
});

export default LoginScreen;
