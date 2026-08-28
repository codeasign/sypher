# Corporate Portal — Test Accounts

Dev fixture for the **corporate portal** (`https://corporate.sypher.local`).
Seeded by `apps/api/scripts/seed-corporate-test.ts` — idempotent, re-run any
time:

```bash
cd apps/api && npx tsx scripts/seed-corporate-test.ts
```

**Password for every account below:** `password`

## Company

| Field | Value |
| --- | --- |
| Name | Sypher Test Corp |
| Company code | `TESTCO` (case-insensitive at the code screen) |
| Access until | ~2 years out (so `accessUntil` checks pass) |
| Admin email | `admin@testco.local` |
| Seats | 25 |

## Accounts

| Role | Email | Groups | Lands on |
| --- | --- | --- | --- |
| COMPANY_HR (company admin) | `admin@testco.local` | — | `/corporate/admin` (the console) |
| COMPANY_EMPLOYEE | `dev1@testco.local` | Engineering | main app `/dashboard` |
| COMPANY_EMPLOYEE | `dev2@testco.local` | Engineering | main app `/dashboard` |
| COMPANY_EMPLOYEE | `sales1@testco.local` | Sales | main app `/dashboard` |

## Access wired up by the seed

- **Company-wide ceiling** (what Sypher staff grant a company):
  `python-for-test-automation`, `playwright-test-automation`, and the
  `manage-cohort-users` sidebar item.
- **Group grants** (what the company admin hands out — always a subset of
  the ceiling):
  - **Engineering** → both courses + the sidebar item
  - **Sales** → one course only

So `dev1` / `dev2` get full access to both courses; `sales1` gets one.
Employees in no group get nothing beyond free previews.

## How to sign in

1. `https://corporate.sypher.local` → redirects to the **company code**
   screen.
2. Enter `TESTCO` → **Continue**.
3. On the branded login, use one of the emails above + `password`.
   - `admin@testco.local` → the admin console (`/corporate/admin`).
   - the others → bounced to the main app `https://next.sypher.local/dashboard`.

Requires the local Caddy host to be up: add
`127.0.0.1 corporate.sypher.local` to your hosts file and `caddy reload`
(see `Caddyfile`).

## Notes

- Separate from `apps/api/prisma/seed.ts`'s `hr@acme.example` /
  `employee@acme.example` (company **Acme Corp**, code `ACMECORP`, password
  `devpassword123`) — those also work against the portal but have no groups
  or grants seeded, so employees there see nothing.
- Also separate from repo-root `Test-Accounts.md` (per-`Role` accounts on
  the main app).
- If the dev DB is reset, re-run the seed command above.
- The set-password / reset email won't send without provider keys — the
  seed sets real passwords directly, so no email step is needed for these
  accounts. For a brand-new employee added through the UI, use **Copy
  link** on their roster row.
