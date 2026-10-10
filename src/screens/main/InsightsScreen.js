import React, {useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';

import {Screen, Title, Card, Chip, SectionTitle, MiniBars, Note, ListRow, EmptyState} from '../../components/ui';
import useRangeDays from '../../hooks/useRangeDays';
import {METRIC_INFO, TREND_METRICS} from '../../data/metrics';
import {RANGES, seriesFor, bucketize, summarize, trendOf, compareMoodByFactor, factorSentence, patternInsightsForDays} from '../../utils/analytics';
import {colors, space} from '../../theme/theme';
import {ROUTES} from '../../navigation/routes';

const TREND_TEXT = {up: 'Trending up', down: 'Trending down', flat: 'Steady'};

const InsightsScreen = ({navigation}) => {
  const [range, setRange] = useState('week');
  const {data, error, loaded} = useRangeDays(range);
  const current = data && data.rangeId === range ? data : null;
  const days = current?.days ?? [];

  const activeDays = days.filter(d => d.any).length;
  const entries = days.reduce((n, d) => n + d.journalCount, 0);
  const moodSummary = summarize(seriesFor(days, 'mood'));
  const factors = compareMoodByFactor(days);
  const hasPersonalizedEvidence = days.length >= 28;
  const ready = hasPersonalizedEvidence
    ? factors.filter(f => f.enough).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    : [];
  const key = ready.find(f => Math.abs(f.diff) >= 0.5);

  const trends = TREND_METRICS.map(id => {
    const points = seriesFor(days, id);
    return {id, info: METRIC_INFO[id], points, summary: summarize(points), trend: trendOf(points)};
  }).filter(t => t.summary);
  const patterns = patternInsightsForDays(days);

  return (
    <Screen tab>
      <Title subtitle="Patterns in your own logs">Insights</Title>

      <View style={styles.ranges}>
        {Object.entries(RANGES).map(([id, r]) => (
          <Chip key={id} label={r.label} selected={range === id} onPress={() => setRange(id)} />
        ))}
      </View>

      {error ? <Note>Could not read your saved data on this device. Nothing has been removed.</Note> : null}

      {loaded && current && activeDays === 0 ? (
        <EmptyState
          icon="chart-line"
          title="Nothing to show yet"
          message={`You have not logged anything in the last ${RANGES[range].days} days. Insights are calculated only from what you log.`}
          actionLabel="Start a check-in"
          onAction={() => navigation.navigate(ROUTES.checkIn)}
        />
      ) : null}

      {current && activeDays > 0 ? (
        <>
          <Card>
            <Text style={styles.cardTitle}>Last {RANGES[range].days} days</Text>
            <View style={styles.stats}>
              <Stat value={`${activeDays}`} label={`of ${RANGES[range].days} days logged`} />
              <Stat value={`${entries}`} label="journal entries" />
              <Stat value={moodSummary ? `${moodSummary.average}` : '-'} label="average mood" />
            </View>
          </Card>

          {days.length >= 28 ? (
            <>
              <SectionTitle title="Personalized patterns" />
              {patterns.length === 0 ? (
                <Note>
                  You have enough days logged to look for patterns, but your current records do not show a reliable relationship yet.
                </Note>
              ) : (
                patterns.slice(0, 2).map(pattern => (
                  <Card key={pattern.id} accent={colors.primary}>
                    <Text style={styles.cardTitle}>{pattern.title}</Text>
                    <Text style={[styles.muted, {marginTop: space.sm}]}>{pattern.observation}</Text>
                    <Text style={styles.muted}>Range: {pattern.rangeLabel}</Text>
                    <Text style={styles.muted}>Valid observations: {pattern.validObservations}</Text>
                    <Text style={styles.muted}>Comparison: {pattern.comparison}</Text>
                    <Text style={styles.muted}>Limit: {pattern.caution}</Text>
                  </Card>
                ))
              )}
            </>
          ) : (
            <Note>
              Personalized relationship insights appear after at least 28 days and enough matched data points.
            </Note>
          )}

          <SectionTitle
            title="What affects your mood"
            action="View all"
            onAction={() => navigation.navigate(ROUTES.moodFactors, {range})}
          />
          {ready.length === 0 ? (
            <Note>
              Factors appear once you have at least 28 days logged and at least 3 days with and 3 days without a factor in this range.
            </Note>
          ) : (
            ready.slice(0, 3).map(f => (
              <ListRow
                key={f.id}
                title={f.title}
                subtitle={`Mood ${f.withAvg} with vs ${f.withoutAvg} without`}
                icon={f.icon}
                color={f.diff >= 0 ? colors.green : colors.red}
                onPress={() => navigation.navigate(ROUTES.factor, {factorId: f.id, range})}
              />
            ))
          )}

          <SectionTitle title="Trends" />
          {trends.map(t => (
            <Card
              key={t.id}
              onPress={() => navigation.navigate(ROUTES.trend, {metricId: t.id, range})}
              accessibilityLabel={`${t.info.title} trend`}>
              <View style={styles.trendHead}>
                <MaterialCommunityIcons name={t.info.icon} size={20} color={t.info.color} />
                <Text style={styles.trendTitle}>{t.info.title}</Text>
                <Text style={styles.muted}>
                  avg {t.summary.average} · {t.summary.count} {t.summary.count === 1 ? 'day' : 'days'}
                </Text>
              </View>
              <MiniBars
                values={bucketize(t.points, range).map(b => b.value)}
                labels={bucketize(t.points, range).map(b => b.label)}
                color={t.info.color}
                height={56}
                max={t.info.max}
              />
              {t.trend ? <Text style={[styles.muted, {marginTop: space.sm}]}>{TREND_TEXT[t.trend]}</Text> : null}
            </Card>
          ))}

          {key ? (
            <>
              <SectionTitle title="Key insight" />
              <Card accent={colors.primary}>
                <Text style={styles.cardTitle}>
                  {key.diff > 0 ? 'Higher' : 'Lower'} mood with {key.title.toLowerCase()}
                </Text>
                <Text style={styles.muted}>{factorSentence(key)}</Text>
              </Card>
            </>
          ) : null}

          <Note>These are associations in your own logs, not proof that one thing causes another.</Note>
        </>
      ) : null}
    </Screen>
  );
};

const Stat = ({value, label}) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  ranges: {flexDirection: 'row', flexWrap: 'wrap'},
  cardTitle: {color: colors.text, fontSize: 17, fontWeight: '700'},
  muted: {color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: space.xs},
  stats: {flexDirection: 'row', marginTop: space.md},
  stat: {flex: 1, alignItems: 'center'},
  statValue: {color: colors.primary, fontSize: 26, fontWeight: '700'},
  statLabel: {color: colors.textMuted, fontSize: 12, marginTop: 2, textAlign: 'center'},
  trendHead: {flexDirection: 'row', alignItems: 'center', marginBottom: space.md},
  trendTitle: {color: colors.text, fontSize: 16, fontWeight: '600', flex: 1, marginLeft: space.sm},
});

export default InsightsScreen;
