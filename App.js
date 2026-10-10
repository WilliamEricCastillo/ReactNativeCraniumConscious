import 'react-native-gesture-handler';
import React, {useEffect} from 'react';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {AUTH_ENABLED} from './src/config/features';
import AppNavigator from './src/navigation/AppNavigator';
import {startSyncScheduler} from './services/data/syncScheduler';
import {initNotifications, syncRemindersOnLaunch} from './services/notifications';
import {colors} from './src/theme/theme';

initNotifications();

const App = () => {
  // Registers nothing unless auth, cloud sync and verified rules are all enabled in src/config/features.js.
  useEffect(() => startSyncScheduler(), []);
  useEffect(() => {
    syncRemindersOnLaunch();
  }, []);

  const app = <AppNavigator />;

  // Firebase is only required when auth is turned on, so the prototype runs without any remote service.
  let content = app;
  if (AUTH_ENABLED) {
    const AuthGate = require('./src/auth/AuthGate').default;
    content = <AuthGate>{app}</AuthGate>;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={colors.bg} />
      {content}
    </SafeAreaProvider>
  );
};

export default App;
