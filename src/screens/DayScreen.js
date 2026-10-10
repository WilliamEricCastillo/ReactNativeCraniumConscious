import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert} from 'react-native';

import {Screen, Title, Card, Button, SectionTitle, EmptyState, Note} from '../components/ui';
import useDaySnapshot from '../hooks/useDaySnapshot';
import {deleteMetricEntry} from '../../services/data/dataService';
import {isValidISODate, formatLongDate, shiftISODate, todayISO} from '../utils/dates';
import {colors, moodOptions, space} from '../theme/theme';
import {ROUTES} from '../navigation/routes';

const EntryRow = ({text, onRemove}) => (
  <View style={styles.metricRow}>
    <Text style={[styles.body, {flex: 1}]}>{text}</Text>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Remove ${text}`} onPress={onRemove} hitSlop={8}>
      <Text style={styles.remove}>Remove</Text>
    </TouchableOpacity>
  </View>
);

const DayScreen = ({navigation, route}) => {
  const date = route.params?.date;
  const valid = isValidISODate(date);
  const isToday = valid && date === todayISO();
  const {snapshot, error, reload} = useDaySnapshot(valid ? date : todayISO());
  const entries = snapshot?.journalEntries ?? [];
  const checkIn = snapshot?.checkIn;

  const confirmRemove = (entry, text) =>
    Alert.alert('Remove this entry?', `${text} will be removed from this device.`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMetricEntry(entry.id);
            reload();
          } catch {
            Alert.alert('Error', 'Could not remove the entry on this device.');
          }
        },
      },
    ]);

  if (!valid) {
    return (
      <Screen>
        <EmptyState
          icon="calendar-remove-outline"
          title="Invalid date"
          message="That day could not be opened."
          actionLabel="Back to Today"
          onAction={() => navigation.navigate(ROUTES.tabs, {screen: ROUTES.today})}
        />
      </Screen>
    );
  }

  const go = days => navigation.setParams({date: shiftISODate(date, days)});
  const metricRows = [
    ['Mood', checkIn?.mood ?? null],
    ['Energy', checkIn?.energy ?? null],
    ['Stress', checkIn?.stress ?? null],
    ['Focus', checkIn?.focus ?? null],
    ['Sleep', snapshot?.sleepHours != null ? `${snapshot.sleepHours} h` : null],
    ['Exercise', snapshot?.exerciseMinutes != null ? `${snapshot.exerciseMinutes} min` : null],
    ['Water', snapshot?.waterGlasses != null ? `${snapshot.waterGlasses} glasses` : null],
  ];
  const meals = snapshot?.meals ?? [];
  const customEntries = snapshot?.customEntries ?? [];

  return (
    <Screen>
      <Title>{formatLongDate(date)}</Title>
      <View style={styles.nav}>
        <Button title="Previous day" variant="secondary" icon="chevron-left" onPress={() => go(-1)} style={{flex: 1}} />
        <View style={{width: space.sm}} />
        <Button
          title="Next day"
          variant="secondary"
          disabled={isToday || date > todayISO()}
          onPress={() => go(1)}
          style={{flex: 1}}
        />
      </View>

      <SectionTitle title="Journal" />
      {entries.length === 0 ? (
        <Card>
          <Text style={styles.muted}>No journal entries for this day.</Text>
        </Card>
      ) : (
        entries.map(entry => {
          const mood = moodOptions.find(m => m.value === entry.moodValue);
          return (
            <Card
              key={entry.id}
              onPress={() => navigation.navigate(ROUTES.journalEntry, {entryId: entry.id})}>
              <Text style={styles.time}>
                {mood ? `${mood.emoji}  ` : ''}
                {entry.time}
              </Text>
              <Text style={styles.body} numberOfLines={3}>
                {entry.journal}
              </Text>
            </Card>
          );
        })
      )}
      <Button
        title="Write an entry for this day"
        icon="pencil-plus"
        variant="secondary"
        disabled={date > todayISO()}
        onPress={() => navigation.navigate(ROUTES.journalNew, {date})}
      />

      <SectionTitle title="Daily metrics" />
      {error ? <Note>Could not read saved data on this device.</Note> : null}
      <Card>
        {metricRows.map(([label, value]) => (
          <View key={label} style={styles.metricRow}>
            <Text style={styles.muted}>{label}</Text>
            <Text style={styles.body}>{value ?? 'Not logged'}</Text>
          </View>
        ))}
      </Card>

      {meals.length > 0 ? (
        <>
          <SectionTitle title="Meals" />
          <Card>
            {meals.map(meal => {
              const text = `${meal.category ? `${meal.category[0].toUpperCase()}${meal.category.slice(1)}: ` : ''}${meal.label || 'Meal'}`;
              return <EntryRow key={meal.id} text={text} onRemove={() => confirmRemove(meal, text)} />;
            })}
          </Card>
        </>
      ) : null}

      {customEntries.length > 0 ? (
        <>
          <SectionTitle title="Other metrics" />
          <Card>
            {customEntries.map(entry => {
              const name = snapshot.customMetricNames[entry.metricId] || 'Custom metric';
              const text = `${name}: ${entry.value}${entry.unit && entry.unit !== 'count' ? ` ${entry.unit}` : ''}`;
              return <EntryRow key={entry.id} text={text} onRemove={() => confirmRemove(entry, text)} />;
            })}
          </Card>
        </>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  nav: {flexDirection: 'row', marginBottom: space.sm},
  muted: {color: colors.textMuted, fontSize: 14},
  body: {color: colors.text, fontSize: 15, lineHeight: 22},
  time: {color: colors.textMuted, fontSize: 14, marginBottom: space.xs},
  metricRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.xs},
  remove: {color: colors.red, fontSize: 14, fontWeight: '600', marginLeft: space.md},
});

export default DayScreen;
