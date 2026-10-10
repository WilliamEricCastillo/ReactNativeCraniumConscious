import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

import {Screen, Title, Card, SectionTitle, SampleBadge, ListRow} from '../../components/ui';
import {AUTH_ENABLED} from '../../config/features';
import {colors, space} from '../../theme/theme';
import {ROUTES} from '../../navigation/routes';

const Stat = ({value, label}) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const YouScreen = ({navigation}) => {
  const go = route => () => navigation.navigate(route);

  const logout = async () => {
    const {auth, signOut} = require('../../../services/firebaseconfig');
    await signOut(auth);
  };

  return (
    <Screen tab>
      <Title subtitle="Personalize Cranium Conscious">You</Title>

      <Card>
        <SampleBadge text="PLACEHOLDER VALUES" />
        <Text style={styles.cardTitle}>Your journey</Text>
        <View style={styles.stats}>
          <Stat value="-" label="Day streak" />
          <Stat value="-" label="Entries" />
          <Stat value="-" label="Days logged" />
        </View>
      </Card>

      <SectionTitle title="Personalize" />
      <ListRow title="Goals" subtitle="What you want to work toward" icon="flag-outline" onPress={go(ROUTES.goals)} />
      <ListRow title="Tracked metrics" subtitle="Manage what you log" icon="chart-line" onPress={go(ROUTES.metrics)} />
      <ListRow title="Add custom metric" subtitle="Track something of your own" icon="plus-circle-outline" onPress={go(ROUTES.metricNew)} />
      <ListRow title="Reminders" subtitle="Gentle nudges to check in" icon="bell-outline" onPress={go(ROUTES.reminders)} />

      <SectionTitle title="Privacy and data" />
      <ListRow title="Privacy" subtitle="Your data stays on this device" icon="shield-lock-outline" color={colors.teal} onPress={go(ROUTES.privacy)} />
      <ListRow title="Data management" subtitle="Export and storage" icon="database-outline" color={colors.teal} onPress={go(ROUTES.data)} />

      <SectionTitle title="App" />
      <ListRow title="Settings" subtitle="Appearance, notifications, units" icon="cog-outline" color={colors.blue} onPress={go(ROUTES.settings)} />
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
