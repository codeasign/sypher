/**
 * Human-readable aliases for the Role enum (apps/api/prisma/schema.prisma)
 * — the UI should never render a raw enum value like "PAID_USER" directly.
 * Single source of truth so every place a role is displayed (dashboard,
 * sidebar, Manage Access role cards/modals) stays in sync automatically.
 */
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  FREE_USER: 'Free User',
  PAID_USER: 'Paid User',
  INTERNAL_HR: 'Internal HR',
  COMPANY_HR: 'Company HR',
  COMPANY_EMPLOYEE: 'Company Employee',
  BRANDER: 'Brander',
  COHORT_USER: 'Cohort Member',
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}
