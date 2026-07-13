export type LookingFor =
  | 'internship'
  | 'permanent_onsite'
  | 'permanent_hybrid'
  | 'permanent_remote'
  | 'freelance'
  | 'contractual';

export const LOOKING_FOR_OPTIONS: { value: LookingFor; label: string }[] = [
  { value: 'internship', label: 'Internship' },
  { value: 'permanent_onsite', label: 'Permanent Job - Onsite' },
  { value: 'permanent_hybrid', label: 'Permanent Job - Hybrid' },
  { value: 'permanent_remote', label: 'Permanent Job - Remote' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'contractual', label: 'Contractual' },
];
