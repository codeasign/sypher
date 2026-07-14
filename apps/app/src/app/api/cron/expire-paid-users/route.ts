import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(req: Request) {
  const corsHeaders = getCorsHeaders() ?? undefined;

  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
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
    return Response.json({ error: 'Cron job failed' }, { status: 500, headers: corsHeaders });
  }
  return Response.json({ ok: true, rowsAffected: data.length }, { status: 200, headers: corsHeaders });
}
