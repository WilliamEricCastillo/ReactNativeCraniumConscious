import React from 'react';
import {View, Text, StyleSheet, Alert} from 'react-native';

import {Screen, Title, Card, Chip, ListRow, Note} from '../../components/ui';
import {SwitchRow} from './YouScreens';
import useAsyncData from '../../hooks/useAsyncData';
import {getPreferences, updatePreferences} from '../../../services/data/dataService';
import {colors, space} from '../../theme/theme';
import {ROUTES} from '../../navigation/routes';

const STORED = 'Saved on this device only.';

export const SettingsScreen = ({navigation}) => (
  <Screen>
    <Title subtitle="Make the app yours">Settings</Title>
    <ListRow title="Appearance" icon="palette-outline" color={colors.blue} onPress={() => navigation.navigate(ROUTES.appearance)} />
    <ListRow title="Notifications" icon="bell-outline" color={colors.blue} onPress={() => navigation.navigate(ROUTES.notifications)} />
    <ListRow title="Units" icon="ruler" color={colors.blue} onPress={() => navigation.navigate(ROUTES.units)} />
    <ListRow title="Week start" icon="calendar-week" color={colors.blue} onPress={() => navigation.navigate(ROUTES.weekStart)} />
  </Screen>
);

const usePreferences = () => useAsyncData(getPreferences, null);

const save = async patch => {
  try {
    await updatePreferences(patch);
  } catch {
    Alert.alert('Could not save', 'Something went wrong saving on this device.');
  }
};

const Choices = ({options, value, onSelect}) => (
  <View style={styles.wrap}>
    {options.map(o => (
      <Chip key={o.value} label={o.label} selected={value === o.value} onPress={() => onSelect(o.value)} />
    ))}
  </View>
);

export const AppearanceScreen = () => (
  <Screen>
    <Title subtitle="Dark-first by design">Appearance</Title>
    <Choices options={[{label: 'Dark', value: 'dark'}]} value="dark" onSelect={() => {}} />
    <Note>Dark is the only theme in this version. Other options may come later.</Note>
  </Screen>
);

export const NotificationsSettingsScreen = () => {
  const {data: prefs, reload} = usePreferences();
  const set = key => async value => {
    await save({notifications: {[key]: value}});
    reload();
  };
  return (
    <Screen>
      <Title subtitle="Choose what can notify you">Notifications</Title>
      <Card>
        <SwitchRow title="Daily reminders" value={!!prefs?.notifications.dailyReminders} onValueChange={set('dailyReminders')} />
        <SwitchRow title="Weekly insight summary" value={!!prefs?.notifications.weeklySummary} onValueChange={set('weeklySummary')} />
      </Card>
      <Note>Your choices are stored, but no notifications are scheduled yet.</Note>
    </Screen>
  );
};

export const UnitsScreen = () => {
  const {data: prefs, reload} = usePreferences();
  const set = key => async value => {
    await save({units: {[key]: value}});
    reload();
  };
  return (
    <Screen>
      <Title subtitle="How measurements are shown">Units</Title>
      <Text style={styles.label}>Water</Text>
      <Choices
        options={[{label: 'Glasses', value: 'glasses'}, {label: 'Millilitres', value: 'ml'}, {label: 'Ounces', value: 'oz'}]}
        value={prefs?.units.water}
        onSelect={set('water')}
      />
      <Text style={styles.label}>Distance</Text>
      <Choices
        options={[{label: 'Kilometres', value: 'km'}, {label: 'Miles', value: 'mi'}]}
        value={prefs?.units.distance}
        onSelect={set('distance')}
      />
      <Note>{STORED}</Note>
    </Screen>
  );
};

export const WeekStartScreen = () => {
  const {data: prefs, reload} = usePreferences();
  return (
    <Screen>
      <Title subtitle="Which day your week begins">Week start</Title>
      <Choices
        options={[{label: 'Sunday', value: 'sunday'}, {label: 'Monday', value: 'monday'}, {label: 'Saturday', value: 'saturday'}]}
        value={prefs?.weekStart}
        onSelect={async value => {
          await save({weekStart: value});
          reload();
        }}
      />
      <Note>{STORED}</Note>
    </Screen>
  );
};

const styles = StyleSheet.create({
  wrap: {flexDirection: 'row', flexWrap: 'wrap'},
  label: {color: colors.textMuted, fontSize: 14, fontWeight: '600', marginTop: space.md, marginBottom: space.sm},
});
