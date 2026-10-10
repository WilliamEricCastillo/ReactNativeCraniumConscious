import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {format, parseISO} from 'date-fns';

import {Screen, Card, Button, SectionTitle, Note} from '../../components/ui';
import BrainMark from '../../components/BrainMark';
import useAsyncData from '../../hooks/useAsyncData';
import {
  getDaySnapshot,
  getPreferences,
  listCustomMetrics,
  listActiveDates,
} from '../../../services/data/dataService';
import {greeting, todayISO, shiftISODate} from '../../utils/dates';
import {formatWater, describeCustomEntries} from '../../utils/format';
import {colors, metricColors, moodOptions, radius, space} from '../../theme/theme';
import {ROUTES} from '../../navigation/routes';

const loadToday = async () => {
  const today = todayISO();
  const [snapshot, preferences, customMetrics, activeDates] = await Promise.all([
    getDaySnapshot(today),
    getPreferences(),
    listCustomMetrics(),
    listActiveDates({from: shiftISODate(today, -6), to: today}),
  ]);
  return {today, snapshot, preferences, customMetrics, activeDates};
};

const MetricCard = ({icon, color, label, value, onPress}) => (
  <Card onPress={onPress} accessibilityLabel={`${label}: ${value}`} style={styles.metricCard}>
    <MaterialCommunityIcons name={icon} size={24} color={color} />
    <Text style={styles.metricValue} numberOfLines={1}>
      {value}
    </Text>
    <Text style={styles.metricLabel} numberOfLines={1}>
      {label}
    </Text>
  </Card>
);

const CHECK_IN_FIELDS = [
  {key: 'energy', label: 'Energy', color: metricColors.energy},
  {key: 'stress', label: 'Stress', color: metricColors.stress},
  {key: 'focus', label: 'Focus', color: metricColors.focus},
];

const TodayScreen = ({navigation}) => {
  const {data, error} = useAsyncData(loadToday, null);
  const go = (route, params) => () => navigation.navigate(route, params);

  const snapshot = data?.snapshot;
  const tracked = data?.preferences.trackedMetricIds ?? [];
  const isTracked = id => tracked.includes(id);
  const mood = moodOptions.find(m => m.value === snapshot?.mood);
  const checkIn = snapshot?.checkIn;
  const loggedFields = CHECK_IN_FIELDS.filter(f => isTracked(f.key));
  const journalToday = snapshot?.journalEntries ?? [];
  const waterUnit = data?.preferences.units.water;

  const week = data
    ? [6, 5, 4, 3, 2, 1, 0].map(n => {
        const date = shiftISODate(data.today, -n);
        return {date, active: data.activeDates.includes(date), isToday: n === 0};
      })
    : [];

  const customEntries = metricId => (snapshot?.customEntries ?? []).filter(e => e.metricId === metricId);

  return (
    <Screen tab>
      <LinearGradient
        colors={['#1B1450', '#0F1330']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.hero}>
        <View style={{flex: 1}}>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>
          <Text style={styles.tagline}>How is your mind today?</Text>
        </View>
        <BrainMark width={150} height={90} />
      </LinearGradient>

      {error ? <Note>Could not read saved data on this device. Nothing has been removed.</Note> : null}

      <Card onPress={go(ROUTES.checkIn)} accessibilityLabel="Check-in">
        <View style={styles.checkRow}>
          <Text style={styles.moodEmoji}>{mood ? mood.emoji : '🧠'}</Text>
          <View style={{flex: 1}}>
            <Text style={styles.cardTitle}>{mood ? `Feeling ${mood.label.toLowerCase()}` : 'Check in'}</Text>
            <Text style={styles.metricLabel}>
              {mood
                ? snapshot.moodSource === 'journal'
                  ? 'Mood from your journal. Tap to check in.'
                  : 'Tap to update your check-in'
                : 'How do you feel right now? Takes 10 seconds.'}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
        </View>
        {loggedFields.length ? (
          <View style={styles.fieldRow}>
            {loggedFields.map(f => (
              <View key={f.key} style={styles.field}>
                <Text style={[styles.fieldValue, {color: f.color}]}>{checkIn?.[f.key] ?? '-'}</Text>
                <Text style={styles.metricLabel}>{f.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>

      <SectionTitle title="Log today" />
      <View style={styles.grid}>
        {isTracked('water') ? (
          <MetricCard
            icon="water-outline"
            color={metricColors.water}
            label="Water"
            value={formatWater(snapshot?.waterGlasses ?? 0, waterUnit)}
            onPress={go(ROUTES.water)}
          />
        ) : null}
        {isTracked('sleep') ? (
          <MetricCard
            icon="sleep"
            color={metricColors.sleep}
            label="Sleep"
            value={snapshot?.sleepHours != null ? `${snapshot.sleepHours} h` : 'Not logged'}
            onPress={go(ROUTES.sleep)}
          />
        ) : null}
        {isTracked('exercise') ? (
          <MetricCard
            icon="run"
            color={metricColors.exercise}
            label="Exercise"
            value={snapshot?.exerciseMinutes != null ? `${snapshot.exerciseMinutes} min` : 'Not logged'}
            onPress={go(ROUTES.exercise)}
          />
        ) : null}
        {isTracked('meal') ? (
          <MetricCard
            icon="food-apple-outline"
            color={metricColors.meal}
            label="Meals"
            value={`${snapshot?.meals.length ?? 0} logged`}
            onPress={go(ROUTES.meal)}
          />
        ) : null}
        {(data?.customMetrics ?? [])
          .filter(m => isTracked(m.id))
          .map(m => (
            <MetricCard
              key={m.id}
              icon="tune-variant"
              color={metricColors.custom}
              label={m.name}
              value={describeCustomEntries(m, customEntries(m.id))}
              onPress={go(ROUTES.customMetric, {metricId: m.id})}
            />
          ))}
      </View>
      <TouchableOpacity onPress={go(ROUTES.metrics)} accessibilityRole="button" style={styles.linkRow}>
        <Text style={styles.link}>Choose what appears here</Text>
      </TouchableOpacity>

      <SectionTitle title="Journal" />
      <Card
        onPress={journalToday.length ? go(ROUTES.journalEntry, {entryId: journalToday[journalToday.length - 1].id}) : undefined}
        accessibilityLabel="Today's journal">
        {journalToday.length ? (
          <>
            <Text style={styles.cardTitle}>
              {journalToday.length} {journalToday.length === 1 ? 'entry' : 'entries'} today
            </Text>
            <Text style={[styles.metricLabel, {marginTop: space.xs}]} numberOfLines={2}>
              {journalToday[journalToday.length - 1].journal}
            </Text>
          </>
        ) : (
          <Text style={styles.metricLabel}>Nothing written yet today.</Text>
        )}
      </Card>
      <View style={styles.journalActions}>
        <Button
          title="Write"
          icon="pencil-plus"
          onPress={go(ROUTES.journalNew, {date: todayISO()})}
          style={{flex: 1}}
        />
        <View style={{width: space.sm}} />
        <Button title="Use a prompt" variant="secondary" icon="lightbulb-on-outline" onPress={go(ROUTES.journalPrompts)} style={{flex: 1}} />
      </View>

      <SectionTitle
        title="This week"
        action="Calendar"
        onAction={() => navigation.navigate(ROUTES.tabs, {screen: ROUTES.journal, params: {view: 'calendar'}})}
      />
      <View style={styles.week}>
        {week.map(d => (
          <TouchableOpacity
            key={d.date}
            accessibilityRole="button"
            accessibilityLabel={`${format(parseISO(d.date), 'EEEE d MMMM')}${d.active ? ', has entries' : ''}`}
            onPress={() => navigation.navigate(ROUTES.day, {date: d.date})}
            style={[styles.weekDay, d.isToday && styles.weekDayToday]}>
            <Text style={styles.weekLetter}>{format(parseISO(d.date), 'EEEEE')}</Text>
            <Text style={styles.weekNumber}>{format(parseISO(d.date), 'd')}</Text>
            <View style={[styles.dot, d.active && styles.dotOn]} />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.note}>Saved on this device only.</Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    marginBottom: space.lg,
  },
  greeting: {color: colors.text, fontSize: 26, fontWeight: '700'},
  date: {color: colors.textMuted, fontSize: 15, marginTop: 2},
  tagline: {color: colors.primary, fontSize: 14, marginTop: space.md, fontWeight: '600'},
  checkRow: {flexDirection: 'row', alignItems: 'center'},
  moodEmoji: {fontSize: 40, marginRight: space.lg},
  cardTitle: {color: colors.text, fontSize: 18, fontWeight: '700'},
  fieldRow: {flexDirection: 'row', marginTop: space.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.md},
  field: {flex: 1, alignItems: 'center'},
  fieldValue: {fontSize: 24, fontWeight: '700'},
  grid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'},
  metricCard: {width: '48.5%', minHeight: 104},
  metricValue: {color: colors.text, fontSize: 18, fontWeight: '700', marginTop: space.sm},
  metricLabel: {color: colors.textMuted, fontSize: 13, marginTop: 2},
  linkRow: {alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center'},
  link: {color: colors.primary, fontSize: 14, fontWeight: '600'},
  journalActions: {flexDirection: 'row'},
  week: {flexDirection: 'row', justifyContent: 'space-between'},
  weekDay: {
    flex: 1,
    minHeight: 72,
    marginHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  weekDayToday: {borderColor: colors.primary, backgroundColor: colors.primarySoft},
  weekLetter: {color: colors.textMuted, fontSize: 12, fontWeight: '600'},
  weekNumber: {color: colors.text, fontSize: 17, fontWeight: '700', marginVertical: 2},
  dot: {width: 6, height: 6, borderRadius: 3, backgroundColor: 'transparent'},
  dotOn: {backgroundColor: colors.primary},
  note: {color: colors.textMuted, fontSize: 12, marginTop: space.md},
});

export default TodayScreen;
