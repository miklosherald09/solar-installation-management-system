import { WorkDurationUnit } from '../../types';

export const PRESET_AMOUNTS = [300, 500, 800, 1000];

export const DURATION_UNITS: { value: WorkDurationUnit; label: string }[] = [
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
];
