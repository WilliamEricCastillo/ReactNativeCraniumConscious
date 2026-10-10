import {parseISO, format} from 'date-fns';
import {shiftISODate} from './dates';

// Pure calculations over saved records. Nothing here invents data: days without a record stay null.

export const SLEEP_TARGET_HOURS = 7;
export const WATER_TARGET_GLASSES = 8;
export const CALM_STRESS_MAX = 2;
export const HIGH_STRESS_MIN = 4;
export const JOURNAL_GOAL_PER_WEEK = 3;
export const MIN_DAYS_PER_GROUP = 3;

export const RANGES = {
  week: {label: 'Week', days: 7, bucket: 1},
  month: {label: 'Month', days: 30, bucket: 5},
  quarter: {label: '3 Months', days: 90, bucket: 15},
  year: {label: 'Year', days: 365, bucket: 31},
};

export const rangeFor = (rangeId, today) => {
  const {days} = RANGES[rangeId];
  return {from: shiftISODate(today, -(days - 1)), to: today, days};
};

export const eachDate = (from, to) => {
  const dates = [];
  for (let d = from; d <= to; d = shiftISODate(d, 1)) dates.push(d);
  return dates;
};

const average = values => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
const round1 = n => (n == null ? null : Math.round(n * 10) / 10);

// One row per calendar day in [from, to].
export const buildDays = ({checkIns = [], metricEntries = [], journalEntries = []}, from, to) => {
  const days = new Map(
    eachDate(from, to).map(date => [
      date,
      {date, mood: null, energy: null, stress: null, focus: null, sleep: null, exercise: null, water: null, meals: 0, journalCount: 0, any: false},
    ]),
  );

  checkIns.forEach(c => {
    const day = days.get(c.date);
    if (!day) return;
    ['mood', 'energy', 'stress', 'focus'].forEach(k => {
      if (c[k] != null) day[k] = c[k];
    });
    day.any = true;
  });

  // Same rule as the Today screen: the check-in mood wins, otherwise the latest journal entry's mood.
  const checkInMood = new Set(checkIns.filter(c => c.mood != null).map(c => c.date));
  [...journalEntries]
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
    .forEach(e => {
      const day = days.get(e.date);
      if (!day) return;
      day.journalCount += 1;
      day.any = true;
      if (!checkInMood.has(e.date)) day.mood = e.moodValue;
    });

  metricEntries.forEach(e => {
    const day = days.get(e.date);
    if (!day) return;
    day.any = true;
    if (e.metricId === 'sleep' || e.metricId === 'exercise' || e.metricId === 'water') day[e.metricId] = e.value;
    else if (e.metricId === 'meal') day.meals += 1;
  });

  return [...days.values()];
};

export const seriesFor = (days, metricId) => days.map(d => ({date: d.date, value: d[metricId] ?? null}));

// Groups a daily series into chart bars: daily for a week, otherwise averages over fixed-size blocks.
export const bucketize = (points, rangeId) => {
  const size = RANGES[rangeId].bucket;
  const buckets = [];
  points.forEach((p, i) => {
    const index = Math.floor(i / size);
    if (!buckets[index]) buckets[index] = {startDate: p.date, values: []};
    if (p.value != null) buckets[index].values.push(p.value);
  });
  return buckets.map(b => ({
    label: size === 1 ? format(parseISO(b.startDate), 'EEEEE') : format(parseISO(b.startDate), 'd/M'),
    value: round1(average(b.values)),
    count: b.values.length,
  }));
};

export const summarize = points => {
  const values = points.filter(p => p.value != null).map(p => p.value);
  if (!values.length) return null;
  return {count: values.length, average: round1(average(values)), min: Math.min(...values), max: Math.max(...values)};
};

// Compares the first and second half of the logged values; needs at least 4 of them.
export const trendOf = points => {
  const values = points.filter(p => p.value != null).map(p => p.value);
  if (values.length < 4) return null;
  const mid = Math.floor(values.length / 2);
  const first = average(values.slice(0, mid));
  const second = average(values.slice(values.length - mid));
  const overall = average(values);
  const threshold = Math.max(overall * 0.05, 0.1);
  if (second - first > threshold) return 'up';
  if (first - second > threshold) return 'down';
  return 'flat';
};

// Things that may go along with a different mood. `test` returns true/false, or null when the day cannot be judged.
export const FACTOR_DEFS = [
  {id: 'exercise', title: 'Exercise', icon: 'run', withLabel: 'Exercise logged', withoutLabel: 'No exercise logged', test: d => d.exercise != null && d.exercise > 0},
  {id: 'sleep', title: 'Sleep', icon: 'sleep', withLabel: `${SLEEP_TARGET_HOURS}+ hours`, withoutLabel: 'Under 7 hours', test: d => (d.sleep == null ? null : d.sleep >= SLEEP_TARGET_HOURS)},
  {id: 'water', title: 'Water', icon: 'water-outline', withLabel: `${WATER_TARGET_GLASSES}+ glasses`, withoutLabel: 'Fewer glasses', test: d => (d.water == null ? null : d.water >= WATER_TARGET_GLASSES)},
  {id: 'meals', title: 'Meals', icon: 'food-apple-outline', withLabel: '3+ meals logged', withoutLabel: 'Fewer meals logged', test: d => d.meals >= 3},
  {id: 'stress', title: 'High stress', icon: 'pulse', withLabel: `Stress ${HIGH_STRESS_MIN}+`, withoutLabel: 'Lower stress', test: d => (d.stress == null ? null : d.stress >= HIGH_STRESS_MIN)},
];

// Average mood on days with vs without each factor. `enough` is false until both groups have enough days.
export const compareMoodByFactor = days => {
  const moodDays = days.filter(d => d.mood != null);
  return FACTOR_DEFS.map(def => {
    const withDays = [];
    const withoutDays = [];
    moodDays.forEach(d => {
      const result = def.test(d);
      if (result === true) withDays.push(d.mood);
      else if (result === false) withoutDays.push(d.mood);
    });
    const enough = withDays.length >= MIN_DAYS_PER_GROUP && withoutDays.length >= MIN_DAYS_PER_GROUP;
    const withAvg = round1(average(withDays));
    const withoutAvg = round1(average(withoutDays));
    return {
      id: def.id,
      title: def.title,
      icon: def.icon,
      withLabel: def.withLabel,
      withoutLabel: def.withoutLabel,
      withAvg,
      withoutAvg,
      withCount: withDays.length,
      withoutCount: withoutDays.length,
      enough,
      diff: enough ? round1(withAvg - withoutAvg) : null,
    };
  });
};

// Consecutive days with any record, ending today (or yesterday if today has nothing yet).
export const computeStreak = (activeDates, today) => {
  const set = new Set(activeDates);
  let cursor = set.has(today) ? today : shiftISODate(today, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = shiftISODate(cursor, -1);
  }
  return streak;
};

const WEEKDAY = {sunday: 0, monday: 1, saturday: 6};

export const weekStartDate = (today, weekStart = 'monday') => {
  const dow = parseISO(today).getDay();
  return shiftISODate(today, -((dow - (WEEKDAY[weekStart] ?? 1) + 7) % 7));
};

export const GOAL_DEFS = {
  'sleep 7+ hours': {
    id: 'sleep',
    hint: 'Counts days with 7 or more hours of sleep logged.',
    measure: days => ({count: days.filter(d => d.sleep != null && d.sleep >= SLEEP_TARGET_HOURS).length, of: days.length, unit: 'days this week'}),
  },
  'move every day': {
    id: 'exercise',
    hint: 'Counts days with any exercise logged.',
    measure: days => ({count: days.filter(d => d.exercise != null && d.exercise > 0).length, of: days.length, unit: 'days this week'}),
  },
  'journal 3 times a week': {
    id: 'journal',
    hint: 'Counts journal entries since your week started.',
    measure: days => ({count: days.reduce((n, d) => n + d.journalCount, 0), of: JOURNAL_GOAL_PER_WEEK, unit: 'entries this week'}),
  },
  'drink more water': {
    id: 'water',
    hint: `Counts days with ${WATER_TARGET_GLASSES} or more glasses (2 litres) logged.`,
    measure: days => ({count: days.filter(d => d.water != null && d.water >= WATER_TARGET_GLASSES).length, of: days.length, unit: `days with ${WATER_TARGET_GLASSES}+ glasses`}),
  },
  'lower daily stress': {
    id: 'stress',
    hint: 'Counts logged days with stress at 1 or 2 out of 5.',
    measure: days => {
      const logged = days.filter(d => d.stress != null);
      return {count: logged.filter(d => d.stress <= CALM_STRESS_MAX).length, of: logged.length, unit: 'logged days calm'};
    },
  },
};

// Progress for one goal over the current week. Goals without a rule here are reported as not tracked.
export const goalProgress = (title, weekDays) => {
  const def = GOAL_DEFS[title.trim().toLowerCase()];
  if (!def) return {supported: false, text: 'Progress is not tracked for this goal.', fraction: 0};
  const {count, of, unit} = def.measure(weekDays);
  const base = {supported: true, id: def.id, hint: def.hint, count, of};
  if (of === 0) return {...base, text: 'Nothing logged yet this week.', fraction: 0};
  return {...base, text: `${count} of ${of} ${unit}`, fraction: Math.min(1, count / of)};
};

export const factorSentence = f =>
  `Mood averaged ${f.withAvg} on days with "${f.withLabel}" (${f.withCount} days) and ${f.withoutAvg} on days with "${f.withoutLabel}" (${f.withoutCount} days).`;
