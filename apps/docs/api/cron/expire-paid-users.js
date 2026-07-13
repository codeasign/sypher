import { applyCors } from '../_lib/cors.js';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const admin = getSupabaseAdmin();

  // Single statement, no read-then-write: re-evaluates paid_until against
  // the live row at lock time, so a same-day renewal committing just
  // before or after this can't be clobbered (see SupabaseSchema.md /
  // extend_paid_until for the other half of this race-safety argument).
  const { data, error } = await admin
    .from('profiles')
    .update({ role: 'free_users' })
    .eq('role', 'paid_users')
    .lt('paid_until', new Date().toISOString())
    .select('id');

  await admin.from('cron_runs').insert({
    job_name: 'expire-paid-users',
    rows_affected: data?.length ?? null,
    success: !error,
    error: error?.message ?? null,
  });

  if (error) {
    res.status(500).json({ error: 'Cron job failed' });
    return;
  }
  res.status(200).json({ ok: true, rowsAffected: data.length });
}
