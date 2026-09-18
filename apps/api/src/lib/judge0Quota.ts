import { prisma } from './prisma';

// Flat monthly cap on Judge0 calls, applied to every user regardless of
// role/plan (2026-09-17 decision — simpler and cheaper than apps/app's
// paid-only gate, since RapidAPI billing is per-call for everyone here).
// Counted by row (Judge0MonthlySubmission), not a running counter column,
// so "used this calendar month" is a plain date-range query — no cron
// needed to zero anything out.
export const JUDGE0_MONTHLY_LIMIT = 100;

export interface MonthlyUsage {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
}

function startOfNextMonth(from: Date): Date {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
}

function startOfCurrentMonth(from: Date): Date {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
}

export async function getMonthlyStatus(userId: string): Promise<MonthlyUsage> {
  const now = new Date();
  const windowStart = startOfCurrentMonth(now);
  const used = await prisma.judge0MonthlySubmission.count({
    where: { userId, createdAt: { gte: windowStart } },
  });
  return {
    limit: JUDGE0_MONTHLY_LIMIT,
    used,
    remaining: Math.max(0, JUDGE0_MONTHLY_LIMIT - used),
    resetsAt: startOfNextMonth(now).toISOString(),
  };
}

// Called only after a real Judge0 verdict is confirmed — never before the
// call, never for an infra-failure result. Never throws — a logging
// failure here shouldn't fail the user's already-completed request.
export async function recordMonthlySubmission(userId: string): Promise<void> {
  try {
    await prisma.judge0MonthlySubmission.create({ data: { userId } });
  } catch (err) {
    console.error('Failed to record monthly Judge0 submission:', err instanceof Error ? err.message : err);
  }
}
