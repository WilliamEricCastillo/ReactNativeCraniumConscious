import React from 'react';
import {View, Text, StyleSheet, Alert} from 'react-native';

import {Screen, Title, Chip, Note, SectionTitle} from '../../components/ui';
import useAsyncData from '../../hooks/useAsyncData';
import {getPreferences, updatePreferences} from '../../../services/data/dataService';
import {colors, space} from '../../theme/theme';

const STORED = 'Saved on this device only.';

const Choices = ({options, value, onSelect}) => (
  <View style={styles.wrap}>
    {options.map(o => (
      <Chip key={o.value} label={o.label} selected={value === o.value} onPress={() => onSelect(o.value)} />
    ))}
  </View>
);

export const SettingsScreen = () => {
  const {data: prefs, reload} = useAsyncData(getPreferences, null);

  const save = async patch => {
    try {
      await updatePreferences(patch);
      await reload();
    } catch {
      Alert.alert('Could not save', 'Something went wrong saving on this device.');
    }
  };

  return (
    <Screen>
      <Title subtitle="Make the app yours">Settings</Title>

      <SectionTitle title="Water units" />
      <Choices
        options={[{label: 'Glasses', value: 'glasses'}, {label: 'Millilitres', value: 'ml'}, {label: 'Ounces', value: 'oz'}]}
        value={prefs?.units.water}
        onSelect={value => save({units: {water: value}})}
      />
      <Note>Water is logged in glasses (1 glass = 250 ml). This only changes how totals are shown.</Note>

      <SectionTitle title="Week starts on" />
      <Choices
        options={[{label: 'Monday', value: 'monday'}, {label: 'Sunday', value: 'sunday'}, {label: 'Saturday', value: 'saturday'}]}
        value={prefs?.weekStart}
        onSelect={value => save({weekStart: value})}
      />
      <Note>Used by the calendar and by weekly goals.</Note>

      <SectionTitle title="Appearance" />
      <Text style={styles.body}>Light theme. It is the only theme in this version.</Text>
      <Note>{STORED}</Note>
    </Screen>
  );
};

const styles = StyleSheet.create({
  wrap: {flexDirection: 'row', flexWrap: 'wrap'},
  body: {color: colors.textMuted, fontSize: 14, marginBottom: space.sm},
});
