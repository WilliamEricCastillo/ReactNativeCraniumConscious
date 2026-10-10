import {metricColors} from '../theme/theme';

// Everything in this file is illustrative example content, not user data.

export const METRIC_INFO = {
  mood: {title: 'Mood', icon: 'emoticon-happy-outline', color: metricColors.mood, unit: 'scale 1-5'},
  energy: {title: 'Energy', icon: 'lightning-bolt-outline', color: metricColors.energy, unit: 'scale 1-5'},
  stress: {title: 'Stress', icon: 'pulse', color: metricColors.stress, unit: 'scale 1-5'},
  focus: {title: 'Focus', icon: 'target', color: metricColors.focus, unit: 'scale 1-5'},
  sleep: {title: 'Sleep', icon: 'sleep', color: metricColors.sleep, unit: 'hours'},
  exercise: {title: 'Exercise', icon: 'run', color: metricColors.exercise, unit: 'minutes'},
  water: {title: 'Water', icon: 'water-outline', color: metricColors.water, unit: 'glasses'},
  meal: {title: 'Meals', icon: 'food-apple-outline', color: metricColors.meal, unit: 'meals'},
};

export const SAMPLE_SERIES = {
  mood: [3, 4, 3, 5, 4, 4, 5],
  energy: [2, 3, 3, 4, 3, 4, 4],
  stress: [4, 3, 4, 2, 3, 2, 2],
  focus: [3, 3, 4, 4, 3, 5, 4],
  sleep: [6, 7, 6.5, 8, 7, 7.5, 8],
  exercise: [0, 30, 0, 45, 20, 60, 30],
  water: [4, 6, 5, 8, 6, 7, 8],
};

export const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
export const getMetricInfo = id => (own(METRIC_INFO, id) ? METRIC_INFO[id] : null);
export const getSampleSeries = id => (own(SAMPLE_SERIES, id) ? SAMPLE_SERIES[id] : null);

export const FACTORS = [
  {id: 'exercise', title: 'Exercise', icon: 'run', direction: 'positive', example: 'Higher mood on days with exercise'},
  {id: 'sleep', title: 'Sleep', icon: 'sleep', direction: 'positive', example: 'Higher mood after 7+ hours of sleep'},
  {id: 'water', title: 'Water', icon: 'water-outline', direction: 'positive', example: 'Slightly higher mood on well-hydrated days'},
  {id: 'meals', title: 'Meals', icon: 'food-apple-outline', direction: 'positive', example: 'More stable mood on days with regular meals'},
  {id: 'caffeine', title: 'Caffeine', icon: 'coffee-outline', direction: 'negative', example: 'Lower mood on days with late caffeine'},
  {id: 'stress', title: 'Stress', icon: 'pulse', direction: 'negative', example: 'Lower mood on high-stress days'},
];

export const PROMPT_CATEGORIES = [
  {
    id: 'reflection',
    title: 'Reflection',
    prompts: [
      'What is one thing that went well today, and why?',
      'What drained your energy today?',
      'What would you tell yourself a week ago?',
    ],
  },
  {
    id: 'gratitude',
    title: 'Gratitude',
    prompts: [
      'Who made a difference in your day?',
      'What small comfort are you thankful for right now?',
    ],
  },
  {
    id: 'growth',
    title: 'Growth',
    prompts: [
      'What is one habit you would like to build?',
      'What challenge are you facing, and what is one small next step?',
    ],
  },
  {
    id: 'calm',
    title: 'Calm',
    prompts: [
      'What is on your mind that you can set down for tonight?',
      'Describe a place where you feel at ease.',
    ],
  },
];
