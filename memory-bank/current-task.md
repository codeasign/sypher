# Current Task Handoff

## Objective
Add Google reCAPTCHA v2 checkbox bot protection to Sign In, Sign Up, and Contact
on https://next.sypher.local.

## Status
Implementation complete and ready for review. No commit made.

## Completed
- Confirmed Sign In and Sign Up share apps/web/src/app/login/page.tsx;
  /register redirects to signup mode.
- Added reusable apps/web/src/components/RecaptchaV2.tsx with explicit checkbox
  rendering, token expiry, load-error, and reset handling.
- Added the widget to the shared login/signup form and to /contact.
- Added recaptchaToken to email login, register, and contact requests.
- Added API-side verification through Google's siteverify endpoint before
  authentication, account creation, or contact persistence/notification.
- Preserved the contact honeypot's fake-success behavior for filled botcheck.
- Production requires verification by default, even if RECAPTCHA_REQUIRED=false;
  local development remains backward-compatible until RECAPTCHA_REQUIRED=true
  and a server secret are configured.
- Added API and web environment examples without secrets.
- Google OAuth and corporate login remain outside this requested scope.

## Decisions
- Use v2 checkbox as selected by user.
- Keep the reCAPTCHA secret server-side in apps/api environment configuration.
- Do not hardcode site keys, secrets, or bypass tokens.
- No schema, RLS, or database changes.

## Known Issues
- No site key or secret is configured in the current local env, so the checkbox
  is not rendered locally until NEXT_PUBLIC_RECAPTCHA_SITE_KEY is supplied.
- Real Google token success/failure cannot be exercised without matching Google
  keys and a registered domain.
- Previous tasks: ESLint 9 flat config missing; Next build worker spawn EPERM.

## Tests/Validation
- npm run build --workspace apps/api: passed (including tsoa generation).
- npx tsc --noEmit -p apps/web/tsconfig.json: passed.
- Direct verifier test with RECAPTCHA_REQUIRED=true and no secret returned false
  for both missing and supplied test tokens (fail-closed).
- git diff --check passed before this handoff update.
- No credentials, database rows, schema, RLS, or authorization policy files
  changed.

## Files Modified
- apps/api/.env.example
- apps/api/src/controllers/AuthController.ts
- apps/api/src/controllers/ContactController.ts
- apps/api/src/lib/env.ts
- apps/api/src/lib/recaptcha.ts
- apps/web/.env.example
- apps/web/src/app/login/page.tsx
- apps/web/src/app/login/styles.module.css
- apps/web/src/app/contact/ContactForm.tsx
- apps/web/src/components/RecaptchaV2.tsx
- apps/web/src/components/RecaptchaV2.module.css
- memory-bank/current-task.md

## Next Action
User configures NEXT_PUBLIC_RECAPTCHA_SITE_KEY in the web environment and
RECAPTCHA_SECRET_KEY plus RECAPTCHA_REQUIRED=true in the API environment for
the Google reCAPTCHA site/domain, restarts API/web servers, and reviews the
uncommitted diff. Do not commit automatically.

## Last Updated
2026-09-05
