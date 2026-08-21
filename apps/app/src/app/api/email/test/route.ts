import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { getSupabaseAdmin, getUserFromAuthHeader } from '@/lib/supabaseAdmin';
import { sendEmailWithRotation } from '@/lib/email/rotation';
import { getProviderStatus } from '@/lib/email/emailQuota';

export const dynamic = 'force-dynamic';

async function isAdmin(userId: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin().from('profiles').select('role').eq('id', userId).maybeSingle();
  if (error || !data) return false;
  return data.role === 'admin';
}

export async function OPTIONS() {
  return handleCorsPreflight();
}

// Admin-only smoke test for the standalone email rotation system --
// intentionally NOT wired into Supabase Auth's Send Email Hook (that's a
// separate follow-up step; Auth's own mailer is untouched by this route).
// GET returns current quota usage per provider/cap.
export async function GET(req: Request) {
  const corsHeaders = getCorsHeaders() ?? undefined;

  const user = await getUserFromAuthHeader(req);
  if (!user || !(await isAdmin(user.id))) {
    return Response.json({ error: 'Not authorized' }, { status: 403, headers: corsHeaders });
  }

  const [brevo, resend] = await Promise.all([getProviderStatus('brevo'), getProviderStatus('resend')]);
  return Response.json({ brevo, resend }, { status: 200, headers: corsHeaders });
}

interface TestSendBody {
  to?: string;
  subject?: string;
  html?: string;
  simulateFailureFor?: string[];
}

// Sends one email through the real rotation/fallback logic. Pass
// simulateFailureFor: ["brevo"] to verify fallback to Resend (or vice versa)
// without needing to actually break a live vendor account.
export async function POST(req: Request) {
  const corsHeaders = getCorsHeaders() ?? undefined;

  const user = await getUserFromAuthHeader(req);
  if (!user || !(await isAdmin(user.id))) {
    return Response.json({ error: 'Not authorized' }, { status: 403, headers: corsHeaders });
  }

  let body: TestSendBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400, headers: corsHeaders });
  }

  if (typeof body.to !== 'string' || !body.to) {
    return Response.json({ error: 'Missing to' }, { status: 400, headers: corsHeaders });
  }
  const subject = typeof body.subject === 'string' && body.subject ? body.subject : 'Sypher email rotation test';
  const html =
    typeof body.html === 'string' && body.html ? body.html : '<p>Test email from the Sypher email rotation system.</p>';
  const simulateFailureFor = Array.isArray(body.simulateFailureFor)
    ? body.simulateFailureFor.filter((p): p is string => typeof p === 'string')
    : undefined;

  try {
    const result = await sendEmailWithRotation({ to: body.to, subject, html }, { simulateFailureFor });
    return Response.json(result, { status: 200, headers: corsHeaders });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Send failed' }, { status: 502, headers: corsHeaders });
  }
}
