export type Role =
  | 'admin'
  | 'free_users'
  | 'paid_users'
  | 'internal_hr'
  | 'company_hr'
  | 'company_employees'
  | 'branders';

export const ROLES: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'free_users', label: 'Free Users' },
  { value: 'paid_users', label: 'Paid Users' },
  { value: 'internal_hr', label: 'Internal HR' },
  { value: 'company_hr', label: 'Company HR' },
  { value: 'company_employees', label: 'Company Employees' },
  { value: 'branders', label: 'Branders' },
];

// company_employees access is configured per-company on the Companies tab,
// not globally — so it's excluded from the global Courses/Sidebar grids.
export const GLOBALLY_CONFIGURABLE_ROLES = ROLES.filter(
  (r) => r.value !== 'admin' && r.value !== 'company_employees'
);
