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
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }
}
