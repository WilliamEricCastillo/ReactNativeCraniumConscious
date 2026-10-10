import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

import {Screen, Title, Card, SectionTitle, Note, ListRow, MiniBars, EmptyState} from '../../components/ui';
import useRangeDays from '../../hooks/useRangeDays';
import {getMetricInfo} from '../../data/metrics';
import {
  RANGES,
  seriesFor,
  bucketize,
  summarize,
  trendOf,
  compareMoodByFactor,
  factorSentence,
  MIN_DAYS_PER_GROUP,
} from '../../utils/analytics';
import {formatWeekdayDate} from '../../utils/dates';
import {colors, space} from '../../theme/theme';
import {ROUTES} from '../../navigation/routes';

const CAUSATION =
  'These are associations in your own logs, not proof of cause. Many things influence how you feel, and a pattern does not mean one thing causes another.';
const TREND_TEXT = {up: 'Trending up over this range', down: 'Trending down over this range', flat: 'Steady over this range'};

const rangeOf = route => (RANGES[route.params?.range] ? route.params.range : 'week');

const FactorRows = ({factors, navigation, range}) =>
  factors.map(f => (
    <ListRow
      key={f.id}
      title={f.title}
      subtitle={`Mood ${f.withAvg} with vs ${f.withoutAvg} without`}
      icon={f.icon}
      color={f.diff >= 0 ? colors.green : colors.red}
      onPress={() => navigation.navigate(ROUTES.factor, {factorId: f.id, range})}
    />
  ));

export const MoodFactorsScreen = ({navigation, route}) => {
  const range = rangeOf(route);
  const {data, error} = useRangeDays(range);
  const factors = data ? compareMoodByFactor(data.days) : [];
  const ready = factors.filter(f => f.enough);
  const higher = ready.filter(f => f.diff > 0);
  const lower = ready.filter(f => f.diff < 0);
  const waiting = factors.filter(f => !f.enough);

  return (
    <Screen>
      <Title subtitle={`What tends to move with your mood, last ${RANGES[range].days} days`}>Mood factors</Title>
      <Note>{CAUSATION}</Note>
      {error ? <Note>Could not read your saved data on this device.</Note> : null}

      {data && ready.length === 0 ? (
        <EmptyState
          icon="chart-bubble"
          title="Not enough data yet"
          message={`A factor needs a mood and at least ${MIN_DAYS_PER_GROUP} days with it and ${MIN_DAYS_PER_GROUP} days without it. Keep logging, or try a longer range.`}
        />
      ) : null}

      {higher.length ? <SectionTitle title="Higher mood on these days" /> : null}
      <FactorRows factors={higher} navigation={navigation} range={range} />
      {lower.length ? <SectionTitle title="Lower mood on these days" /> : null}
      <FactorRows factors={lower} navigation={navigation} range={range} />

      {ready.length && waiting.length ? (
        <Note>Not enough data yet for: {waiting.map(f => f.title.toLowerCase()).join(', ')}.</Note>
      ) : null}
    </Screen>
  );
};

export const FactorDetailScreen = ({navigation, route}) => {
  const range = rangeOf(route);
  const {data} = useRangeDays(range);
  const factor = data ? compareMoodByFactor(data.days).find(f => f.id === route.params?.factorId) : null;

  if (data && !factor) {
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
  if (!factor) return <Screen><Note>Loading...</Note></Screen>;

  return (
    <Screen>
      <Title subtitle={`Last ${RANGES[range].days} days`}>{factor.title}</Title>
      {factor.enough ? (
        <Card accent={factor.diff >= 0 ? colors.green : colors.red}>
          <View style={styles.compare}>
            <View style={styles.compareCol}>
              <Text style={[styles.big, {color: colors.text}]}>{factor.withAvg}</Text>
              <Text style={styles.muted}>{factor.withLabel}</Text>
              <Text style={styles.muted}>{factor.withCount} days</Text>
            </View>
            <View style={styles.compareCol}>
              <Text style={[styles.big, {color: colors.textMuted}]}>{factor.withoutAvg}</Text>
              <Text style={styles.muted}>{factor.withoutLabel}</Text>
              <Text style={styles.muted}>{factor.withoutCount} days</Text>
            </View>
          </View>
          <Text style={styles.body}>{factorSentence(factor)}</Text>
        </Card>
      ) : (
        <EmptyState
          icon="chart-bubble"
          title="Not enough data yet"
          message={`You have ${factor.withCount} days with "${factor.withLabel}" and ${factor.withoutCount} days with "${factor.withoutLabel}" that also have a mood. At least ${MIN_DAYS_PER_GROUP} of each are needed.`}
        />
      )}
      <Note>{CAUSATION}</Note>
    </Screen>
  );
};

export const TrendDetailScreen = ({navigation, route}) => {
  const range = rangeOf(route);
  const metricId = route.params?.metricId;
  const info = getMetricInfo(metricId);
  const {data} = useRangeDays(range);

  if (!info || metricId === 'meal') {
    return (
      <Screen>
        <EmptyState
          icon="chart-line-variant"
          title="No trend available"
          message="There is no trend view for that metric."
          actionLabel="Back to Insights"
          onAction={() => navigation.navigate(ROUTES.tabs, {screen: ROUTES.insights})}
        />
      </Screen>
    );
  }
  if (!data) return <Screen><Note>Loading...</Note></Screen>;

  const points = seriesFor(data.days, metricId);
  const summary = summarize(points);
  const trend = trendOf(points);
  const buckets = bucketize(points, range);
  const logged = points.filter(p => p.value != null).reverse();

  return (
    <Screen>
      <Title subtitle={`Unit: ${info.unit}, last ${RANGES[range].days} days`}>{info.title} trend</Title>
      {summary ? (
        <>
          <Card>
            <MiniBars values={buckets.map(b => b.value)} labels={buckets.map(b => b.label)} color={info.color} height={140} max={info.max} />
            <Text style={[styles.muted, {marginTop: space.md}]}>
              {range === 'week' ? 'Each bar is one day.' : 'Each bar is the average of the days it covers; grey means nothing logged.'}
            </Text>
          </Card>
          <Card>
            <View style={styles.compare}>
              <View style={styles.compareCol}>
                <Text style={styles.big}>{summary.average}</Text>
                <Text style={styles.muted}>average</Text>
              </View>
              <View style={styles.compareCol}>
                <Text style={styles.big}>{summary.min}</Text>
                <Text style={styles.muted}>lowest</Text>
              </View>
              <View style={styles.compareCol}>
                <Text style={styles.big}>{summary.max}</Text>
                <Text style={styles.muted}>highest</Text>
              </View>
            </View>
            <Text style={styles.muted}>
              Based on {summary.count} logged {summary.count === 1 ? 'day' : 'days'}.
              {trend ? ` ${TREND_TEXT[trend]}.` : ''}
            </Text>
          </Card>
          <SectionTitle title="Logged days" />
          {logged.slice(0, 14).map(p => (
            <ListRow
              key={p.date}
              title={formatWeekdayDate(p.date)}
              subtitle={`${p.value} ${info.max ? '/ 5' : info.unit}`}
              onPress={() => navigation.navigate(ROUTES.day, {date: p.date})}
            />
          ))}
        </>
      ) : (
        <EmptyState
          icon="chart-line-variant"
          title={`No ${info.title.toLowerCase()} logged`}
          message="Nothing is saved for this metric in the selected range, so there is nothing to chart."
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  cardTitle: {color: colors.text, fontSize: 17, fontWeight: '700'},
  body: {color: colors.text, fontSize: 15, lineHeight: 22, marginTop: space.sm},
  muted: {color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: space.xs},
  compare: {flexDirection: 'row', marginVertical: space.md},
  compareCol: {flex: 1, alignItems: 'center'},
  big: {color: colors.primary, fontSize: 34, fontWeight: '700'},
});
