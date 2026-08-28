# Email Hookup

How transactional email works in `apps/api`, every template, where each one
is triggered, and how to turn real delivery on.

> Testing-oriented quick reference (accounts + email recipes):
> **`Testing-Accounts-and-Emailers.md`**.

---

## 1. Architecture

```
flow code  →  send*Email(...)          apps/api/src/lib/email.ts
           →  *EmailHtml(...)          apps/api/src/lib/emailTemplates.ts   (inline-HTML templates)
           →  sendEmailWithRotation()  apps/api/src/lib/emailRotation/rotation.ts
                 → Brevo, then Resend  apps/api/src/lib/emailRotation/providers/*.ts
                   (or ONLY smtp.ts when EMAIL_TRANSPORT=smtp — see §5)
                 → quota check + record apps/api/src/lib/emailRotation/quota.ts  (EmailSend table)
```

- **Best-effort, fire-and-forget.** Every `send*Email` in `email.ts` wraps
  the send in try/catch and only logs on failure. Callers use
  `void send*Email(...)` — a delivery failure never fails the request. By
  the time a send runs, the thing it announces (account, reset token,
  membership) is already committed.
- **No keys configured?** `sendEmailWithRotation` throws
  `All email providers failed or are over quota: …`, which the `send()`
  helper catches and logs at `error`. Nothing else breaks. This is the
  default in local dev.
- **Provider rotation.** Brevo is tried first, then Resend. A provider
  that's over its configured quota or returns an error is skipped and the
  next is tried. Adding a third provider = one file in
  `emailRotation/providers/` + one line in `rotation.ts`.
- **Quota.** Free-tier caps are counted from rows in the `EmailSend` table
  (no stored counter, no reset job). Brevo: daily. Resend: daily **and**
  monthly. All limits come from env vars (below).

---

## 2. Templates

All in `apps/api/src/lib/emailTemplates.ts` — table-based inline HTML, one
shared `shell()` (coloured canvas → white card → brand header → footer),
plus `button()` and a hidden `preheader()` preview line.

| Template fn | Subject | Sent by |
| --- | --- | --- |
| `welcomeEmailHtml(fullName, dashboardUrl)` | *Welcome to Sypher* | `sendWelcomeEmail` |
| `setPasswordEmailHtml(fullName, link, orgLabel)` | *Set your Sypher password* / *Set your password — {org} on Sypher* | `sendSetPasswordEmail` |
| `passwordResetEmailHtml(resetLink)` | *Reset your Sypher password* | `sendPasswordResetEmail` |
| `cohortWelcomeEmailHtml(fullName, cohortTitle, cohortUrl)` | *You've been added to {cohort}* | `sendCohortWelcomeEmail` |

`welcome` vs `setPassword`: **welcome** is for self-serve signups (the
account already has a password — pure "you're in, here's your dashboard").
**setPassword** is for accounts created *for* someone (admin-provisioned,
corporate onboarding) — combined welcome + a set-password link, worded for
"Sypher" or for a company by name.

---

## 3. Where each email fires

| Email | Trigger | Code |
| --- | --- | --- |
| **Welcome** | Self-serve signup (already has a password) | `AuthController.register` → `void sendWelcomeEmail(...)` |
| **Set password** | Admin creates a user in `/admin/access` User Role tab | `AccessController.createUser` → `void issueSetPasswordLink(user)` |
| **Set password** | `Company.adminEmail` set on company create/edit → new `COMPANY_HR` | `AccessController.createCompany`/`updateCompany` → `provisionCompanyAdmin` → `issueSetPasswordLink(user, companyName)` |
| **Set password** | CSV employee import creates / links a passwordless account | `CompanyAdminController.importEmployees` → `provisionCompanyEmployee` → `issueSetPasswordLink` |
| **Set password** | "Resend" on an invite-pending employee | `CompanyAdminController.resendInvite` → `issueSetPasswordLink(user, companyName)` |
| **Set password** | Cohort **Add Member by email** / **Add Manager by email** for an email with no account | `CohortController.addRosterMemberByEmail` / `addManagerByEmail` → `ensureUserByEmail` → `createProvisionedUser` → `issueSetPasswordLink` |
| **Password reset** | Forgot-password | `AuthController.forgotPassword` → `void sendPasswordResetEmail(...)` |
| **Cohort welcome** | A member is set active on a cohort roster (fresh enrol / reactivation, not a no-op re-set) — both the by-userId toggle and the by-email add | `CohortController.setMemberStatus` / `addRosterMemberByEmail` → `maybeSendCohortWelcome(...)` |

**All provisioning now funnels through `lib/userProvisioning.ts`**
(`createSetPasswordLink`, `issueSetPasswordLink`, `createProvisionedUser`,
`ensureUserByEmail`). `companyProvisioning.ts` is a thin company-scoped
wrapper over it (re-exports the two link helpers for back-compat). Every
account created *for* someone — admin User Role tab, company adminEmail,
CSV import, cohort roster/managers by email — is passwordless +
`mustResetPassword` + gets the welcome/set-password email. Self-serve
`register` is the only path that doesn't.

Notes:
- The corporate **"Copy link"** button (`POST /company-admin/employees/{id}/invite-link`)
  and the Sypher-admin bootstrap
  (`POST /access/companies/{id}/admin-invite-link`) mint the same
  set-password token via `createSetPasswordLink()` but **return** the URL
  instead of emailing — for handing over directly when mail is off.
- Set-password / reset links both point at the MAIN app
  `${FRONTEND_URL}/reset-password?token=…` (the styled page in
  `apps/web/src/app/reset-password/`). There is no `/corporate/reset-password`
  yet — after setting a password, a corporate user goes to
  `corporate.sypher.local` and signs in.
- Set-password tokens last **7 days**; forgot-password tokens last **1
  hour** (`SET_PASSWORD_TTL_MS` in `lib/userProvisioning.ts`,
  `RESET_TOKEN_TTL_MS` in `AuthController.ts`). Both are consumed by the
  same `POST /auth/reset-password`.

---

## First login = set your own password

Provisioned accounts (admin-created via `/admin/access`, and every
corporate `adminEmail` / CSV-imported account) carry
`User.mustResetPassword = true` (migration `20260828100000`).

- **Passwordless provisioned account** (corporate onboarding): can't pass
  `/auth/login` at all — must use the emailed **Set your password** link
  (`/reset-password?token=…`). `POST /auth/login/company` returns a
  *specific* 401 ("Your account isn't set up yet. Use the set-password
  link…") instead of a bare "invalid password" when it sees a passwordless
  account for that company.
- **Admin-created account with a temporary password**: login succeeds, but
  the `AuthUser` response carries `mustResetPassword: true`, and every
  landing point (`/login`, `/corporate/login`, the corporate admin layout)
  routes to **`/set-password`** — a session-based forced-change screen —
  before the dashboard/console. `POST /auth/set-password` **only works
  while `mustResetPassword` is true** (403 otherwise), so it can't double
  as a no-current-password change endpoint for a normal account.
- The flag is cleared the instant a password is set, in ONE place:
  `UserRepository.setPasswordHash` (used by both `/auth/reset-password` and
  `/auth/set-password`).

---

## 4. Turn on real delivery

Set these in `apps/api/.env` (all optional — unset = that provider is
skipped; both unset = email is logged only, nothing sends):

```dotenv
# Brevo (tried first) — free tier ~300/day
BREVO_API_KEY=xkeysib-...
BREVO_SENDER_EMAIL=no-reply@yourdomain.com     # must be a verified sender in Brevo
BREVO_DAILY_LIMIT=300

# Resend (fallback) — free tier 100/day, 3000/month
RESEND_API_KEY=re_...
RESEND_SENDER_EMAIL=no-reply@yourdomain.com    # from a verified domain in Resend
RESEND_DAILY_LIMIT=100
RESEND_MONTHLY_LIMIT=3000

# Link base in every email (already set for local dev)
FRONTEND_URL=https://next.sypher.local
```

Restart `apps/api` after editing `.env`.

---

## 5. Local email — the SMTP transport (GreenMail)

`EMAIL_TRANSPORT=smtp` makes the rotation use **only** `providers/smtp.ts`
(nodemailer) — Brevo/Resend are never contacted. Point it at a GreenMail
server (a docker container, or an external/shared one) and every
transactional email lands there for you to read.

```dotenv
EMAIL_TRANSPORT=smtp
SMTP_HOST=localhost        # or an external GreenMail host
SMTP_PORT=3025             # 3465 with SMTP_SECURE=true
SMTP_SECURE=false
SMTP_USER=                 # blank for local GreenMail (-Dgreenmail.auth.disabled)
SMTP_PASS=                 # external GreenMail: pass == the recipient address
SMTP_FROM=Sypher <no-reply@sypher.local>
```

Local container: `cd apps/api && docker compose up -d greenmail`
(or the root `greenmail.compose.yml`). Read captured mail with
`docker logs -f api-greenmail-1` or an IMAP client on `:3143`
(username & password both = the recipient address). Unset `EMAIL_TRANSPORT`
to go back to Brevo/Resend. Full walkthrough:
`Testing-Accounts-and-Emailers.md` §2.

**Verify:**
1. `POST /auth/forgot-password` with a real seeded email → check the inbox
   and the `EmailSend` table for a new row.
2. Watch the API log: `Failed to send … email` means every provider is
   unconfigured / over quota / erroring — the message includes each
   provider's reason.

---

## 5. Adding a new email

1. `emailTemplates.ts` — add `myThingEmailHtml(...)` using `shell()` +
   `heading()` + `button()`.
2. `email.ts` — add `sendMyThingEmail(...)` calling the shared `send()`
   helper (kind label, to, subject, html).
3. Call `void sendMyThingEmail(...)` from the flow, **after** the state it
   announces is committed. Never `await` it in a way that can fail the
   request.
4. Add a row to the tables in sections 2 and 3 of this file.
