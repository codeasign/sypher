import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { getUserFromAuthHeader } from '@/lib/supabaseAdmin';
import { isPaidAndActive, getMonthlyStatus } from '@/lib/judge0MonthlyLimit';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return handleCorsPreflight();
}

// Read-only status for CoreEditor's "N calls left this month" badge --
// calls the exact same judge0_monthly_status RPC that batch/route.ts and
// custom/route.ts use to enforce the limit, so the displayed number can
// never diverge from what's actually enforced.
export async function GET(req: Request) {
  const corsHeaders = getCorsHeaders() ?? undefined;

  const user = await getUserFromAuthHeader(req);
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401, headers: corsHeaders });
  }

  if (!(await isPaidAndActive(user.id))) {
    return Response.json({ isPaid: false }, { status: 200, headers: corsHeaders });
  }

  const status = await getMonthlyStatus(user.id);
  if (!status) {
    // JUDGE0_MONTHLY_LIMIT_PAID missing/invalid -- fail open, same as the
    // enforcement paths. No number to show, so the frontend hides the badge.
    return Response.json({ isPaid: true, limit: null, remaining: null, resetsAt: null }, { status: 200, headers: corsHeaders });
  }

  return Response.json(
    { isPaid: true, limit: status.limit, remaining: status.remaining, resetsAt: status.resetsAt },
    { status: 200, headers: corsHeaders }
  );
}
