import {
  rangeFor,
  eachDate,
  buildDays,
  seriesFor,
  bucketize,
  summarize,
  trendOf,
  compareMoodByFactor,
  computeStreak,
  weekStartDate,
  goalProgress,
  patternInsightsForDays,
} from '../analytics';
import {normalizeRating, ratingSliderValue} from '../../../services/data/models';
import {METRIC_INFO} from '../../data/metrics';

const checkIn = (date, values) => ({date, mood: null, energy: null, stress: null, focus: null, ...values});
const entry = (date, metricId, value) => ({date, metricId, value});
const journal = (date, moodValue, createdAt = `${date}T10:00:00Z`) => ({date, moodValue, createdAt, journal: 'x'});

describe('date ranges', () => {
  test('rangeFor ends today and spans the right number of days', () => {
    expect(rangeFor('week', '2026-01-10')).toEqual({from: '2026-01-04', to: '2026-01-10', days: 7});
    expect(eachDate(rangeFor('month', '2026-03-31').from, '2026-03-31')).toHaveLength(30);
    expect(eachDate(rangeFor('year', '2026-12-31').from, '2026-12-31')).toHaveLength(365);
  });

  test('weekStartDate honours the chosen first day', () => {
    // 2026-01-07 is a Wednesday
    expect(weekStartDate('2026-01-07', 'monday')).toBe('2026-01-05');
    expect(weekStartDate('2026-01-07', 'sunday')).toBe('2026-01-04');
    expect(weekStartDate('2026-01-07', 'saturday')).toBe('2026-01-03');
    expect(weekStartDate('2026-01-05', 'monday')).toBe('2026-01-05');
  });
});

describe('buildDays', () => {
  const days = buildDays(
    {
      checkIns: [checkIn('2026-01-02', {mood: 4, stress: 2})],
      journalEntries: [journal('2026-01-02', 1), journal('2026-01-03', 2, '2026-01-03T08:00:00Z'), journal('2026-01-03', 5, '2026-01-03T20:00:00Z')],
      metricEntries: [entry('2026-01-02', 'sleep', 7.5), entry('2026-01-02', 'meal', 1), entry('2026-01-02', 'meal', 1), entry('2026-01-09', 'water', 3)],
    },
    '2026-01-01',
    '2026-01-04',
  );

  test('has one row per day and leaves unlogged values null', () => {
    expect(days.map(d => d.date)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04']);
    expect(days[0]).toMatchObject({mood: null, sleep: null, any: false});
  });

  test('check-in mood wins; otherwise the latest journal mood is used', () => {
    expect(days[1].mood).toBe(4);
    expect(days[2].mood).toBe(5);
  });

  test('counts meals and journal entries, and ignores records outside the range', () => {
    expect(days[1]).toMatchObject({sleep: 7.5, meals: 2, stress: 3.25, journalCount: 1});
    expect(days[2].journalCount).toBe(2);
    expect(days.some(d => d.water != null)).toBe(false);
  });
});

describe('mixed check-in rating scales', () => {
  test('uses the documented endpoint-preserving mapping and 1-10 chart ranges', () => {
    expect([1, 2, 3, 4, 5].map(value => normalizeRating(value))).toEqual([1, 3.25, 5.5, 7.75, 10]);
    expect([1, 2, 3, 4, 5].map(value => ratingSliderValue(value))).toEqual([1, 3, 6, 8, 10]);
    expect(METRIC_INFO).toMatchObject({
      mood: {max: 5, unit: 'scale 1-5'},
      energy: {max: 10, unit: 'scale 1-10'},
      stress: {max: 10, unit: 'scale 1-10'},
      focus: {max: 10, unit: 'scale 1-10'},
    });
  });

  test('normalizes legacy 1-5 readings at read time without changing their raw records', () => {
    const legacy = checkIn('2026-01-01', {energy: 2, stress: 4, focus: 5});
    const current = checkIn('2026-01-02', {
      energy: 9,
      stress: 8,
      focus: 6,
      ratingScales: {energy: 'scale_1_10', stress: 'scale_1_10', focus: 'scale_1_10'},
    });
    const days = buildDays({checkIns: [legacy, current]}, '2026-01-01', '2026-01-02');

    expect(days.map(day => [day.energy, day.stress, day.focus])).toEqual([
      [3.25, 7.75, 10],
      [9, 8, 6],
    ]);
    expect(legacy).toMatchObject({energy: 2, stress: 4, focus: 5});
    expect(current).toMatchObject({energy: 9, stress: 8, focus: 6});
  });

  test('stress associations and calm goals use equivalent cutoffs across scales', () => {
    const dates = eachDate('2026-01-01', '2026-01-06');
    const checkIns = dates.map((date, index) => {
      const isCalm = index < 3;
      const isLegacy = index === 0 || index === 2 || index === 3;
      const stress = isCalm ? (isLegacy ? 2 : 3) : (isLegacy ? 4 : 8);
      return checkIn(date, {
        mood: index % 2 ? 4 : 2,
        stress,
        ...(isLegacy ? {} : {ratingScales: {stress: 'scale_1_10'}}),
      });
    });
    const days = buildDays({checkIns}, dates[0], dates[5]);
    const stressFactor = compareMoodByFactor(days).find(factor => factor.id === 'stress');

    expect(stressFactor).toMatchObject({enough: true, withCount: 3, withoutCount: 3});
    expect(stressFactor.withLabel).toBe('Stress 8+');
    expect(goalProgress('Lower daily stress', days)).toMatchObject({count: 3, of: 6});
  });
});

describe('series, buckets and summaries', () => {
  const points = [
    {date: '2026-01-01', value: 2},
    {date: '2026-01-02', value: null},
    {date: '2026-01-03', value: 4},
    {date: '2026-01-04', value: 6},
  ];

  test('summarize ignores missing days and returns null for no data', () => {
    expect(summarize(points)).toEqual({count: 3, average: 4, min: 2, max: 6});
    expect(summarize([{date: '2026-01-01', value: null}])).toBeNull();
  });

  test('bucketize averages logged days only and keeps empty buckets as null', () => {
    const daily = bucketize(points, 'week');
    expect(daily.map(b => b.value)).toEqual([2, null, 4, 6]);
    const quarter = bucketize([...points, ...eachDate('2026-01-05', '2026-01-20').map(date => ({date, value: null}))], 'month');
    expect(quarter[0]).toMatchObject({value: 4, count: 3});
    expect(quarter[1].value).toBeNull();
  });

  test('trendOf needs enough data and detects direction', () => {
    expect(trendOf(points)).toBeNull();
    const rising = [1, 2, 3, 4, 5, 5].map((value, i) => ({date: `2026-01-0${i + 1}`, value}));
    const falling = [5, 5, 4, 3, 2, 1].map((value, i) => ({date: `2026-01-0${i + 1}`, value}));
    const flat = [3, 3, 3, 3].map((value, i) => ({date: `2026-01-0${i + 1}`, value}));
    expect([trendOf(rising), trendOf(falling), trendOf(flat)]).toEqual(['up', 'down', 'flat']);
  });

  test('seriesFor picks one metric', () => {
    const days = buildDays({metricEntries: [entry('2026-01-01', 'water', 5)]}, '2026-01-01', '2026-01-02');
    expect(seriesFor(days, 'water')).toEqual([{date: '2026-01-01', value: 5}, {date: '2026-01-02', value: null}]);
  });
});

describe('mood factors', () => {
  const dates = eachDate('2026-01-01', '2026-01-10');
  const data = {
    checkIns: dates.map((date, i) => checkIn(date, {mood: i < 5 ? 5 : 2})),
    metricEntries: dates.slice(0, 5).map(date => entry(date, 'exercise', 30)),
  };
  const result = compareMoodByFactor(buildDays(data, '2026-01-01', '2026-01-10'));
  const exercise = result.find(f => f.id === 'exercise');

  test('compares average mood with and without the factor', () => {
    expect(exercise).toMatchObject({enough: true, withAvg: 5, withoutAvg: 2, diff: 3, withCount: 5, withoutCount: 5});
  });

  test('refuses to compare without enough days in both groups', () => {
    expect(result.find(f => f.id === 'sleep')).toMatchObject({enough: false, diff: null});
    expect(result.find(f => f.id === 'water').enough).toBe(false);
  });
});

describe('streak', () => {
  test('counts back from today, or from yesterday when today is empty', () => {
    expect(computeStreak(['2026-01-08', '2026-01-09', '2026-01-10'], '2026-01-10')).toBe(3);
    expect(computeStreak(['2026-01-08', '2026-01-09'], '2026-01-10')).toBe(2);
    expect(computeStreak(['2026-01-07', '2026-01-10'], '2026-01-10')).toBe(1);
    expect(computeStreak([], '2026-01-10')).toBe(0);
  });
});

describe('goal progress', () => {
  const week = buildDays(
    {
      checkIns: [checkIn('2026-01-05', {stress: 1}), checkIn('2026-01-06', {stress: 4}), checkIn('2026-01-07', {stress: 2})],
      metricEntries: [
        entry('2026-01-05', 'sleep', 8),
        entry('2026-01-06', 'sleep', 6),
        entry('2026-01-05', 'exercise', 20),
        entry('2026-01-06', 'water', 8),
        entry('2026-01-07', 'water', 4),
      ],
      journalEntries: [journal('2026-01-05', 3), journal('2026-01-06', 3)],
    },
    '2026-01-05',
    '2026-01-07',
  );

  test('computes each preset goal from the week\'s records', () => {
    expect(goalProgress('Sleep 7+ hours', week)).toMatchObject({count: 1, of: 3, text: '1 of 3 days this week'});
    expect(goalProgress('Move every day', week)).toMatchObject({count: 1, of: 3});
    expect(goalProgress('Journal 3 times a week', week)).toMatchObject({count: 2, of: 3, fraction: 2 / 3});
    expect(goalProgress('Drink more water', week)).toMatchObject({count: 1, of: 3});
    expect(goalProgress('Lower daily stress', week)).toMatchObject({count: 2, of: 3});
  });

  test('is honest about empty weeks and unsupported goals', () => {
    expect(goalProgress('Lower daily stress', buildDays({}, '2026-01-05', '2026-01-07')).text).toBe('Nothing logged yet this week.');
    expect(goalProgress('Learn Spanish', week)).toMatchObject({supported: false});
  });
});

describe('pattern discovery', () => {
  test('suppresses relationship claims when there is not enough trustworthy data', () => {
    const sparse = buildDays(
      {
        checkIns: [checkIn('2026-01-01', {mood: 3, sleep: 8}), checkIn('2026-01-02', {mood: 2, sleep: 5})],
        metricEntries: [entry('2026-01-01', 'sleep', 8), entry('2026-01-02', 'sleep', 5)],
      },
      '2026-01-01',
      '2026-01-06',
    );

    expect(patternInsightsForDays(sparse)).toEqual([]);
  });

  test('detects a clear pattern in a synthetic 28-day dataset', () => {
    const dates = eachDate('2026-02-01', '2026-02-28');
    const checkIns = dates.map((date, index) => {
      const mood = index < 14 ? 5 : 2;
      return checkIn(date, {mood, stress: 2, focus: 4});
    });
    const metricEntries = dates.map((date, index) => entry(date, 'sleep', index < 14 ? 8 : 5));
    const days = buildDays({checkIns, metricEntries}, '2026-02-01', '2026-02-28');

    const insights = patternInsightsForDays(days);
    expect(insights.some(i => i.id === 'sleep-mood')).toBe(true);
    expect(insights[0]).toMatchObject({
      validObservations: expect.any(Number),
      observation: expect.stringContaining('sleep'),
    });
  });

  test('handles missing values and date boundaries without inventing patterns', () => {
    const dates = eachDate('2026-03-01', '2026-03-30');
    const checkIns = dates.map((date, index) => {
      const sleep = index % 3 === 0 ? null : 7 + (index % 2);
      const mood = index % 4 === 0 ? null : 3;
      return checkIn(date, {mood, sleep, stress: index % 5 === 0 ? 5 : 2, focus: 3});
    });
    const days = buildDays({checkIns}, '2026-03-01', '2026-03-30');

    const insights = patternInsightsForDays(days);
    expect(insights).toEqual([]);
  });
});
