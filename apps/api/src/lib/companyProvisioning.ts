import type { User } from '@prisma/client';
import { UserRepository } from '../repositories/UserRepository';
import { createProvisionedUser, issueSetPasswordLink } from './userProvisioning';
import { createLogger } from './logger';

/**
 * Company-scoped wrapper over userProvisioning.ts's primitives. Two entry
 * points:
 *   - Company.adminEmail  → a COMPANY_HR account (AccessController company CRUD)
 *   - CSV roster import   → COMPANY_EMPLOYEE accounts (CompanyAdminController)
 *
 * Adds: linking the account to a Company, refusing to move an account that
 * already belongs to a different company, and using the company name in
 * the set-password email copy.
 */

const logger = createLogger('companyProvisioning');
const userRepository = new UserRepository();

// Re-exported so existing importers keep working; canonical home is
// userProvisioning.ts.
export { createSetPasswordLink, issueSetPasswordLink } from './userProvisioning';

export type ProvisionOutcome =
  | { status: 'created'; user: User }
  | { status: 'linked'; user: User }
  | { status: 'already'; user: User }
  | { status: 'conflict'; email: string; otherCompanyId: string };

async function provision(
  companyId: string,
  companyName: string,
  email: string,
  role: 'COMPANY_HR' | 'COMPANY_EMPLOYEE',
  fullName: string | null,
): Promise<ProvisionOutcome> {
  const normalized = email.trim().toLowerCase();
  const existing = await userRepository.findByEmail(normalized);

  if (!existing) {
    const user = await createProvisionedUser({ email: normalized, fullName, role, companyId }, companyName);
    logger.info(`Provisioned ${role} ${user.id} for company ${companyId}`);
    return { status: 'created', user };
  }

  if (existing.companyId && existing.companyId !== companyId) {
    logger.warn(
      `Cannot provision ${role} for company ${companyId}: ${normalized} already belongs to company ${existing.companyId}`,
    );
    return { status: 'conflict', email: normalized, otherCompanyId: existing.companyId };
  }

  const wasUnaffiliated = existing.companyId === null;
  await userRepository.linkToCompany(existing.id, companyId, role);
  // Only nudge them to set a password if they never had one (fresh
  // link-up); an existing password means they can just sign in.
  if (existing.passwordHash === null) {
    await userRepository.markMustResetPassword(existing.id);
    await issueSetPasswordLink(existing, companyName);
  }
  const fresh = (await userRepository.findById(existing.id)) as User;
  return { status: wasUnaffiliated ? 'linked' : 'already', user: fresh };
}

/** Company.adminEmail → COMPANY_HR. Called on company create/edit. */
export function provisionCompanyAdmin(
  companyId: string,
  adminEmail: string,
  companyName: string,
): Promise<ProvisionOutcome> {
  return provision(companyId, companyName, adminEmail, 'COMPANY_HR', `${companyName} Admin`);
}

/** CSV roster row → COMPANY_EMPLOYEE. */
export function provisionCompanyEmployee(
  companyId: string,
  companyName: string,
  email: string,
  fullName: string | null,
): Promise<ProvisionOutcome> {
  return provision(companyId, companyName, email, 'COMPANY_EMPLOYEE', fullName);
}
