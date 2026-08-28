# Test Accounts

> Combined quick reference (accounts + first-login reset harness +
> emailers): **`Testing-Accounts-and-Emailers.md`**.

Dev-only accounts for manually testing role-gated behavior on the local
stack (`https://next.sypher.local`). One account per `Role` enum value
(`apps/api/prisma/schema.prisma`), all sharing the password below.

**Password for every account:** `password`

| Role | Email | Notes |
| --- | --- | --- |
| ADMIN | `admin-test@sypher.local` | Full access everywhere, all Manage pages. |
| FREE_USER | `free-test@sypher.local` | Default signup role — free/preview access only. |
| PAID_USER | `paid-test@sypher.local` | `paidUntil` set ~1 year out so the paid-and-active check passes. |
| INTERNAL_HR | `internalhr-test@sypher.local` | Not currently gated by any access check in the codebase — behaves like FREE_USER today. |
| COMPANY_HR | `companyhr-test@sypher.local` | Belongs to the seeded "Acme Corp" company (`apps/api/prisma/seed.ts`). |
| COMPANY_EMPLOYEE | `companyemployee-test@sypher.local` | Belongs to the seeded "Acme Corp" company. |
| BRANDER | `brander-test@sypher.local` | Not currently gated by any access check in the codebase — behaves like FREE_USER today. |
| COHORT_USER | `cohortuser-test@sypher.local` | Not currently gated by any access check in the codebase — behaves like FREE_USER today. |

## Notes

- These are separate from the pre-existing seed accounts in
  `apps/api/prisma/seed.ts` (`admin@sypher.local`, `hr@acme.example`,
  `employee@acme.example`), which keep their own password
  (`devpassword123`) — untouched by this batch.
- Created directly via Prisma against the local dev DB (Postgres on
  `:5433`), same pattern `seed.ts` already uses for role/company-gated
  accounts — there's no self-serve way to pick a role or company at
  signup.
- Log in at `https://next.sypher.local/login` (must be the HTTPS Caddy
  host, not `localhost:3002` — the session cookie won't stick over plain
  HTTP).
- If the local DB is ever reset/recreated, re-run the seeding to restore
  these accounts (they aren't part of `npm run seed`'s tracked script).
- **Corporate portal** (`corporate.sypher.local`) has its own fixture and
  accounts — see `Corporate-Test-Accounts.md` and `Corporate-User-Guide.md`.
## Re-running the first-login flows (onboarding / set-password)

Once an account completes onboarding / sets a password it stays that way.
To test those flows again, clear the flags directly on the row:

```sql
UPDATE "User" SET "onboardedAt" = NULL, "legalAcceptedAt" = NULL,
  "avatarUrl" = NULL, "mustResetPassword" = true
WHERE email = 'free-test@sypher.local';
DELETE FROM "Session"
WHERE "userId" = (SELECT id FROM "User" WHERE email = 'free-test@sypher.local');
```

Then sign in with `password` → `/set-password` → onboarding modal. The
emails those flows send land in GreenMail — see
`Testing-Accounts-and-Emailers.md` §2.
