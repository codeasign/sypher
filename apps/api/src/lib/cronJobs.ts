import cron from 'node-cron';
import { prisma } from './prisma';
import { createLogger } from './logger';

const logger = createLogger('cron');

// Ported from apps/app's api/cron/expire-paid-users, restructured to run
// in-process instead of being triggered by an external scheduler. The old
// version needed Vercel Cron (+ a CRON_SECRET bearer header) because it was
// a stateless serverless function with no way to wake itself up. apps/api
// is already a long-running Express process, so node-cron replaces that
// entire dependency rather than finding a substitute hosting-platform cron
// feature — nothing external calls this anymore.
//
// Correct only for a single always-on instance: confirmed 2026-08-22 that
// this is fine for now (hosting/deployment research is still ongoing
// separately). If apps/api later moves to multiple replicas this would
// fire once per replica — harmless (the UPDATE below is a single atomic
// statement, safe to run twice) but wasteful. Revisit with a Postgres
// advisory lock or an external scheduler only if horizontal scaling is
// actually adopted, not before.
async function expirePaidUsers(): Promise<void> {
  let rowsAffected: number | null = null;
  let error: string | null = null;

  try {
    // Single statement, no read-then-write: re-evaluates paidUntil against
    // the live row at lock time, so a same-day renewal committing just
    // before or after this can't be clobbered — same race-safety argument
    // as finalizePayment.ts's extend_paid_until update.
    const result = await prisma.$executeRaw`
      UPDATE "User"
      SET "role" = 'FREE_USER'
      WHERE "role" = 'PAID_USER' AND "paidUntil" < NOW()
    `;
    rowsAffected = result;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    logger.error('expire-paid-users cron failed', err);
  }

  await prisma.cronRun.create({
    data: { jobName: 'expire-paid-users', rowsAffected, success: error === null, error },
  });

  if (error === null) {
    logger.info(`expire-paid-users: ${rowsAffected} row(s) expired`);
  }
}

export function startCronJobs(): void {
  // Matches the old Vercel Cron schedule ("0 3 * * *" — daily at 03:00
  // server time).
  cron.schedule('0 3 * * *', () => {
    void expirePaidUsers();
  });
  logger.info('Cron jobs scheduled (expire-paid-users: daily at 03:00)');
}

// Exported for manual/verification runs — not called by startCronJobs().
export { expirePaidUsers };
