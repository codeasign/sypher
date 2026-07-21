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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Redirect against getAppOrigin(), NOT url.origin -- requests arrive
      // through Caddy, so request.url (and url.origin derived from it) is
      // Next's internal http://localhost:PORT, not the public https origin.
      const redirectUrl = new URL(next, getAppOrigin());

      // No client-side way to tell "brand-new account" from "returning
      // login" apart -- both land here the same way. Comparing the auth
      // user's created_at to now (tight window, this request is seconds
      // after account creation for a real signup) is the cheapest reliable
      // signal, carried via query param so AnalyticsSession can fire
      // signup_completed exactly once after redirect and then strip it.
      const createdAt = data.user ? new Date(data.user.created_at).getTime() : 0;
      if (createdAt && Date.now() - createdAt < 30_000) {
        redirectUrl.searchParams.set('_signup', '1');
      }

      return NextResponse.redirect(redirectUrl);
    }
  }

  const loginUrl = new URL('/login', getAppOrigin());
  loginUrl.searchParams.set('error', 'auth_callback_failed');
  return NextResponse.redirect(loginUrl);
}
