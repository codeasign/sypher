import { redirect } from 'next/navigation';

// Sign up and sign in are unified into a single page/toggle now
// (apps/web/src/app/login/page.tsx) — this route stays only so any
// existing links to /register keep working.
export default function RegisterRedirectPage(): never {
  redirect('/login?mode=signup');
}
