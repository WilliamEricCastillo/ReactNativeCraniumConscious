import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {format} from 'date-fns';

import {Screen, Card, Button, SectionTitle, Chip, Note} from '../../components/ui';
import BrainMark from '../../components/BrainMark';
import useDaySnapshot from '../../hooks/useDaySnapshot';
import {greeting, todayISO, shiftISODate, formatWeekdayDate} from '../../utils/dates';
import {colors, metricColors, moodOptions, radius, space} from '../../theme/theme';
import {ROUTES} from '../../navigation/routes';

const MetricCard = ({icon, color, label, value, onPress}) => (
  <Card
    onPress={onPress}
    accessibilityLabel={`${label}: ${value}`}
    style={styles.metricCard}>
    <MaterialCommunityIcons name={icon} size={24} color={color} />
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </Card>
);

const CheckInTile = ({label, value, color, onPress}) => (
  <Card onPress={onPress} style={styles.tile} accessibilityLabel={`${label} ${value ?? 'not logged'}`}>
    <Text style={[styles.tileValue, {color}]}>{value ?? '-'}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </Card>
);

const TodayScreen = ({navigation}) => {
  const {snapshot, error} = useDaySnapshot(todayISO());
  const today = {
    mood: snapshot?.checkIn?.mood ?? null,
    energy: snapshot?.checkIn?.energy ?? null,
    stress: snapshot?.checkIn?.stress ?? null,
    focus: snapshot?.checkIn?.focus ?? null,
    sleepHours: snapshot?.sleepHours ?? null,
    exerciseMinutes: snapshot?.exerciseMinutes ?? null,
    waterGlasses: snapshot?.waterGlasses ?? 0,
    meals: snapshot?.meals ?? [],
  };
  const journalToday = snapshot?.journalEntries ?? [];
  const latestJournalMood = journalToday.length ? journalToday[journalToday.length - 1].moodValue : null;

  const moodValue = today.mood ?? latestJournalMood;
  const mood = moodOptions.find(m => m.value === moodValue);
  const pastDays = [1, 2, 3, 4, 5, 6].map(n => shiftISODate(todayISO(), -n));

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

      <Button
        title="Add to Today"
        icon="plus"
        onPress={() => navigation.navigate(ROUTES.add)}
        style={{marginBottom: space.sm}}
      />
      {error ? <Note>Could not read saved data on this device.</Note> : null}

      <SectionTitle title="Daily mood" />
      <Card
        onPress={() => navigation.navigate(ROUTES.mood)}
        accessibilityLabel="Daily mood summary">
        <View style={styles.moodRow}>
          <Text style={styles.moodEmoji}>{mood ? mood.emoji : '🧠'}</Text>
          <View style={{flex: 1}}>
            <Text style={styles.moodTitle}>{mood ? mood.label : 'No mood logged yet'}</Text>
            <Text style={styles.metricLabel}>
              {mood ? 'Tap to update your mood' : 'Tap to log how you feel'}
            </Text>
          </View>
        </View>
      </Card>

      <SectionTitle title="Check-in" action="Start" onAction={() => navigation.navigate(ROUTES.checkIn)} />
      <View style={styles.grid}>
        <CheckInTile label="Mood" value={today.mood} color={metricColors.mood} onPress={() => navigation.navigate(ROUTES.mood)} />
        <CheckInTile label="Energy" value={today.energy} color={metricColors.energy} onPress={() => navigation.navigate(ROUTES.energy)} />
        <CheckInTile label="Stress" value={today.stress} color={metricColors.stress} onPress={() => navigation.navigate(ROUTES.stress)} />
        <CheckInTile label="Focus" value={today.focus} color={metricColors.focus} onPress={() => navigation.navigate(ROUTES.focus)} />
      </View>

      <SectionTitle title="Today's metrics" />
      <View style={styles.grid2}>
        <MetricCard icon="water-outline" color={metricColors.water} label="Water"
          value={`${today.waterGlasses} glasses`} onPress={() => navigation.navigate(ROUTES.water)} />
        <MetricCard icon="sleep" color={metricColors.sleep} label="Sleep"
          value={today.sleepHours != null ? `${today.sleepHours} h` : 'Not logged'}
          onPress={() => navigation.navigate(ROUTES.sleep)} />
        <MetricCard icon="food-apple-outline" color={metricColors.meal} label="Meals"
          value={`${today.meals.length} logged`} onPress={() => navigation.navigate(ROUTES.meal)} />
        <MetricCard icon="run" color={metricColors.exercise} label="Exercise"
          value={today.exerciseMinutes != null ? `${today.exerciseMinutes} min` : 'Not logged'}
          onPress={() => navigation.navigate(ROUTES.exercise)} />
      </View>
      <Text style={styles.note}>Saved on this device only.</Text>

      <SectionTitle title="Past days" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {pastDays.map(d => (
          <Chip
            key={d}
            label={formatWeekdayDate(d)}
            onPress={() => navigation.navigate(ROUTES.day, {date: d})}
          />
        ))}
      </ScrollView>
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
  moodRow: {flexDirection: 'row', alignItems: 'center'},
  moodEmoji: {fontSize: 40, marginRight: space.lg},
  moodTitle: {color: colors.text, fontSize: 18, fontWeight: '700'},
  grid: {flexDirection: 'row', justifyContent: 'space-between'},
  tile: {flex: 1, marginHorizontal: 3, alignItems: 'center', paddingVertical: space.md, paddingHorizontal: 4},
  tileValue: {fontSize: 26, fontWeight: '700'},
  grid2: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'},
  metricCard: {width: '48.5%', minHeight: 104},
  metricValue: {color: colors.text, fontSize: 18, fontWeight: '700', marginTop: space.sm},
  metricLabel: {color: colors.textMuted, fontSize: 13, marginTop: 2},
  note: {color: colors.textMuted, fontSize: 12, marginBottom: space.sm},
});

export default TodayScreen;
