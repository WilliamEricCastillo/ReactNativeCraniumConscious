import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

import {Screen, Title, Card, SectionTitle, SampleBadge, Note, ListRow, MiniBars, EmptyState} from '../../components/ui';
import {FACTORS, getMetricInfo, getSampleSeries, WEEK_LABELS} from '../../data/sample';
import {colors, space} from '../../theme/theme';
import {ROUTES} from '../../navigation/routes';

const CAUSATION =
  'These are associations, not proof of cause. Many things influence how you feel, and a pattern in your logs does not mean one thing causes another.';

const FactorRows = ({factors, navigation}) =>
  factors.map(f => (
    <ListRow
      key={f.id}
      title={f.title}
      subtitle={`Example: ${f.example}`}
      icon={f.icon}
      color={f.direction === 'positive' ? colors.green : colors.red}
      onPress={() => navigation.navigate(ROUTES.factor, {factorId: f.id})}
    />
  ));

export const MoodFactorsScreen = ({navigation}) => (
  <Screen>
    <Title subtitle="What tends to move with your mood">Mood factors</Title>
    <Note>{CAUSATION}</Note>

    <SectionTitle title="Often linked with a higher mood" />
    <FactorRows factors={FACTORS.filter(f => f.direction === 'positive')} navigation={navigation} />

    <SectionTitle title="Often linked with a lower mood" />
    <FactorRows factors={FACTORS.filter(f => f.direction === 'negative')} navigation={navigation} />

    <SectionTitle title="How a comparison could look" />
    <Card>
      <SampleBadge />
      <Text style={styles.cardTitle}>Mood on days with vs. without exercise</Text>
      <View style={styles.compare}>
        <View style={styles.compareCol}>
          <Text style={[styles.big, {color: colors.green}]}>4.2</Text>
          <Text style={styles.muted}>With exercise</Text>
        </View>
        <View style={styles.compareCol}>
          <Text style={[styles.big, {color: colors.textMuted}]}>3.5</Text>
          <Text style={styles.muted}>Without</Text>
        </View>
      </View>
      <Text style={styles.muted}>Made-up numbers that show the layout only.</Text>
    </Card>
  </Screen>
);

export const FactorDetailScreen = ({navigation, route}) => {
  const factor = FACTORS.find(f => f.id === route.params?.factorId);

  if (!factor) {
    return (
      <Screen>
        <EmptyState
          icon="help-circle-outline"
          title="Unknown factor"
          message="That factor does not exist."
          actionLabel="See all factors"
          onAction={() => navigation.replace(ROUTES.moodFactors)}
        />
      </Screen>
    );
  }

  const positive = factor.direction === 'positive';
  return (
    <Screen>
      <Title subtitle={positive ? 'Often linked with a higher mood' : 'Often linked with a lower mood'}>
        {factor.title}
      </Title>
      <Card accent={positive ? colors.green : colors.red}>
        <SampleBadge />
        <Text style={styles.cardTitle}>Example insight</Text>
        <Text style={styles.body}>{factor.example}. This is an illustration, not your data.</Text>
      </Card>
      <Note>{CAUSATION}</Note>
    </Screen>
  );
};

export const TrendDetailScreen = ({navigation, route}) => {
  const metricId = route.params?.metricId;
  const info = getMetricInfo(metricId);
  const series = getSampleSeries(metricId);

  if (!info || !series) {
    return (
      <Screen>
        <EmptyState
          icon="chart-line-variant"
          title="No trend available"
          message="There is no trend view for that metric yet."
          actionLabel="Back to Insights"
          onAction={() => navigation.navigate(ROUTES.tabs, {screen: ROUTES.insights})}
        />
      </Screen>
    );
  }

  const average = (series.reduce((a, b) => a + b, 0) / series.length).toFixed(1);
  return (
    <Screen>
      <Title subtitle={`Unit: ${info.unit}`}>{info.title} trend</Title>
      <Card>
        <SampleBadge />
        <MiniBars values={series} labels={WEEK_LABELS} color={info.color} height={160} />
        <Text style={[styles.muted, {marginTop: space.md}]}>Example average: {average}</Text>
      </Card>
      <Note>Example chart only. Your real trend will appear here once local logging and analytics are added.</Note>
    </Screen>
  );
};

const styles = StyleSheet.create({
  cardTitle: {color: colors.text, fontSize: 17, fontWeight: '700'},
  body: {color: colors.text, fontSize: 15, lineHeight: 22, marginTop: space.sm},
  muted: {color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: space.xs},
  compare: {flexDirection: 'row', marginVertical: space.md},
  compareCol: {flex: 1, alignItems: 'center'},
  big: {fontSize: 34, fontWeight: '700'},
});
