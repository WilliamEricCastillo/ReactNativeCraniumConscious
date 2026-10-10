import React, {useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';

import {Screen, Title, Card, Chip, SectionTitle, SampleBadge, MiniBars, Note, ListRow} from '../../components/ui';
import {METRIC_INFO, SAMPLE_SERIES, WEEK_LABELS, FACTORS} from '../../data/sample';
import {colors, space} from '../../theme/theme';
import {ROUTES} from '../../navigation/routes';

const RANGES = ['Week', 'Month', '3 Months', 'Year'];
const TREND_METRICS = ['mood', 'energy', 'exercise', 'sleep', 'stress'];

const InsightsScreen = ({navigation}) => {
  const [range, setRange] = useState('Week');

  return (
    <Screen tab>
      <Title subtitle="Patterns in your habits over time">Insights</Title>

      <View style={styles.ranges}>
        {RANGES.map(r => (
          <Chip key={r} label={r} selected={range === r} onPress={() => setRange(r)} />
        ))}
      </View>

      <Note>
        Insights will use your own logged data in a later phase. Everything below is example content
        for the {range.toLowerCase()} view.
      </Note>

      <Card>
        <SampleBadge />
        <Text style={styles.cardTitle}>Overall balance</Text>
        <Text style={styles.score}>72</Text>
        <View style={styles.track}>
          <View style={[styles.fill, {width: '72%'}]} />
        </View>
        <Text style={styles.muted}>A made-up score showing how this card will look.</Text>
      </Card>

      <SectionTitle title="Trends" />
      {TREND_METRICS.map(id => {
        const info = METRIC_INFO[id];
        return (
          <Card
            key={id}
            onPress={() => navigation.navigate(ROUTES.trend, {metricId: id})}
            accessibilityLabel={`${info.title} trend`}>
            <View style={styles.trendHead}>
              <MaterialCommunityIcons name={info.icon} size={20} color={info.color} />
              <Text style={styles.trendTitle}>{info.title}</Text>
              <SampleBadge text="EXAMPLE" />
            </View>
            <MiniBars values={SAMPLE_SERIES[id]} labels={WEEK_LABELS} color={info.color} height={56} />
          </Card>
        );
      })}

      <SectionTitle title="Key insight" />
      <Card accent={colors.primary}>
        <SampleBadge />
        <Text style={styles.cardTitle}>Example: movement and mood</Text>
        <Text style={styles.muted}>
          This is how a key insight could read, for instance "Your mood tends to be higher on days you
          log exercise." It is not based on your data.
        </Text>
      </Card>

      <SectionTitle
        title="What affects your mood"
        action="View all"
        onAction={() => navigation.navigate(ROUTES.moodFactors)}
      />
      {FACTORS.slice(0, 3).map(f => (
        <ListRow
          key={f.id}
          title={f.title}
          subtitle={`Example: ${f.example}`}
          icon={f.icon}
          color={f.direction === 'positive' ? colors.green : colors.red}
          onPress={() => navigation.navigate(ROUTES.factor, {factorId: f.id})}
        />
      ))}
    </Screen>
  );
};

const styles = StyleSheet.create({
  ranges: {flexDirection: 'row', flexWrap: 'wrap'},
  cardTitle: {color: colors.text, fontSize: 17, fontWeight: '700'},
  muted: {color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: space.sm},
  score: {color: colors.primary, fontSize: 44, fontWeight: '700', marginVertical: space.sm},
  track: {height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden'},
  fill: {height: 8, borderRadius: 4, backgroundColor: colors.primary},
  trendHead: {flexDirection: 'row', alignItems: 'center', marginBottom: space.md},
  trendTitle: {color: colors.text, fontSize: 16, fontWeight: '600', flex: 1, marginLeft: space.sm},
});

export default InsightsScreen;
