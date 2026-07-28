import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

// Node 20's serverless runtime has no native WebSocket global, which
// @supabase/supabase-js needs to construct its Realtime client even though
// these functions never subscribe to anything. Supabase's own documented
// fix is to hand it the `ws` package explicitly (already a dependency).
const REALTIME_OPTS = { realtime: { transport: ws as unknown as typeof WebSocket } };

// The one place a service-role client is constructed. Bypasses RLS — used
// by app/api/razorpay/* and app/api/cron/* for trusted writes the anon key
// can't perform, and by data/coursesCached.ts to read gated course content
// server-side (the per-request can_access_authored_course check, not RLS,
// is what actually gates it — see coursesCached.ts).
export function getSupabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
    ...REALTIME_OPTS,
  });
}

// Anon-key client — for reads that are already public under RLS
// (`using (true)`), e.g. the taxonomy catalog. No service-role bypass.
export function getSupabaseAnon() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, REALTIME_OPTS);
}

// Verifies a caller's Supabase JWT using the anon client and returns the
// authenticated user, or null if missing/invalid.
export async function getUserFromAuthHeader(req: Request) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  if (!token) return null;

  const anon = getSupabaseAnon();
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
