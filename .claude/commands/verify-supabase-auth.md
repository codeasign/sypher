---
description: Diagnose the Supabase signup/login/dashboard auth integration
---

# Verify Supabase Auth Integration

Run a full diagnostic of the Supabase auth wiring in this Docusaurus repo. Do not fix
anything automatically — report findings, then wait for explicit approval before editing
any file.

## Checks

**1. Environment**
- Confirm `.env` exists at repo root.
- Confirm it defines `SUPABASE_URL` and `SUPABASE_ANON_KEY` with non-empty values.
- Do not print the actual key/URL values in your report — confirm presence only.
- Confirm `.env` is listed in `.gitignore`.

**2. Dependencies**
- Confirm `package.json` lists `@supabase/supabase-js` in `dependencies`.
- Confirm `node_modules/@supabase/supabase-js` exists (installed, not just declared).

**3. `docusaurus.config.js` wiring**
- Confirm `require('dotenv').config();` is present and executes before the exported
  config object is built.
- Confirm a `customFields` block exists with `supabaseUrl: process.env.SUPABASE_URL`
  and `supabaseAnonKey: process.env.SUPABASE_ANON_KEY`.

**4. Required files exist**
- `src/theme/Root.tsx`
- `src/contexts/AuthContext.tsx`
- `src/components/RequireAuth.tsx`
- `src/pages/signup.tsx`
- `src/pages/login.tsx`
- `src/pages/dashboard.tsx`
- `src/pages/auth.module.css`
- `src/pages/dashboard.module.css`

**5. Static correctness checks**
- `src/theme/Root.tsx` renders `<AuthProvider>{children}</AuthProvider>` — flag if
  `AuthProvider` is missing or `children` isn't passed through.
- `src/contexts/AuthContext.tsx`:
  - Uses `useDocusaurusContext()` to read `customFields`.
  - Guards client creation with `typeof window === 'undefined'` returning `null`.
  - Sets `detectSessionInUrl: true` in the client's `auth` config.
  - Subscribes via `supabase.auth.onAuthStateChange` and unsubscribes in cleanup.
- `src/components/RequireAuth.tsx`:
  - Wraps its inner component in `BrowserOnly`.
  - Redirects to `/login` only after `loading` is `false` and `user` is `null`.
- `src/pages/signup.tsx` and `src/pages/login.tsx`:
  - Form components are rendered inside `BrowserOnly`, not called directly in the
    page's top-level export.
  - `signup.tsx` branches on `data.session` (immediate) vs. no session
    (email-confirmation flow) rather than assuming one path.
- `src/pages/dashboard.tsx` wraps its content in `<RequireAuth>`.

**6. Build-time SSR check**
- Run `npm run build`.
- If the build fails with `window is not defined`, `document is not defined`, or
  similar, identify which file/line triggered it — this means a Supabase or browser
  API call escaped its `BrowserOnly` boundary.
- If the build succeeds, note that explicitly.

**7. Supabase project settings (report only — cannot verify from code)**
- Remind the user to confirm in the Supabase dashboard:
  - Authentication → URL Configuration → Site URL matches their current environment
    (`http://localhost:3000` for local dev).
  - Authentication → Providers → Email is enabled.
  - Whether "Confirm email" is ON or OFF, since it changes expected signup behavior.

## Output Format

```markdown
# Supabase Auth Diagnostic

## Environment
- .env present: YES/NO
- SUPABASE_URL set: YES/NO
- SUPABASE_ANON_KEY set: YES/NO
- .env gitignored: YES/NO

## Dependencies
- @supabase/supabase-js in package.json: YES/NO
- @supabase/supabase-js installed: YES/NO

## Config Wiring
- dotenv loaded before config export: YES/NO
- customFields.supabaseUrl present: YES/NO
- customFields.supabaseAnonKey present: YES/NO

## Required Files
| File | Exists |
|---|---|
| src/theme/Root.tsx | YES/NO |
| src/contexts/AuthContext.tsx | YES/NO |
| src/components/RequireAuth.tsx | YES/NO |
| src/pages/signup.tsx | YES/NO |
| src/pages/login.tsx | YES/NO |
| src/pages/dashboard.tsx | YES/NO |
| src/pages/auth.module.css | YES/NO |
| src/pages/dashboard.module.css | YES/NO |

## Static Correctness Issues
(list each issue found, file + line, with the specific check it failed — empty if none)

## Build Check
- `npm run build`: PASS/FAIL
- If FAIL: exact error, file/line, root cause

## Manual Supabase Dashboard Items to Confirm
- Site URL: ...
- Email provider enabled: ...
- Confirm email setting: ...

## Verdict
READY TO TEST / BLOCKED — [one-line reason if blocked]
```
