# Corporate Portal — User Guide

`corporate.sypher.local` is a separate entrance for companies. A company
admin manages their own people and what those people can access, without
Sypher staff in the loop.

- **Who is the company admin?** Whoever owns the company's **Admin email**
  (set by Sypher when the company is created). That address gets a
  `COMPANY_HR` account automatically.
- **Who is Sypher staff?** They set what a company *may* have (the
  "ceiling" — see below) from the main admin console, and nothing else here.

---

## 1. Signing in

1. Go to **`https://corporate.sypher.local`**.
2. **Company code** screen — enter the code your organisation was given
   (e.g. `ACMECORP`). It's not case-sensitive. If the code is unknown or
   your company's access window has ended, you'll be told here.
3. **Sign in** — the screen now shows your company's logo and name. Use
   your work email and password.
   - **First time?** Your account is created for you — it has no password
     yet. You'll have a **"Set your password"** email (or your admin can
     hand you the link). Follow it, choose a password (min 8 chars), then
     come back to this screen and sign in. If you try to sign in before
     that, the screen tells you so.
4. After sign-in:
   - **Company admins** land on the admin console (`/corporate/admin`).
   - **Employees** are taken straight to the main Sypher app.

Everyone can also still sign in on the normal `next.sypher.local/login` —
the portal is an extra branded door, not a wall.

---

## 2. The admin console

Three tabs.

### Overview

Headline numbers: employees, groups, how many courses and sidebar items are
in your plan, seats, and your access-until date.

### Groups

A **group** is a set of employees who get the same access. An employee can
be in **several** groups and gets the combined access.

- **Create a group** — type a name, *Create group*.
- **Select a group** to manage it:
  - **Rename** / **Delete** (deleting keeps the people, they just lose that
    group's access).
  - **Course access** — tick the courses this group can take. Only courses
    **in your company plan** appear. (Sypher decides the plan; you hand out
    subsets of it per group.)
  - **Sidebar access** — same idea for sidebar items in your plan.

Changes take effect immediately for everyone in the group.

### Employees

The roster, plus onboarding.

- **Import from CSV** — the main way to add people. See section 3.
- Per person you can:
  - **Groups** — change which groups they're in (checkboxes).
  - **Resend** — re-send their set-password email (only while they haven't
    set one — shown as *Invite pending*).
  - **Copy link** — copy a fresh set-password link to hand over directly
    (useful if email isn't set up).
  - **Remove** — they lose all company access and drop back to a normal
    free account. (Re-import to bring them back.)

---

## 3. The CSV import

Header row + one row per employee. Example:

```csv
Full Name,Email Id,Department,Role,Manager Name
Asha Rao,asha@acme.com,Engineering,Senior Engineer,Ravi Kumar
Vikram Shah,vikram@acme.com,Engineering,Staff Engineer,Ravi Kumar
Neha Gupta,neha@acme.com,Sales,Account Executive,Priya Nair
```

| Column | Required | Meaning |
| --- | --- | --- |
| **Full Name** | yes | Shown on their account — they never re-type it. |
| **Email Id** | yes | Login identity. Bad emails are skipped and listed in the result. |
| **Department** | no | Becomes a **group** (created if new); the person is added to it. Blank = no group. |
| **Role** | no | Free-text job title. A label only — grants nothing. |
| **Manager Name** | no | A label for reference. No hierarchy or permissions (yet). |

Notes:

- Header names are flexible: `Email Id` / `Email` / `email_id` all work, as
  do `Name`, `Dept`/`Group`, `Title`/`Designation`, `Manager`. Column order
  doesn't matter; only Full Name and Email Id must be present.
- Quoted fields with commas/newlines are fine: `"Rao, Asha",…`.
- **Re-running the same CSV is safe** — existing people are updated (title /
  manager refreshed, groups kept), never duplicated.
- An email that already belongs to a *different* company is skipped and
  flagged.
- New people get a set-password email (or use **Copy link**).

After import you get a summary: rows processed, created, linked, updated,
and any skipped rows with the reason.

---

## 4. How access actually resolves

```
What an employee can open
  = (courses/sidebar granted to ANY group they're in)
  ∩ (what's in the company plan)          ← the "ceiling", set by Sypher
  ∩ (company access window still open)     ← accessUntil
```

- Company-wide plan grants **do not** reach employees on their own any more
  — access is delivered **through groups**. An employee in no group (or
  whose groups grant nothing) sees only free course previews.
- If your company's access-until date passes, all company access switches
  off until Sypher extends it — group config is preserved.

---

## 5. For developers

- Local host: add `127.0.0.1 corporate.sypher.local` to your hosts file,
  then `caddy reload` (`Caddyfile` already has the block).
- Test fixture + accounts: `Corporate-Test-Accounts.md`
  (`apps/api/scripts/seed-corporate-test.ts`).
- Bootstrapping a company admin with no mail server: Sypher admin sets the
  company's **Admin email**, then `POST /access/companies/{id}/admin-invite-link`
  returns a set-password link to hand over.
- API surface: `POST /companies/resolve`, `POST /auth/login/company`, and
  everything under `/company-admin/*` (all scoped to the caller's own
  company from the session — no company id in any path).
- Design notes / architecture (FK-free company tables, the
  `CompanyDirectoryRepository` seam for a future per-company database):
  memory `sypher-next-corporate-portal.md` and `CLAUDE.md`.
