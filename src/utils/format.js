import {GLASS_ML} from '../../services/data/models';

const OUNCE_ML = 29.5735;

// Water is always stored as glasses; this only changes how it is shown.
export const formatWater = (glasses, unit = 'glasses') => {
  if (glasses == null) return 'Not logged';
  if (unit === 'ml') return `${Math.round(glasses * GLASS_ML)} ml`;
  if (unit === 'oz') return `${Math.round((glasses * GLASS_ML) / OUNCE_ML)} oz`;
  return `${glasses} ${glasses === 1 ? 'glass' : 'glasses'}`;
};

// Short text for a custom metric's entries on one day (latest value; count when there are several).
export const describeCustomEntries = (metric, entries) => {
  if (!entries.length) return 'Not logged';
  const latest = entries[entries.length - 1];
  let text;
  if (metric.valueType === 'boolean') text = latest.value === 1 ? 'Yes' : 'No';
  else if (metric.valueType === 'scale') text = `${latest.value} / 5`;
  else text = `${latest.value}${metric.unit ? ` ${metric.unit}` : ''}`;
  return entries.length > 1 ? `${text} (${entries.length} logs)` : text;
};
