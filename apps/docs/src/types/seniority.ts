export type SeniorityLevel = 'base' | 'senior' | 'lead' | 'staff' | 'principal';

export const SENIORITY_LEVEL_OPTIONS: { value: SeniorityLevel; label: string }[] = [
  { value: 'base', label: 'Base' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'staff', label: 'Staff' },
  { value: 'principal', label: 'Principal' },
];

export const SENIORITY_PREFIXES: { prefix: string; value: SeniorityLevel }[] = [
  { prefix: 'principal', value: 'principal' },
  { prefix: 'staff', value: 'staff' },
  { prefix: 'lead', value: 'lead' },
  { prefix: 'senior', value: 'senior' },
];
