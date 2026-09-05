# Current Task Handoff

## Objective
Add Google reCAPTCHA v2 checkbox bot protection to Sign In, Sign Up, and Contact
on https://next.sypher.local.

## Status
Complete. Original integration is committed as 1b159734. The nullable-token
compatibility fix is staged and ready for the user's commit.

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
- Production requires verification by default; local development is opt-in.
- Fixed Tsoa validation rejecting recaptchaToken: null by making login,
  register, contact DTOs and verifier input explicitly nullable.
- User's exact payload now returns HTTP 200 and authenticates on the local API.
- User confirmed this task is completed.
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
- npm run build --workspace apps/api: passed after nullable DTO fix.
- npx tsc --noEmit -p apps/web/tsconfig.json: passed before this follow-up;
  no web files changed by the fix.
- Direct verifier test with RECAPTCHA_REQUIRED=true and no secret failed closed.
- Exact payload {email,password,recaptchaToken:null} returned HTTP 200 locally.
- git diff --check passed.
- No credentials, database rows, schema, RLS, or authorization policy files
  changed.

## Files Modified
Committed in 1b159734:
- apps/api/.env.example
- apps/api/src/controllers/AuthController.ts (base integration)
- apps/api/src/controllers/ContactController.ts (base integration)
- apps/api/src/lib/env.ts
- apps/api/src/lib/recaptcha.ts (base integration)
- apps/web/.env.example
- apps/web/src/app/login/page.tsx
- apps/web/src/app/login/styles.module.css
- apps/web/src/app/contact/ContactForm.tsx
- apps/web/src/components/RecaptchaV2.tsx
- apps/web/src/components/RecaptchaV2.module.css
Staged follow-up:
- apps/api/src/controllers/AuthController.ts (nullable DTO fields)
- apps/api/src/controllers/ContactController.ts (nullable DTO field)
- apps/api/src/lib/recaptcha.ts (nullable verifier input)
- memory-bank/current-task.md (handoff update)

## Next Action
User commits the staged nullable-token compatibility fix. Then await the next
task; do not alter the completed reCAPTCHA integration unless a new issue is
reported.

## Last Updated
2026-09-05
