import type { Role, User } from '@prisma/client';
import { UserRepository } from '../repositories/UserRepository';
import { PasswordResetTokenRepository } from '../repositories/PasswordResetTokenRepository';
import { generateResetToken, hashToken } from './session';
import { sendSetPasswordEmail } from './email';
import { env } from './env';
import { createLogger } from './logger';

/**
 * Shared plumbing for creating a user account *for* someone (never
 * self-serve signup): admin User Role tab, corporate onboarding, cohort
 * add-by-email. Every such account is created WITHOUT a password, flagged
 * `mustResetPassword`, and emailed a welcome + set-password link (the
 * forgot-password token machinery). First sign-in goes through that link
 * (or the /set-password screen). See Email-Hookup.md.
 *
 * Company-specific wrapping (link a user to a Company, conflict handling)
 * lives in companyProvisioning.ts, which builds on the primitives here.
 *
 * NOTE: the set-password link points at the MAIN app
 * `${env.frontendUrl}/reset-password` — there is no /corporate variant yet.
 */

const logger = createLogger('userProvisioning');
const userRepository = new UserRepository();
const resetTokenRepository = new PasswordResetTokenRepository();

const SET_PASSWORD_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — onboarding, not a security reset

/** Mint a one-time set-password token and return the link. Sends no email. */
export async function createSetPasswordLink(userId: string): Promise<string> {
  const rawToken = generateResetToken();
  await resetTokenRepository.create(userId, hashToken(rawToken), new Date(Date.now() + SET_PASSWORD_TTL_MS));
  return `${env.frontendUrl}/reset-password?token=${rawToken}`;
}

/**
 * Mint a set-password token and email a combined welcome + set-password
 * message. Fire-and-forget send. `orgLabel` is a company name for a
 * corporate hire (used in the copy), "Sypher" otherwise.
 */
export async function issueSetPasswordLink(
  user: Pick<User, 'id' | 'email' | 'fullName'>,
  orgLabel = 'Sypher',
): Promise<void> {
  const link = await createSetPasswordLink(user.id);
  void sendSetPasswordEmail(user.email, user.fullName, link, orgLabel);
}

interface ProvisionInput {
  email: string;
  fullName?: string | null;
  role?: Role;
  companyId?: string;
}

/** Create a brand-new passwordless account + flag + welcome/set-password email. */
export async function createProvisionedUser(input: ProvisionInput, orgLabel = 'Sypher'): Promise<User> {
  const user = await userRepository.create({
    email: input.email.trim().toLowerCase(),
    passwordHash: null,
    fullName: input.fullName ?? null,
    provider: 'EMAIL',
    role: input.role,
    companyId: input.companyId,
    mustResetPassword: true,
  });
  await issueSetPasswordLink(user, orgLabel);
  logger.info(`Provisioned user ${user.id} (${user.email})`);
  return user;
}

/**
 * Find-or-create by email for the "add a person by email" surfaces
 * (cohort roster/managers, and anywhere else that isn't company-scoped —
 * for that use companyProvisioning). A brand-new account is provisioned
 * (passwordless + flag + email). An EXISTING passwordless account (added
 * elsewhere, link never followed) is re-nudged with a fresh link. An
 * existing normal account is returned untouched. `role` is only applied
 * when creating — never downgrades an existing account.
 */
export async function ensureUserByEmail(
  email: string,
  opts: { fullName?: string | null; role?: Role } = {},
): Promise<{ user: User; created: boolean }> {
  const normalized = email.trim().toLowerCase();
  const existing = await userRepository.findByEmail(normalized);
  if (!existing) {
    const user = await createProvisionedUser({ email: normalized, fullName: opts.fullName, role: opts.role });
    return { user, created: true };
  }
  if (existing.passwordHash === null && existing.deletedAt === null) {
    await userRepository.markMustResetPassword(existing.id);
    await issueSetPasswordLink(existing);
  }
  return { user: existing, created: false };
}
