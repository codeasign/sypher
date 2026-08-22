import type { Role } from '@prisma/client';

/**
 * Ported 1:1 from the old system's packages/course-catalog/src/courseAccess.js
 * (hasCourseAccess) and apps/app/src/data/navAccess.js (canSeeNavItem) — same
 * semantics, just typed against the Role enum instead of role strings.
 */

export interface CompanyAccessContext {
  companyAllowedSlugs?: Set<string>;
  slug?: string;
}

export function hasCourseAccess(role: Role | null, allowedRoles: Role[], ctx?: CompanyAccessContext): boolean {
  if (role === 'ADMIN') return true;
  if (role === null) return allowedRoles.includes('FREE_USER');
  if (allowedRoles.includes(role)) return true;
  if (role === 'COMPANY_EMPLOYEE' && ctx?.companyAllowedSlugs && ctx.slug) {
    return ctx.companyAllowedSlugs.has(ctx.slug);
  }
  return false;
}

export interface CompanyNavContext {
  companyAllowedItemKeys?: Set<string>;
  itemKey?: string;
}

export function canSeeNavItem(role: Role | null, allowedRoles: Role[], ctx?: CompanyNavContext): boolean {
  if (role === 'ADMIN') return true;
  if (role !== null && allowedRoles.includes(role)) return true;
  if (role === 'COMPANY_EMPLOYEE' && ctx?.companyAllowedItemKeys && ctx.itemKey) {
    return ctx.companyAllowedItemKeys.has(ctx.itemKey);
  }
  return false;
}
