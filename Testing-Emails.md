# Testing Emails

How to preview and test-send Sypher's transactional email templates.

## Templates

All 4 wired templates live in `apps/api/src/lib/emailTemplates.ts`, sent via
the wrapper functions in `apps/api/src/lib/email.ts`:

| Template | Function | Fires when |
|---|---|---|
| Welcome | `welcomeEmailHtml` | Self-serve signup — account already has a password |
| Set Password | `setPasswordEmailHtml` | Admin-provisioned or corporate-onboarded account with no password yet |
| Password Reset | `passwordResetEmailHtml` | Forgot-password flow |
| Cohort Welcome | `cohortWelcomeEmailHtml` | User added to a cohort roster |

(`sendContactNotification` in `email.ts` is a stub — logs to console, not a
real template.)

Delivery goes through `sendEmailWithRotation` (`apps/api/src/lib/emailRotation/rotation.ts`):
- `EMAIL_TRANSPORT=smtp` (local dev default) → local GreenMail/Mailpit container only
- Anything else → Brevo first, then Resend, in that priority order

## Preview templates as static HTML

```
cd apps/api
npx tsx scripts/build-email-previews.ts
```

Renders all 4 templates straight from the real template functions (no
hand-copied markup, so previews never drift) into `apps/api/email-templates/`.
Open any `.html` file directly in a browser. Re-run after editing
`emailTemplates.ts`.

## Send real test emails

```
cd apps/api
npx tsx scripts/send-test-emails.ts [to-address]
```

Defaults to `forcloudread@gmail.com` if no address is given. Forces the
transport to `brevo` for that run only (your `.env`'s `EMAIL_TRANSPORT=smtp`
is left untouched) so it actually hits a real inbox via Brevo/Resend rotation
instead of the local dev SMTP container.

Requires `BREVO_API_KEY` / `BREVO_SENDER_EMAIL` (and/or `RESEND_API_KEY` /
`RESEND_SENDER_EMAIL`) set in `apps/api/.env`.

## Provider keys

| Var | Purpose |
|---|---|
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_DAILY_LIMIT` | Brevo provider |
| `RESEND_API_KEY`, `RESEND_SENDER_EMAIL`, `RESEND_DAILY_LIMIT`, `RESEND_MONTHLY_LIMIT` | Resend provider (fallback) |

See `Email-Hookup.md` at repo root for the full wiring reference.

## Sender display name ("Sypher Next")

All three providers now send with the display name **"Sypher Next"**:

- **SMTP** — set via `SMTP_FROM` (`apps/api/.env`), defaults to
  `Sypher Next <no-reply@sypher.local>` in `apps/api/src/lib/env.ts` if unset.
- **Resend** — hardcoded in `apps/api/src/lib/emailRotation/providers/resend.ts`
  as `from: \`Sypher Next <${senderEmail}>\``. Resend has no dashboard/account
  setting for this — the display name only exists if the API call includes it,
  so this must stay in code.
- **Brevo** — set in the **Brevo dashboard**, not code (code only sends
  `sender: { email: senderEmail }`, no name field):
  1. Log into Brevo → **Settings** (gear icon, top right) → **Senders, Domains
     & Dedicated IPs**
  2. **Senders** tab → find your sender email (must match `BREVO_SENDER_EMAIL`
     in `.env`)
  3. **⋮** menu → **Edit** → set **"From Name"** to `Sypher Next` → Save
  4. Applies automatically to every send from that verified address — no code
     change needed on the Brevo side.
