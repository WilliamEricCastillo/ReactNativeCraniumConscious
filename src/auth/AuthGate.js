import React, {useEffect, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {auth} from '../../services/firebaseconfig';
import {setActiveScope} from '../../services/data/localStore';
import LoginScreen from '../screens/LoginScreen';

const Stack = createNativeStackNavigator();

// Original Firebase login gate. Only loaded when AUTH_ENABLED is true (see src/config/features.js).
// It also isolates local data per account: the app tree is unmounted while the signed-in user changes,
// the local store is switched to that user's key space, and the tree is remounted fresh (keyed by uid), so
// one account can never see another account's data or leftover screen state.
const AuthGate = ({children}) => {
  const [session, setSession] = useState({ready: false, uid: null});

  useEffect(() => {
    let active = true;
    const unsubscribe = auth.onAuthStateChanged(async user => {
      setSession({ready: false, uid: null});
      let uid = user ? user.uid : null;
      try {
        await setActiveScope(uid);
      } catch {
        // Fail closed: show the login screen rather than any data.
        uid = null;
        await setActiveScope(null).catch(() => {});
      }
      if (active) setSession({ready: true, uid});
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (!session.ready) {
    return null;
  }

  if (session.uid) {
    return <React.Fragment key={session.uid}>{children}</React.Fragment>;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} options={{headerShown: false}} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AuthGate;
