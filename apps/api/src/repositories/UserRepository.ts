import { randomBytes } from 'crypto';
import { prisma } from '../lib/prisma';
import { HttpError } from '../lib/errors';
import { Prisma } from '@prisma/client';
import type { AuthProvider, Role, User } from '@prisma/client';

// Username handle rules (spec §11): lowercase [a-z0-9_], 3–20 chars.
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

// Bounded retry loop for collision suffixes; past this we fall back to a
// random tail rather than looping forever on a degenerate/attacked base.
const USERNAME_MAX_SUFFIX_ATTEMPTS = 50;

/**
 * Deterministic base handle derived from an email local-part — the exact
 * mirror of the backfill SQL in the comment-system migration:
 * lowercase, stripped to [a-z0-9_], clamped to <= 20 chars, padded with a
 * 'user' prefix when shorter than 3, empty becomes 'user'.
 */
export function buildUsernameBase(email: string): string {
  const raw = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (raw.length === 0) return 'user';
  const clamped = raw.slice(0, USERNAME_MAX_LENGTH);
  if (clamped.length < USERNAME_MIN_LENGTH) {
    return ('user' + clamped).slice(0, USERNAME_MAX_LENGTH);
  }
  return clamped;
}

function suffixUsername(base: string, attempt: number): string {
  // attempt starts at 2 ("andrewsmith2"); truncation reserves room for the
  // digits so the result never exceeds the max length — same rule as the
  // migration's `left(base, 20 - length(rn)) || rn`.
  const suffix = String(attempt);
  return base.slice(0, USERNAME_MAX_LENGTH - suffix.length) + suffix;
}

function isUniqueUsernameViolation(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return false;
  const target = error.meta?.target;
  return Array.isArray(target) && (target as string[]).includes('username');
}

export interface CreateUserInput {
  email: string;
  passwordHash: string | null;
  fullName: string | null;
  provider: AuthProvider;
  role?: Role;
  /** Corporate-portal onboarding links the new account to a company up front. */
  companyId?: string;
  /** Provisioned accounts: true → first sign-in must go through set-password. */
  mustResetPassword?: boolean;
}

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  /**
   * Auto-generates a unique username at signup so @mentions work with no
   * setup step (spec §11): deterministic base from the email local-part,
   * numeric suffix (2, 3, ...) on collisions. Covers every user-creation
   * path that funnels through here (email register AND Google OAuth);
   * seed.ts upserts pass usernames explicitly and is the only writer
   * outside this method.
   */
  async create(input: CreateUserInput): Promise<User> {
    const data = {
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      fullName: input.fullName,
      provider: input.provider,
      role: input.role,
      companyId: input.companyId,
      mustResetPassword: input.mustResetPassword ?? false,
    };
    const base = buildUsernameBase(input.email);

    for (let attempt = 1; attempt <= USERNAME_MAX_SUFFIX_ATTEMPTS; attempt++) {
      const username = attempt === 1 ? base : suffixUsername(base, attempt);
      try {
        return await prisma.user.create({ data: { ...data, username } });
      } catch (error) {
        if (!isUniqueUsernameViolation(error)) throw error;
      }
    }
    // Degenerate base under sustained collision — random tail settles it.
    return prisma.user.create({
      data: {
        ...data,
        username: `${base.slice(0, USERNAME_MAX_LENGTH - 9)}_${randomBytes(4).toString('hex')}`,
      },
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { username: username.toLowerCase() } });
  }

  /**
   * Sets a user-chosen handle. The DB unique index is the source of truth
   * (check-then-set in the controller has a race window); a losing race
   * surfaces as a clean 409 instead of an unhandled P2002.
   */
  async setUsername(userId: string, username: string): Promise<void> {
    try {
      await prisma.user.update({ where: { id: userId }, data: { username: username.toLowerCase() } });
    } catch (error) {
      if (isUniqueUsernameViolation(error)) {
        throw new HttpError(409, 'That username is already taken');
      }
      throw error;
    }
  }

  /** Profile-settings avatar change — preset path or Bunny URL, validated
   * by the caller (see lib/avatar.ts). */
  async setAvatarUrl(userId: string, avatarUrl: string): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
  }

  /** Profile-settings About/bio change — null clears it. */
  async setBio(userId: string, bio: string | null): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { bio } });
  }

  /**
   * Completes first-login onboarding in one write: handle + avatar + the
   * two acceptance timestamps. Same unique-username race handling as
   * setUsername.
   */
  async completeOnboarding(userId: string, username: string, avatarUrl: string): Promise<User> {
    try {
      return await prisma.user.update({
        where: { id: userId },
        data: {
          username: username.toLowerCase(),
          avatarUrl,
          onboardedAt: new Date(),
          legalAcceptedAt: new Date(),
        },
      });
    } catch (error) {
      if (isUniqueUsernameViolation(error)) {
        throw new HttpError(409, 'That handle is already taken.');
      }
      throw error;
    }
  }

  /**
   * Mention autocomplete candidates (spec §11): case-insensitive prefix
   * match on the handle — the disambiguation between two identical display
   * names happens visually in the dropdown (username + fullName), never by
   * fuzzy-matching display names server-side.
   */
  async searchMentionCandidates(prefix: string, limit = 8): Promise<{ id: string; username: string; fullName: string | null }[]> {
    return prisma.user.findMany({
      where: {
        deletedAt: null,
        username: { startsWith: prefix.toLowerCase(), mode: 'insensitive' },
      },
      orderBy: { username: 'asc' },
      take: limit,
      select: { id: true, username: true, fullName: true },
    });
  }

  async setPasswordHash(userId: string, passwordHash: string): Promise<void> {
    // Setting a password always clears the "must reset on first login" flag —
    // this is the one place a provisioned account becomes a normal one.
    await prisma.user.update({ where: { id: userId }, data: { passwordHash, mustResetPassword: false } });
  }

  /**
   * Admin lookup for the access page's User Role tab — case-insensitive
   * contains across email/full name/handle, server-side paginated.
   * An empty term falls back to most-recent signups (the pager then walks
   * back through signup history); a search orders by email alphabetically.
   */
  async searchUsersPage(term: string, skip: number, take: number): Promise<{ items: User[]; total: number }> {
    if (!term) {
      const [items, total] = await prisma.$transaction([
        prisma.user.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, skip, take }),
        prisma.user.count({ where: { deletedAt: null } }),
      ]);
      return { items, total };
    }
    const where = {
      deletedAt: null,
      OR: [
        { email: { contains: term, mode: 'insensitive' as const } },
        { fullName: { contains: term, mode: 'insensitive' as const } },
        { username: { contains: term, mode: 'insensitive' as const } },
      ],
    };
    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({ where, orderBy: { email: 'asc' }, skip, take }),
      prisma.user.count({ where }),
    ]);
    return { items, total };
  }

  /** Role assignment is admin-only at the controller; DB enforces the enum. */
  async setRole(userId: string, role: Role): Promise<void> {
    try {
      await prisma.user.update({ where: { id: userId }, data: { role } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new HttpError(404, 'User not found');
      }
      throw error;
    }
  }

  /**
   * Link an existing account to a company (corporate onboarding). `role`
   * is set too when given — never downgrades a COMPANY_HR to
   * COMPANY_EMPLOYEE (the CSV importer passes 'COMPANY_EMPLOYEE' for
   * everyone; an existing company admin keeps their role).
   */
  async linkToCompany(userId: string, companyId: string, role?: Role): Promise<void> {
    const current = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const nextRole =
      role && !(role === 'COMPANY_EMPLOYEE' && current?.role === 'COMPANY_HR') ? role : undefined;
    await prisma.user.update({
      where: { id: userId },
      data: { companyId, ...(nextRole ? { role: nextRole } : {}) },
    });
  }

  async markMustResetPassword(userId: string): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { mustResetPassword: true } });
  }

  async companyIdOf(userId: string): Promise<string | null> {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
    return u?.companyId ?? null;
  }

  /**
   * Sever a company link (employee removed on the corporate portal).
   * Only touches the row when companyId currently matches `companyId` —
   * so one company's admin can't detach a user who has since moved to
   * another company. A COMPANY_EMPLOYEE drops back to FREE_USER;
   * COMPANY_HR is left alone (that's an admin, handled elsewhere).
   */
  async unlinkFromCompany(userId: string, companyId: string): Promise<void> {
    await prisma.user.updateMany({
      where: { id: userId, companyId, role: 'COMPANY_EMPLOYEE' },
      data: { companyId: null, role: 'FREE_USER' },
    });
    // If they weren't a COMPANY_EMPLOYEE (edge: manually-set role), still
    // clear the link for this company.
    await prisma.user.updateMany({ where: { id: userId, companyId }, data: { companyId: null } });
  }
}
