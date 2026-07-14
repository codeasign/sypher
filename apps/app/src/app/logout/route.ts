import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAppOrigin } from '@sypher/auth-core/src/urls';

export async function GET() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // getAppOrigin(), not request.url -- requests arrive through Caddy, so
  // request.url is Next's internal http://localhost:PORT, not the public origin.
  return NextResponse.redirect(new URL('/login', getAppOrigin()));
}
