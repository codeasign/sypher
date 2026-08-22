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

/** Admin can manage any company; Company HR can only manage their own. */
export function requireAdminOrOwnCompanyHr(user: User, companyId: string): void {
  if (user.role === 'ADMIN') return;
  if (user.role === 'COMPANY_HR' && user.companyId === companyId) return;
  throw new ForbiddenError('Admin or Company HR (for their own company) access required');
}
