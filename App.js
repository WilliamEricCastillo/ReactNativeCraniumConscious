import 'react-native-gesture-handler';
import React, {useEffect, useState} from 'react';

import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';

import {auth} from './services/firebaseconfig';

import HomeScreen from './src/screens/HomeScreen';
import CalendarComponent from './src/screens/CalendarScreens/CalendarComponent';
import ChartScreen from './src/screens/ChartScreen';
import LoginScreen from './src/screens/LoginScreen';
import LogoutScreen from './src/screens/LogoutScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();


const CustomHeader = () => (
    <View style={styles.customHeader} />
);

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
    });
    return () => unsubscribe();
  }, []);


  return (
      <NavigationContainer>
        { isLoggedIn ? (
            <Tab.Navigator
                initialRouteName="Home"
                screenOptions={{
                  headerShown: false,
                  headerTitleAlign: 'left',
                  tabBarActiveTintColor: 'white',
                  tabBarActiveBackgroundColor: '#316FF6',
                  tabBarInactiveBackgroundColor: 'white',
                }}>
              <Tab.Screen
                  name="Home"
                  component={HomeScreen}
                  options={{
                    headerShown: true,
                    header: () => <CustomHeader/>,
                    tabBarLabel: 'Home',
                    tabBarIcon: ({color, size, focused}) => (
                        <MaterialCommunityIcons
                            name="home"
                            color={focused ? 'white' : 'black'}
                            size={size}
                        />
                    ),
                  }}
              />
              <Tab.Screen
                  name="Calendar"
                  component={CalendarComponent}
                  options={{
                    headerShown: true,
                    header: () => <CustomHeader />,
                    tabBarLabel: 'Calendar',
                    tabBarIcon: ({color, size, focused}) => (
                        <MaterialCommunityIcons
                            name="calendar-month-outline"
                            color={focused ? 'white' : 'black'}
                            size={size}
                        />
                    ),
                  }}
              />
              <Tab.Screen
                  name="Mood Tracker"
                  component={ChartScreen}
                  options={{
                    headerShown: true,
                    tabBarLabel: 'Graphs',
                    tabBarIcon: ({color, size, focused}) => (
                        <MaterialCommunityIcons
                            name="chart-line"
                            color={focused ? 'white' : 'black'}
                            size={size}
                        />
                    ),
                  }}
              />
              <Tab.Screen
                  name="Logout"
                  component={LogoutScreen}
                  options={{
                    headerShown: true,
                    header: () => <CustomHeader />,
                    tabBarLabel: 'Logout',
                    tabBarIcon: ({color, size, focused}) => (
                        <MaterialCommunityIcons
                            name="logout"
                            color={focused ? 'white' : 'black'}
                            size={size}
                        />
                    ),
                  }}
              />
            </Tab.Navigator>
        ):(
            <Stack.Navigator>
              <Stack.Screen
                  name="Login"
                  component={LoginScreen}
                  options={{
                    header: () => <CustomHeader />
                  }}
              />
            </Stack.Navigator>
        )}
      </NavigationContainer>
  );
};


const styles = StyleSheet.create({
  customHeader: {
    height: 50,
    backgroundColor: 'white',
  },
});

export default App;
