import {metricColors} from '../theme/theme';

// Built-in metric display info. `max` is the top of a 1-5 scale, used to size charts.
export const METRIC_INFO = {
  mood: {title: 'Mood', icon: 'emoticon-happy-outline', color: metricColors.mood, unit: 'scale 1-5', max: 5},
  energy: {title: 'Energy', icon: 'lightning-bolt-outline', color: metricColors.energy, unit: 'scale 1-5', max: 5},
  stress: {title: 'Stress', icon: 'pulse', color: metricColors.stress, unit: 'scale 1-5', max: 5},
  focus: {title: 'Focus', icon: 'target', color: metricColors.focus, unit: 'scale 1-5', max: 5},
  sleep: {title: 'Sleep', icon: 'sleep', color: metricColors.sleep, unit: 'hours'},
  exercise: {title: 'Exercise', icon: 'run', color: metricColors.exercise, unit: 'minutes'},
  water: {title: 'Water', icon: 'water-outline', color: metricColors.water, unit: 'glasses'},
  meal: {title: 'Meals', icon: 'food-apple-outline', color: metricColors.meal, unit: 'meals'},
};

// Metrics that have a per-day value to chart (meals are counted, not charted).
export const TREND_METRICS = ['mood', 'energy', 'stress', 'focus', 'sleep', 'exercise', 'water'];

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
export const getMetricInfo = id => (own(METRIC_INFO, id) ? METRIC_INFO[id] : null);
