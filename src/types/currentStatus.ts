export type CurrentStatus = 'open_to_opportunities' | 'actively_looking' | 'in_notice_period';

export const CURRENT_STATUS_OPTIONS: { value: CurrentStatus; label: string }[] = [
  { value: 'open_to_opportunities', label: 'Open to Opportunities' },
  { value: 'actively_looking', label: 'Actively Looking' },
  { value: 'in_notice_period', label: 'In Notice Period' },
];

export type NoticePeriod =
  | 'immediately_available'
  | 'seven_to_fifteen_days'
  | 'thirty_days'
  | 'forty_five_days'
  | 'sixty_days'
  | 'ninety_days';

export const NOTICE_PERIOD_OPTIONS: { value: NoticePeriod; label: string }[] = [
  { value: 'immediately_available', label: 'Immediately available' },
  { value: 'seven_to_fifteen_days', label: 'Between 7 to 15 days' },
  { value: 'thirty_days', label: '30 Days' },
  { value: 'forty_five_days', label: '45 Days' },
  { value: 'sixty_days', label: '60 Days' },
  { value: 'ninety_days', label: '90 Days' },
];
