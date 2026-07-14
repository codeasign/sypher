import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { AUTH_COOKIE_OPTIONS } from '@sypher/auth-core/src/cookieConfig';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: AUTH_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component render — proxy.ts refreshes the
            // session cookie on the next request instead.
          }
        },
      },
    }
  );
}
