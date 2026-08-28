import type { User } from '@prisma/client';
import { HttpError } from './errors';

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

export function requireAdmin(user: User): void {
  if (user.role !== 'ADMIN') throw new ForbiddenError('Admin access required');
}

/**
 * The corporate portal's own admin. A COMPANY_HR account tied to a company
 * (companyId set). Sypher's own ADMIN is intentionally NOT accepted here —
 * ADMIN has no companyId, so there's no company to scope to, and Sypher
 * staff manage companies from the main /admin/access console instead.
 * Every company-admin endpoint derives its companyId from `user.companyId`,
 * never from a path or body, so this guard is the whole tenancy boundary.
 */
export function requireCompanyAdmin(user: User): string {
  if (user.role !== 'COMPANY_HR' || !user.companyId) {
    throw new ForbiddenError('Company administrator access required');
  }
  return user.companyId;
}
