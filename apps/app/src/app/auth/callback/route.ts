import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSafeRedirect } from '@/utils/safeRedirect';
import { getAppOrigin } from '@sypher/auth-core/src/urls';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = getSafeRedirect(url.searchParams.get('next') ?? url.searchParams.get('returnTo'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Redirect against getAppOrigin(), NOT url.origin -- requests arrive
      // through Caddy, so request.url (and url.origin derived from it) is
      // Next's internal http://localhost:PORT, not the public https origin.
      return NextResponse.redirect(new URL(next, getAppOrigin()));
    }
  }

  const loginUrl = new URL('/login', getAppOrigin());
  loginUrl.searchParams.set('error', 'auth_callback_failed');
  return NextResponse.redirect(loginUrl);
}
