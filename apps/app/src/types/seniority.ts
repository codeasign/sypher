export type SeniorityLevel =
  | 'base'
  | 'senior'
  | 'lead'
  | 'staff'
  | 'principal'
  | 'l1'
  | 'l2'
  | 'l3'
  | 'l4'
  | 'l5'
  | 'l6'
  | 'architect'
  | 'manager';

export const SENIORITY_LEVEL_OPTIONS: { value: SeniorityLevel; label: string }[] = [
  { value: 'base', label: 'Base' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'staff', label: 'Staff' },
  { value: 'principal', label: 'Principal' },
  { value: 'l1', label: 'L1' },
  { value: 'l2', label: 'L2' },
  { value: 'l3', label: 'L3' },
  { value: 'l4', label: 'L4' },
  { value: 'l5', label: 'L5' },
  { value: 'l6', label: 'L6' },
  { value: 'architect', label: 'Architect' },
  { value: 'manager', label: 'Manager' },
];

// 'base' is deliberately excluded — it's the no-prefix default for a
// designation line with no recognized prefix (e.g. "MLOps Engineer").
export const SENIORITY_PREFIXES: { prefix: string; value: SeniorityLevel }[] = [
  { prefix: 'principal', value: 'principal' },
  { prefix: 'staff', value: 'staff' },
  { prefix: 'lead', value: 'lead' },
  { prefix: 'senior', value: 'senior' },
  { prefix: 'manager', value: 'manager' },
  { prefix: 'architect', value: 'architect' },
  { prefix: 'l6', value: 'l6' },
  { prefix: 'l5', value: 'l5' },
  { prefix: 'l4', value: 'l4' },
  { prefix: 'l3', value: 'l3' },
  { prefix: 'l2', value: 'l2' },
  { prefix: 'l1', value: 'l1' },
];
