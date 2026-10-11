import React from 'react';
import {View, TouchableOpacity, StyleSheet, ImageBackground} from 'react-native';
import {NavigationContainer, DarkTheme} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {colors} from '../theme/theme';
import {ROUTES} from './routes';
import {todayISO} from '../utils/dates';

import TodayScreen from '../screens/main/TodayScreen';
import JournalScreen from '../screens/main/JournalScreen';
import InsightsScreen from '../screens/main/InsightsScreen';
import YouScreen from '../screens/main/YouScreen';
import AddScreen from '../screens/main/AddScreen';
import DayScreen from '../screens/DayScreen';
import {
  CheckInScreen,
  MoodLogScreen,
  EnergyLogScreen,
  StressLogScreen,
  FocusLogScreen,
  SleepLogScreen,
  ExerciseLogScreen,
  WaterLogScreen,
  MealLogScreen,
  CustomMetricLogScreen,
} from '../screens/log/LogScreens';
import {
  JournalNewScreen,
  JournalPromptsScreen,
  JournalNewPromptScreen,
  JournalEntryDetailScreen,
  JournalEditScreen,
} from '../screens/journal/JournalScreens';
import {MoodFactorsScreen, FactorDetailScreen, TrendDetailScreen} from '../screens/insights/InsightScreens';
import {
  GoalsScreen,
  MetricsScreen,
  MetricNewScreen,
  MetricDetailScreen,
  RemindersScreen,
  PrivacyScreen,
  DataScreen,
  AboutScreen,
} from '../screens/you/YouScreens';
import {SettingsScreen} from '../screens/you/SettingsScreens';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const appBackground = require('../assets/background04.png');

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: 'transparent',
    card: 'rgba(255,255,255,0.96)',
    text: colors.text,
    border: colors.border,
  },
};

const tabIcon = name => ({color, size}) => (
  <MaterialCommunityIcons name={name} color={color} size={size} />
);

// Raised purple button in the centre of the tab bar; opens the Add to Today screen.
const AddTabButton = ({onPress}) => (
  <View style={styles.addWrap}>
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="New Journal Entry"
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.addButton}>
      <LinearGradient
        colors={['#E63BBE', colors.primary, colors.blue]}
        start={{x: 0, y: 0.5}}
        end={{x: 1, y: 0.5}}
        style={StyleSheet.absoluteFillObject}
      />
      <MaterialCommunityIcons name="plus" size={30} color="#FFFFFF" />
    </TouchableOpacity>
  </View>
);

const NoScreen = () => null;

const Tabs = () => (
  <Tab.Navigator
    initialRouteName={ROUTES.today}
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarStyle: {backgroundColor: 'rgba(255,255,255,0.96)', borderTopColor: colors.border, height: 64},
      tabBarLabelStyle: {fontSize: 12, fontWeight: '600', marginBottom: 6},
      tabBarItemStyle: {paddingTop: 4},
    }}>
    <Tab.Screen name={ROUTES.today} component={TodayScreen} options={{title: 'Today', tabBarIcon: tabIcon('brain')}} />
    <Tab.Screen name={ROUTES.journal} component={JournalScreen} options={{title: 'Journal', tabBarIcon: tabIcon('notebook-outline')}} />
    <Tab.Screen
      name={ROUTES.addTab}
      component={NoScreen}
      options={{title: 'Add', tabBarLabel: () => null, tabBarButton: props => <AddTabButton onPress={props.onPress} />}}
      listeners={({navigation}) => ({
        tabPress: e => {
          e.preventDefault();
          navigation.navigate(ROUTES.journalNew, {date: todayISO()});
        },
      })}
    />
    <Tab.Screen name={ROUTES.insights} component={InsightsScreen} options={{title: 'Insights', tabBarIcon: tabIcon('chart-line')}} />
    <Tab.Screen name={ROUTES.you} component={YouScreen} options={{title: 'You', tabBarIcon: tabIcon('account-circle-outline')}} />
  </Tab.Navigator>
);

// [route name, component, header title]; dynamic screens take their params from route.params.
const DETAIL_SCREENS = [
  [ROUTES.add, AddScreen, 'Add to Today'],
  [ROUTES.checkIn, CheckInScreen, 'Check-in'],
  [ROUTES.mood, MoodLogScreen, 'Mood'],
  [ROUTES.energy, EnergyLogScreen, 'Energy'],
  [ROUTES.stress, StressLogScreen, 'Stress'],
  [ROUTES.focus, FocusLogScreen, 'Focus'],
  [ROUTES.sleep, SleepLogScreen, 'Sleep'],
  [ROUTES.exercise, ExerciseLogScreen, 'Exercise'],
  [ROUTES.water, WaterLogScreen, 'Water'],
  [ROUTES.meal, MealLogScreen, 'Meal'],
  [ROUTES.customMetric, CustomMetricLogScreen, 'Custom metric'],
  [ROUTES.journalNew, JournalNewScreen, 'New entry'],
  [ROUTES.journalPrompts, JournalPromptsScreen, 'Prompts'],
  [ROUTES.journalNewPrompt, JournalNewPromptScreen, 'Prompt entry'],
  [ROUTES.journalEntry, JournalEntryDetailScreen, 'Entry'],
  [ROUTES.journalEdit, JournalEditScreen, 'Edit entry'],
  [ROUTES.moodFactors, MoodFactorsScreen, 'Mood factors'],
  [ROUTES.factor, FactorDetailScreen, 'Factor'],
  [ROUTES.trend, TrendDetailScreen, 'Trend'],
  [ROUTES.goals, GoalsScreen, 'Goals'],
  [ROUTES.metrics, MetricsScreen, 'My metrics'],
  [ROUTES.metricNew, MetricNewScreen, 'New metric'],
  [ROUTES.metric, MetricDetailScreen, 'Metric'],
  [ROUTES.reminders, RemindersScreen, 'Reminders'],
  [ROUTES.privacy, PrivacyScreen, 'Privacy'],
  [ROUTES.data, DataScreen, 'Data management'],
  [ROUTES.settings, SettingsScreen, 'Settings'],
  [ROUTES.about, AboutScreen, 'About'],
  [ROUTES.day, DayScreen, 'Day'],
];

const AppNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground source={appBackground} resizeMode="cover" style={styles.appBackground}>
      <View pointerEvents="none" style={styles.backgroundVeil} />
    <NavigationContainer theme={navTheme}>
    <Stack.Navigator
      initialRouteName={ROUTES.tabs}
      screenOptions={{
        headerStyle: {backgroundColor: 'rgba(255,255,255,0.82)'},
        headerTintColor: colors.primaryDeep,
        headerTitleStyle: {fontWeight: '700', color: colors.text},
        headerShadowVisible: false,
        contentStyle: {backgroundColor: 'transparent'},
        statusBarStyle: 'dark',
        statusBarColor: colors.bg,
        navigationBarColor: '#FFF9FE',
      }}>
      <Stack.Screen name={ROUTES.tabs} component={Tabs} options={{headerShown: false}} />
      {DETAIL_SCREENS.map(([name, component, title]) => (
        <Stack.Screen
          key={name}
          name={name}
          component={component}
          options={{
            title,
            animation: name === ROUTES.add ? 'slide_from_bottom' : 'default',
            ...(name === ROUTES.journalEdit
              ? {
                  headerTransparent: true,
                  headerStyle: {backgroundColor: 'transparent'},
                  headerTintColor: '#8A45E8',
                  headerTitleStyle: {fontWeight: '700', color: '#151B3B'},
                  statusBarStyle: 'dark',
                  statusBarColor: colors.bg,
                }
              : {}),
          }}
        />
      ))}
    </Stack.Navigator>
  </NavigationContainer>
      <View pointerEvents="none" style={[styles.safeAreaCover, {height: insets.top}]} />
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  appBackground: {flex: 1},
  backgroundVeil: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.70)'},
  safeAreaCover: {position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.bg},
  addWrap: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
  },
});

export default AppNavigator;
