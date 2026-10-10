export const colors = {
  bg: '#07091A',
  surface: '#0F1330',
  surfaceAlt: '#161B40',
  border: '#252B5C',
  primary: '#8B5CF6',
  primaryDeep: '#6D28D9',
  primarySoft: 'rgba(139,92,246,0.18)',
  text: '#F2F3FF',
  textMuted: '#A3A8D0',
  blue: '#4F8EF7',
  teal: '#2DD4BF',
  green: '#4ADE80',
  amber: '#FBBF24',
  red: '#F87171',
};

// Metric accents, shared by cards, trends and insights.
export const metricColors = {
  mood: colors.primary,
  energy: colors.amber,
  stress: colors.red,
  focus: colors.blue,
  sleep: colors.blue,
  exercise: colors.green,
  water: colors.teal,
  meal: colors.amber,
  custom: colors.primary,
};

// Existing journal mood scale: 5 (excellent) down to 1 (very negative).
export const moodOptions = [
  {value: 5, emoji: '😍', label: 'Excellent', color: '#c33cf0'},
  {value: 4, emoji: '😊', label: 'Good', color: '#1da118'},
  {value: 3, emoji: '😐', label: 'Neutral', color: '#FACC15'},
  {value: 2, emoji: '☹️', label: 'Low', color: '#FFA500'},
  {value: 1, emoji: '😠', label: 'Very negative', color: '#FF6347'},
];

export const radius = {sm: 10, md: 16, lg: 22, pill: 999};
export const space = {xs: 4, sm: 8, md: 12, lg: 16, xl: 24};
export const MIN_TOUCH = 48;
