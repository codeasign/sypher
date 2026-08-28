# Testing — Accounts & Emailers

Test accounts, plus how to read the transactional emails Sypher sends
(welcome / set-password / password-reset / cohort-welcome) locally.

Deep references: `Test-Accounts.md` · `Corporate-Test-Accounts.md` ·
`Email-Hookup.md`.

Use the Caddy HTTPS hosts (`https://next.sypher.local`,
`https://corporate.sypher.local`, API `https://api-next.sypher.local`) —
never plain `localhost`, the session cookie won't stick.

---

## 1. Accounts

### Main app — one per role

Password for all: **`password`**. Sign in at `https://next.sypher.local/login`.

| Role | Email |
| --- | --- |
| ADMIN | `admin-test@sypher.local` |
| FREE_USER | `free-test@sypher.local` |
| PAID_USER | `paid-test@sypher.local` |
| INTERNAL_HR | `internalhr-test@sypher.local` |
| COMPANY_HR | `companyhr-test@sypher.local` |
| COMPANY_EMPLOYEE | `companyemployee-test@sypher.local` |
| BRANDER | `brander-test@sypher.local` |
| COHORT_USER | `cohortuser-test@sypher.local` |

Seed accounts (`apps/api/prisma/seed.ts`, password `devpassword123`):
`admin@sypher.local`, `hr@acme.example`, `employee@acme.example`.

### Corporate portal — `https://corporate.sypher.local`

Fixture `apps/api/scripts/seed-corporate-test.ts` (re-runnable). Company
**Sypher Test Corp**, code **`TESTCO`**, all password **`password`**:
`admin@testco.local` (COMPANY_HR → `/corporate/admin`),
`dev1@testco.local` / `dev2@testco.local` (Engineering group),
`sales1@testco.local` (Sales group).

### First-login flows

On first sign-in an account goes: **set password** (provisioned accounts —
`/set-password`, or the emailed link) → **onboarding modal** (pick handle +
avatar, accept the policies). To re-test them on an existing account, clear
the flags directly:

```sql
UPDATE "User" SET "onboardedAt" = NULL, "legalAcceptedAt" = NULL,
  "avatarUrl" = NULL, "mustResetPassword" = true
WHERE email = 'free-test@sypher.local';
DELETE FROM "Session" WHERE "userId" = (SELECT id FROM "User" WHERE email = 'free-test@sypher.local');
```

---

## 2. Reading Sypher's emails — GreenMail

Sypher's email layer speaks the Brevo/Resend HTTP APIs; GreenMail is an
SMTP server. Set **`EMAIL_TRANSPORT=smtp`** and the rotation sends every
email to the SMTP target instead (`apps/api/src/lib/emailRotation/providers/smtp.ts`)
— nothing reaches the real providers.

### Local GreenMail

Comes up with the DB: `cd apps/api && docker compose up -d` (or just the
one service, `docker compose up -d greenmail`). Standalone alternative:
`docker compose -f greenmail.compose.yml up -d` (root) — same ports, run
one or the other.

`apps/api/.env` (already set for dev):

```dotenv
EMAIL_TRANSPORT=smtp
SMTP_HOST=localhost
SMTP_PORT=3025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=Sypher <no-reply@sypher.local>
```

### External / shared GreenMail

Point the same vars at it; add credentials if it isn't running with
`-Dgreenmail.auth.disabled`:

```dotenv
SMTP_HOST=greenmail.your-host.internal
SMTP_PORT=3025               # or 3465 with SMTP_SECURE=true
SMTP_USER=you@example.com
SMTP_PASS=you@example.com    # GreenMail convention: password == the address
```

### Reading the captured mail

- **Logs** (fastest — full body incl. links, quoted-printable):
  `docker logs -f api-greenmail-1`  (or `sypher-greenmail` for the
  standalone file).
- **IMAP client** on `localhost:3143` — username **and** password both =
  the recipient address (GreenMail auto-creates the mailbox on first
  delivery).

### Back to real delivery

Delete / comment the `EMAIL_TRANSPORT` line and set `BREVO_*` / `RESEND_*`.
Production simply never sets `EMAIL_TRANSPORT`. Full template + trigger map:
**`Email-Hookup.md`**.

---

## 3. Quick recipes

**See the set-password email for a new corporate employee:** in
`/corporate/admin` → Employees → import a CSV row with a fresh email →
`docker logs -f api-greenmail-1` shows the welcome/set-password mail.

**See the password-reset email:**
```bash
curl -k -X POST https://api-next.sypher.local/auth/forgot-password \
  -H 'Content-Type: application/json' -d '{"email":"free-test@sypher.local"}'
```

**Re-seed the corporate fixture:**
`cd apps/api && npx tsx scripts/seed-corporate-test.ts`
