# Current Task Handoff

## Objective
Add Google reCAPTCHA v2 checkbox bot protection to Sign In, Sign Up, and Contact
on https://next.sypher.local.

## Status
Complete and verified by the user. Committed as `1b159734`.

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
- User checked the Sign In, Sign Up, and Contact flows after deployment.

## Decisions
- Use v2 checkbox as selected by user.
- Keep the reCAPTCHA secret server-side in apps/api environment configuration.
- Do not hardcode site keys, secrets, or bypass tokens.
- No schema, RLS, or database changes.

## Known Issues
- Previous tasks: ESLint 9 flat config missing; Next build worker spawn EPERM.

## Tests/Validation
- npm run build --workspace apps/api: passed (including tsoa generation).
- npx tsc --noEmit -p apps/web/tsconfig.json: passed.
- Direct verifier test with RECAPTCHA_REQUIRED=true and no secret returned false
  for both missing and supplied test tokens (fail-closed).
- User verified the rendered checkbox and protected submissions on all three
  flows after configuring the Google site key and API secret.
- git diff --check passed before this handoff update.
- No credentials, database rows, schema, RLS, or authorization policy files
  changed.

## Files Modified
- None; implementation files are committed in `1b159734`.
- memory-bank/current-task.md is updated by this handoff checkpoint.

## Next Action
Await the next task. Do not change the completed reCAPTCHA integration unless a
new issue is reported.

## Last Updated
2026-09-05
