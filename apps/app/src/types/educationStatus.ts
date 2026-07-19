export type EducationStatus = 'fresher' | 'passed_out' | 'in_institution' | 'experienced';

export const EDUCATION_STATUS_OPTIONS: { value: EducationStatus; label: string }[] = [
  { value: 'fresher', label: 'Fresher' },
  { value: 'passed_out', label: 'Passed Out' },
  { value: 'in_institution', label: 'In Institution or University or College' },
  { value: 'experienced', label: 'Experienced' },
];

export const EXPERIENCE_YEARS_OPTIONS: number[] = Array.from({ length: 30 }, (_, i) => i + 1);

export const EXPERIENCE_MONTHS_OPTIONS: number[] = Array.from({ length: 12 }, (_, i) => i);

export const PASSING_YEAR_OPTIONS: number[] = Array.from({ length: 101 }, (_, i) => 1980 + i);
