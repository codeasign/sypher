export type Role =
  | 'admin'
  | 'free_users'
  | 'paid_users'
  | 'internal_hr'
  | 'company_hr'
  | 'company_employees'
  | 'branders'
  | 'external_job_poster';

export const ROLES: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'free_users', label: 'Free Users' },
  { value: 'paid_users', label: 'Paid Users' },
  { value: 'internal_hr', label: 'Internal HR' },
  { value: 'company_hr', label: 'Company HR' },
  { value: 'company_employees', label: 'Company Employees' },
  { value: 'branders', label: 'Branders' },
  { value: 'external_job_poster', label: 'External Job Poster' },
];

// company_employees access is configured per-company on the Companies tab,
// not globally — so it's excluded from the global Courses/Sidebar grids.
export const GLOBALLY_CONFIGURABLE_ROLES = ROLES.filter(
  (r) => r.value !== 'admin' && r.value !== 'company_employees'
);

// Dashboard and Profile show the full course-browsing / candidate-profile
// experience only for these roles. Everyone else (admin, HR roles,
// company_employees, external_job_poster) gets an empty placeholder instead
// -- those roles operate through their own tools (Manage Access, Applicants,
// Add Job Post, etc.), not the learner-facing dashboard/profile.
export const FULL_DASHBOARD_ROLES: Role[] = ['free_users', 'paid_users', 'branders'];
