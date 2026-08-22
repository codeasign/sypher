/**
 * One muted, professional accent color per role — deliberately not
 * randomized per render (that would make the UI feel inconsistent/broken
 * across reloads). Dark/desaturated tones only, no neon or bright
 * saturated colors, so the accent reads as a label, not decoration.
 */
export const ROLE_COLORS: Record<string, string> = {
  ADMIN: '#475569', // slate
  FREE_USER: '#0891b2', // muted cyan
  PAID_USER: '#7c3aed', // muted violet
  INTERNAL_HR: '#b45309', // muted amber
  COMPANY_HR: '#be185d', // muted rose
  COMPANY_EMPLOYEE: '#15803d', // muted green
  BRANDER: '#4338ca', // muted indigo
  COHORT_USER: '#0f766e', // muted teal
};

export function roleColor(role: string): string {
  return ROLE_COLORS[role] ?? '#64748b';
}
