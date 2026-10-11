export const colors = {
  bg: '#FFF9FE',
  surface: '#FFFFFF',
  surfaceAlt: '#F8F2FC',
  border: '#E9DDF2',
  primary: '#B12DE0',
  primaryDeep: '#8A32D1',
  primarySoft: 'rgba(224,72,191,0.13)',
  text: '#171B3C',
  textMuted: '#65728F',
  blue: '#168AF5',
  teal: '#13BFA9',
  green: '#18A88F',
  amber: '#F2B51C',
  red: '#E95477',
};

// Metric accents, shared by cards, trends and insights.
export const metricColors = {
  mood: colors.primary,
  energy: '#EFB51C',
  stress: '#EE527A',
  focus: colors.blue,
  sleep: colors.blue,
  exercise: '#15B89A',
  water: colors.teal,
  meal: '#F15A56',
  custom: colors.primary,
};

// Existing journal mood scale: 5 (excellent) down to 1 (very negative).
export const moodOptions = [
  {value: 5, emoji: '😍', label: 'Excellent', color: '#D735CF'},
  {value: 4, emoji: '😊', label: 'Good', color: '#15B89A'},
  {value: 3, emoji: '😐', label: 'Neutral', color: '#FACC15'},
  {value: 2, emoji: '☹️', label: 'Low', color: '#FFA500'},
  {value: 1, emoji: '😠', label: 'Very negative', color: '#FF6347'},
];

export const radius = {sm: 10, md: 16, lg: 22, pill: 999};
export const space = {xs: 4, sm: 8, md: 12, lg: 16, xl: 24};
export const MIN_TOUCH = 48;
