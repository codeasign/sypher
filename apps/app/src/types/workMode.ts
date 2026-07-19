export type WorkMode = 'onsite' | 'hybrid' | 'remote' | 'work_from_home';

export const WORK_MODE_OPTIONS: { value: WorkMode; label: string }[] = [
  { value: 'onsite', label: 'On Site' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' },
  { value: 'work_from_home', label: 'Work From Home' },
];

export const WORK_MODE_LABEL: Record<string, string> = Object.fromEntries(
  WORK_MODE_OPTIONS.map((option) => [option.value, option.label])
);
