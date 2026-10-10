import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

import {Screen, Title, Card, SectionTitle, ListRow} from '../../components/ui';
import useAsyncData from '../../hooks/useAsyncData';
import {listActiveDates, listJournalEntries} from '../../../services/data/dataService';
import {computeStreak} from '../../utils/analytics';
import {todayISO} from '../../utils/dates';
import {AUTH_ENABLED} from '../../config/features';
import {colors, space} from '../../theme/theme';
import {ROUTES} from '../../navigation/routes';

const loadJourney = async () => {
  const [dates, entries] = await Promise.all([listActiveDates(), listJournalEntries()]);
  return {streak: computeStreak(dates, todayISO()), entries: entries.length, daysLogged: dates.length};
};

const Stat = ({value, label}) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const YouScreen = ({navigation}) => {
  const go = route => () => navigation.navigate(route);
  const {data: journey} = useAsyncData(loadJourney, null);

  const logout = async () => {
    const {auth, signOut} = require('../../../services/firebaseconfig');
    await signOut(auth);
  };

  return (
    <Screen tab>
      <Title subtitle="Personalize Cranium Conscious">You</Title>

      <Card>
        <Text style={styles.cardTitle}>Your journey</Text>
        <View style={styles.stats}>
          <Stat value={journey ? journey.streak : '-'} label="Day streak" />
          <Stat value={journey ? journey.entries : '-'} label="Journal entries" />
          <Stat value={journey ? journey.daysLogged : '-'} label="Days logged" />
        </View>
      </Card>

      <SectionTitle title="Personalize" />
      <ListRow title="Goals" subtitle="What you want to work toward" icon="flag-outline" onPress={go(ROUTES.goals)} />
      <ListRow title="My metrics" subtitle="Choose and create what you log" icon="chart-line" onPress={go(ROUTES.metrics)} />
      <ListRow title="Reminders" subtitle="Gentle nudges to check in" icon="bell-outline" onPress={go(ROUTES.reminders)} />

      <SectionTitle title="Privacy and data" />
      <ListRow title="Privacy" subtitle="Your data stays on this device" icon="shield-lock-outline" color={colors.teal} onPress={go(ROUTES.privacy)} />
      <ListRow title="Data management" subtitle="What is stored and sync status" icon="database-outline" color={colors.teal} onPress={go(ROUTES.data)} />

      <SectionTitle title="App" />
      <ListRow title="Settings" subtitle="Units and week start" icon="cog-outline" color={colors.blue} onPress={go(ROUTES.settings)} />
      <ListRow title="About" subtitle="Cranium Conscious" icon="information-outline" color={colors.blue} onPress={go(ROUTES.about)} />
      {AUTH_ENABLED ? (
        <ListRow title="Log out" icon="logout" color={colors.red} onPress={logout} />
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  cardTitle: {color: colors.text, fontSize: 17, fontWeight: '700'},
  stats: {flexDirection: 'row', marginTop: space.md},
  stat: {flex: 1, alignItems: 'center'},
  statValue: {color: colors.primary, fontSize: 26, fontWeight: '700'},
  statLabel: {color: colors.textMuted, fontSize: 12, marginTop: 2},
});

export default YouScreen;
