# Supabase Schema

This static Docusaurus site talks to Supabase using only the **anon key**
(no `service_role` key anywhere in this repo). That means:

- No server-side admin operations (e.g. hard-deleting an auth user) — user
  deletion is a soft delete (`profiles.deleted_at`).
- All access control is enforced entirely through **Row Level Security
  (RLS)** policies on the tables below.

Tables:

| Table                     | Purpose                                             | Used by                        |
|---------------------------|------------------------------------------------------|---------------------------------|
| `profiles`                | One row per auth user; holds `role`, `signup_source`, `company_name`, `confirmed_at` | `src/data/profiles.js`, `AuthContext`, `/manage-users` |
| `bookmarks`               | Whole-course bookmarks                              | `src/data/bookmarks.js`         |
| `doc_bookmarks`           | Individual page bookmarks                           | `src/data/docBookmarks.js`      |
| `course_access`           | Per-course, per-role access list                    | `src/data/courseAccess.js`, `/manage-access` |
| `nav_access`              | Per-sidebar-item role visibility                    | `src/data/navAccess.js`, `/manage-access` |
| `pending_invites`         | Role/company lookup for a not-yet-signed-up invited email, consumed by `handle_new_user()` at signup | `src/data/pendingInvites.js`, `/manage-users` |
| `company_course_access`   | Per-company course access for `company_employees` (presence = allowed) | `src/data/companyAccess.js`, `/manage-access` |
| `company_nav_access`      | Per-company sidebar-item access for `company_employees` (presence = allowed) | `src/data/companyAccess.js`, `/manage-access` |

Roles (`public.user_role` enum): `admin`, `free_users`, `paid_users`,
`internal_hr`, `company_hr`, `company_employees`, `branders`. New signups
default to `free_users`.

`profiles.confirmed_at` is set the first time an invited corporate user
actually signs in (magic link click), not when the invite is sent — it
drives the "Invited" vs "Active" status badge on `/manage-users`. See
[Corporate invites and per-company access](#corporate-invites-and-per-company-access)
below.

---

## Start fresh (full reset)

Use this if you want to wipe the `public` schema and rebuild everything from
scratch. **This only touches the `public` schema** — `auth.users` and other
Supabase-managed schemas are untouched, so existing logins still work
against the recreated `profiles` table once you backfill (step 3 below).

> ⚠️ This drops every table in `public`, including `bookmarks` and
> `doc_bookmarks`. There is no undo — export anything you need first.

### Step 1 — inspect what's currently there (optional)

```sql
select table_name from information_schema.tables where table_schema = 'public';
```

### Step 2 — drop and recreate the schema

```sql
drop schema if exists public cascade;
create schema public;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, service_role;
grant all on all sequences in schema public to postgres, service_role;
grant all on all functions in schema public to postgres, service_role;
alter default privileges in schema public grant all on tables to postgres, service_role;
alter default privileges in schema public grant all on sequences to postgres, service_role;
alter default privileges in schema public grant all on functions to postgres, service_role;
```

### Step 3 — recreate all tables

Run the full script from [Fresh schema (all tables)](#fresh-schema-all-tables)
below.

### Step 4 — backfill + bootstrap admin

```sql
-- backfill profiles for any auth.users that predate the trigger
insert into public.profiles (id, email, full_name)
select id, email, raw_user_meta_data->>'full_name' from auth.users
on conflict (id) do nothing;

-- promote yourself to admin (nobody can do this from the UI until one admin exists)
update public.profiles set role = 'admin' where email = 'your-actual-login-email@example.com';
```

---

## Fresh schema (all tables)

Idempotent — safe to re-run. Drops each object before recreating it, in
dependency order (tables/policies before the enum/functions they depend on).

```sql
-- ============================================================
-- 0. CLEAN SLATE (idempotent — safe to re-run)
-- ============================================================

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_confirmed on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.handle_user_confirmed();
drop function if exists public.is_admin();
drop function if exists public.email_is_invited(text);
drop table if exists public.company_nav_access;
drop table if exists public.company_course_access;
drop table if exists public.pending_invites;
drop table if exists public.nav_access;
drop table if exists public.course_access;
drop table if exists public.doc_bookmarks;
drop table if exists public.bookmarks;
drop table if exists public.profiles;
drop type if exists public.user_role;
drop type if exists public.signup_source;

-- ============================================================
-- 1. PROFILES (roles, admin management)
-- ============================================================

create type public.user_role as enum (
  'admin', 'free_users', 'paid_users', 'internal_hr',
  'company_hr', 'company_employees', 'branders'
);

create type public.signup_source as enum ('google', 'email');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role public.user_role not null default 'free_users',
  signup_source public.signup_source not null default 'email',
  company_name text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.profiles enable row level security;

-- security-definer helper: lets policies check "is this caller an admin?"
-- WITHOUT re-triggering RLS on profiles (see Troubleshooting > infinite recursion)
create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "admins read all" on public.profiles
  for select using (public.is_admin());

create policy "admins update all" on public.profiles
  for update using (public.is_admin());

-- role/company lookup for a not-yet-signed-up invited email, consumed by
-- handle_new_user() below at signup time. Under normal operation a row
-- lives here for a few hundred milliseconds (signInWithOtp fires
-- handle_new_user synchronously) up to however long the person takes to
-- click the magic link.
create table public.pending_invites (
  email text primary key,
  role public.user_role not null check (role in ('company_hr', 'company_employees')),
  company_name text not null,
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz not null default now()
);

alter table public.pending_invites enable row level security;

create policy "admins manage pending invites" on public.pending_invites
  for all using (public.is_admin()) with check (public.is_admin());

-- auto-create a profile row on signup. If a pending_invites row exists for
-- this email (bulk-invited corporate user), its role + company_name are
-- used and the invite row is consumed; otherwise role defaults to
-- free_users. signup_source is read from the auth provider Supabase used
-- (Google OAuth vs email/password); Google sign-ups with no invite default
-- company_name to 'Independent' since there's no company to capture during
-- OAuth.
create function public.handle_new_user()
returns trigger as $$
declare
  provider text := new.raw_app_meta_data->>'provider';
  invite public.pending_invites;
begin
  select * into invite from public.pending_invites where email = lower(new.email);

  insert into public.profiles (id, email, full_name, role, signup_source, company_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce(invite.role, 'free_users'),
    case when provider = 'google' then 'google' else 'email' end::public.signup_source,
    coalesce(invite.company_name, case when provider = 'google' then 'Independent' else null end)
  );

  if invite.email is not null then
    delete from public.pending_invites where email = lower(new.email);
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- confirmed_at tracks the first real sign-in (magic link click), not the
-- invite send — drives the Invited/Active badge on /manage-users.
create function public.handle_user_confirmed()
returns trigger as $$
begin
  if old.last_sign_in_at is null and new.last_sign_in_at is not null then
    update public.profiles set confirmed_at = now()
      where id = new.id and confirmed_at is null;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_confirmed
  after update on auth.users
  for each row execute function public.handle_user_confirmed();

-- lets an anonymous visitor on the login page's "Work or School" tab check
-- whether an email is recognized, without exposing any row data.
create function public.email_is_invited(check_email text)
returns boolean
language sql security definer set search_path = public stable
as $$
  select
    exists (select 1 from public.profiles where lower(email) = lower(check_email) and deleted_at is null)
    or exists (select 1 from public.pending_invites where email = lower(check_email));
$$;

grant execute on function public.email_is_invited(text) to anon, authenticated;

-- ============================================================
-- 2. BOOKMARKS (whole-course bookmarks — src/data/bookmarks.js)
-- ============================================================

create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_slug text not null,
  created_at timestamptz not null default now(),
  unique (user_id, course_slug)
);

alter table public.bookmarks enable row level security;

create policy "manage own bookmarks" on public.bookmarks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 3. DOC_BOOKMARKS (individual page bookmarks — src/data/docBookmarks.js)
-- ============================================================

create table public.doc_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_path text not null,
  course_slug text not null,
  title text,
  created_at timestamptz not null default now(),
  unique (user_id, doc_path)
);

alter table public.doc_bookmarks enable row level security;

create policy "manage own doc bookmarks" on public.doc_bookmarks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 4. COURSE_ACCESS (per-course, per-role access list — src/data/courseAccess.js)
-- ============================================================

create table public.course_access (
  course_slug text primary key,
  allowed_roles public.user_role[] not null default '{}'::public.user_role[],
  updated_at timestamptz not null default now()
);

alter table public.course_access enable row level security;

create policy "anyone can read course access" on public.course_access
  for select using (true);

create policy "admins manage course access" on public.course_access
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 5. NAV_ACCESS (per-sidebar-item role visibility — src/data/navAccess.js)
-- ============================================================

create table public.nav_access (
  item_key text primary key,
  allowed_roles public.user_role[] not null default '{}'::public.user_role[],
  updated_at timestamptz not null default now()
);

alter table public.nav_access enable row level security;

create policy "authenticated can read nav access" on public.nav_access
  for select to authenticated using (true);

create policy "admins manage nav access" on public.nav_access
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 6. COMPANY_COURSE_ACCESS (per-company course access for
--    company_employees — src/data/companyAccess.js). Presence of a row =
--    allowed; no allowed_roles array needed since it's already scoped to
--    company_employees by definition.
-- ============================================================

create table public.company_course_access (
  company_name text not null,
  course_slug text not null,
  updated_at timestamptz not null default now(),
  primary key (company_name, course_slug)
);

alter table public.company_course_access enable row level security;

create policy "anyone can read company course access" on public.company_course_access
  for select using (true);

create policy "admins manage company course access" on public.company_course_access
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 7. COMPANY_NAV_ACCESS (per-company sidebar-item access for
--    company_employees — src/data/companyAccess.js)
-- ============================================================

create table public.company_nav_access (
  company_name text not null,
  item_key text not null,
  updated_at timestamptz not null default now(),
  primary key (company_name, item_key)
);

alter table public.company_nav_access enable row level security;

create policy "anyone can read company nav access" on public.company_nav_access
  for select using (true);

create policy "admins manage company nav access" on public.company_nav_access
  for all using (public.is_admin()) with check (public.is_admin());
```

After running this, backfill + bootstrap admin as shown in
[Step 4](#step-4--backfill--bootstrap-admin) above.

---

## Seeding `course_access`

`course_access` has no default row per course — a missing row means
`allowed_roles = '{}'` (nobody but the hardcoded admin bypass) in client
code. No seed data is required: an admin sets `allowed_roles` per course
per role from the `/manage-access` Courses tab (admin-only, via
`RequireAdmin`), which upserts a row the first time a role is granted
access to a course.

`admin` is never included in `allowed_roles` — it's a hardcoded bypass in
`hasCourseAccess()`, same as `nav_access`'s admin bypass.

`nav_access` follows the same rule — a missing row means `allowed_roles =
[]`, so nobody but the hardcoded admin bypass sees the item until an admin
explicitly grants it on `/manage-access`.

---

## Migrating an existing `profiles` table (`signup_source` + `company_name`)

If your `profiles` table already exists (i.e. you're not running the [fresh
schema](#fresh-schema-all-tables) from scratch), add the two new columns and
update the trigger in place. Idempotent — safe to re-run.

```sql
do $$ begin
  create type public.signup_source as enum ('google', 'email');
exception when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists signup_source public.signup_source not null default 'email',
  add column if not exists company_name text;

-- backfill existing rows — every current signup went through Google OAuth
update public.profiles
  set signup_source = 'google', company_name = 'Independent'
  where signup_source = 'email' and company_name is null;

create or replace function public.handle_new_user()
returns trigger as $$
declare
  provider text := new.raw_app_meta_data->>'provider';
begin
  insert into public.profiles (id, email, full_name, signup_source, company_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    case when provider = 'google' then 'google' else 'email' end::public.signup_source,
    case when provider = 'google' then 'Independent' else null end
  );
  return new;
end;
$$ language plpgsql security definer;

notify pgrst, 'reload schema';
```

`company_name` stays `null` for `email`-sourced signups until there's an
email/password signup flow that collects it — there isn't one yet (signup is
Google-only today, see `src/components/OAuthButtons.tsx`).

---

## Corporate invites and per-company access

Adds bulk CSV invites for `company_hr`/`company_employees` (`/manage-users`),
the "Work or School" login tab's email-recognition RPC, and per-company
course/sidebar access (`/manage-access` Companies tab). If your project
predates this, run the migration below against an existing `profiles` table
— idempotent, safe to re-run. If you're running the
[fresh schema](#fresh-schema-all-tables) from scratch, all of this is
already folded in.

```sql
-- confirmed_at (tracks first real sign-in, drives the Invited/Active badge)

alter table public.profiles
  add column if not exists confirmed_at timestamptz;

create or replace function public.handle_user_confirmed()
returns trigger as $$
begin
  if old.last_sign_in_at is null and new.last_sign_in_at is not null then
    update public.profiles set confirmed_at = now()
      where id = new.id and confirmed_at is null;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update on auth.users
  for each row execute function public.handle_user_confirmed();

-- pending_invites (role/company lookup consumed by handle_new_user at signup)

create table if not exists public.pending_invites (
  email text primary key,
  role public.user_role not null check (role in ('company_hr', 'company_employees')),
  company_name text not null,
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz not null default now()
);

alter table public.pending_invites enable row level security;

drop policy if exists "admins manage pending invites" on public.pending_invites;
create policy "admins manage pending invites" on public.pending_invites
  for all using (public.is_admin()) with check (public.is_admin());

-- handle_new_user: now consumes a matching pending invite, if any

create or replace function public.handle_new_user()
returns trigger as $$
declare
  provider text := new.raw_app_meta_data->>'provider';
  invite public.pending_invites;
begin
  select * into invite from public.pending_invites where email = lower(new.email);

  insert into public.profiles (id, email, full_name, role, signup_source, company_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce(invite.role, 'free_users'),
    case when provider = 'google' then 'google' else 'email' end::public.signup_source,
    coalesce(invite.company_name, case when provider = 'google' then 'Independent' else null end)
  );

  if invite.email is not null then
    delete from public.pending_invites where email = lower(new.email);
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- email_is_invited (anon-safe email recognition for the login page's
-- "Work or School" tab — exposes only a boolean, no row data)

create or replace function public.email_is_invited(check_email text)
returns boolean
language sql security definer set search_path = public stable
as $$
  select
    exists (select 1 from public.profiles where lower(email) = lower(check_email) and deleted_at is null)
    or exists (select 1 from public.pending_invites where email = lower(check_email));
$$;

grant execute on function public.email_is_invited(text) to anon, authenticated;

-- company_course_access / company_nav_access (per-company access for
-- company_employees — presence of a row = allowed)

create table if not exists public.company_course_access (
  company_name text not null,
  course_slug text not null,
  updated_at timestamptz not null default now(),
  primary key (company_name, course_slug)
);
alter table public.company_course_access enable row level security;
drop policy if exists "anyone can read company course access" on public.company_course_access;
create policy "anyone can read company course access" on public.company_course_access for select using (true);
drop policy if exists "admins manage company course access" on public.company_course_access;
create policy "admins manage company course access" on public.company_course_access for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.company_nav_access (
  company_name text not null,
  item_key text not null,
  updated_at timestamptz not null default now(),
  primary key (company_name, item_key)
);
alter table public.company_nav_access enable row level security;
drop policy if exists "anyone can read company nav access" on public.company_nav_access;
create policy "anyone can read company nav access" on public.company_nav_access for select using (true);
drop policy if exists "admins manage company nav access" on public.company_nav_access;
create policy "admins manage company nav access" on public.company_nav_access for all using (public.is_admin()) with check (public.is_admin());

notify pgrst, 'reload schema';
```

Notes:

- `signInWithOtp({ email, options: { shouldCreateUser: true } })` creates
  the `auth.users` row (and fires `handle_new_user()`) the moment the invite
  email is *sent*, not when the link is *clicked* — so a `profiles` row for
  an invited employee exists immediately after CSV upload, with
  `confirmed_at is null`. The badge flips to "Active" once they actually
  sign in.
- If the OTP send fails after the `pending_invites` upsert succeeds, that
  row just lingers harmlessly — a later signup attempt (invited resend or
  otherwise) still consumes it correctly.
- Deleting a `pending_invites` row after its magic link already went out
  does not invalidate that link (anon-key clients can't revoke a Supabase
  magic link). If clicked anyway, `handle_new_user` finds no invite and
  falls back to `role = free_users`, `company_name = null`.
- Free-text `company_name` means a typo between the CSV-upload spelling and
  the Companies-tab spelling silently yields zero access with no error
  surfaced — mitigated only by both UIs sourcing suggestions from the same
  `distinctCompanyNames()` helper.

---

## Troubleshooting

### `ERROR: 42710: type "user_role" already exists`

A previous run partially completed (created the enum, then failed on a
later statement). Run the [Clean slate](#fresh-schema-all-tables) block at
the top of the schema script first — it drops everything in the correct
dependency order — then re-run the rest.

### Signed up, but no row appears in `profiles`

```sql
select id, email, created_at from auth.users order by created_at desc;
select id, email, role, deleted_at from public.profiles order by created_at desc;
```

If the user exists in `auth.users` but not in `profiles`, the trigger never
fired. Check it exists:

```sql
select tgname, tgrelid::regclass, tgenabled
from pg_trigger
where tgname = 'on_auth_user_created';

select proname from pg_proc where proname = 'handle_new_user';
```

If either is missing (common after a partial reset), reattach and backfill:

```sql
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, email, full_name)
select id, email, raw_user_meta_data->>'full_name'
from auth.users
on conflict (id) do nothing;
```

### Logged in as admin, but `/manage-users` still redirects to `/dashboard`

Two separate causes, check in this order:

**1. Stale client session.** `AuthContext` fetches `role` once when the
session is established and does not refetch on client-side navigation. If
you ran the `update ... role = 'admin'` while already logged in, do a full
hard reload (Ctrl+Shift+R) or log out and back in.

**2. RLS infinite recursion.** If the `profiles` table still has the old
self-referencing admin policies (`exists (select 1 from public.profiles p
where ...)` written directly inside a policy *on* `profiles`), Postgres
recurses evaluating that subquery and errors with `infinite recursion
detected in policy for relation "profiles"`. This makes `getOwnProfile()`
fail silently, `role` stays `null`, and `RequireAdmin` redirects you even
though the DB row correctly says `role = 'admin'`.

Confirm by checking the browser console on `/manage-users` for that error
message, and inspect the live policies:

```sql
select policyname, cmd, qual from pg_policies where tablename = 'profiles';
```

Fix by routing the admin check through the `security definer` function
(already in the [fresh schema](#fresh-schema-all-tables) above — this is
only needed if you're patching an existing project instead of running the
full script):

```sql
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "admins read all" on public.profiles;
drop policy if exists "admins update all" on public.profiles;

create policy "admins read all" on public.profiles
  for select using (public.is_admin());

create policy "admins update all" on public.profiles
  for update using (public.is_admin());
```

`security definer` runs the function with its owner's privileges, bypassing
RLS for the query *inside* the function — so it doesn't re-trigger the
policy that calls it.

### `profiles` query returns email/role but you're not sure it's *your* row

Case/whitespace mismatches in the bootstrap `UPDATE` fail silently (0 rows
updated, no error). Verify with:

```sql
select email, role from public.profiles;
```

and match it exactly against your login email before re-running the
`update ... set role = 'admin' where email = '...'` statement.
