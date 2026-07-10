# Supabase Schema

This static Docusaurus site talks to Supabase using only the **anon key**
(no `service_role` key anywhere in this repo). That means:

- No server-side admin operations (e.g. hard-deleting an auth user) — user
  deletion is a soft delete (`profiles.deleted_at`).
- All access control is enforced entirely through **Row Level Security
  (RLS)** policies on the tables below.

Tables:

| Table            | Purpose                                             | Used by                        |
|------------------|------------------------------------------------------|---------------------------------|
| `profiles`       | One row per auth user; holds `role` for access control | `src/data/profiles.js`, `AuthContext`, `/manage-users` |
| `bookmarks`      | Whole-course bookmarks                              | `src/data/bookmarks.js`         |
| `doc_bookmarks`  | Individual page bookmarks                           | `src/data/docBookmarks.js`      |

Roles (`public.user_role` enum): `admin`, `free_users`, `paid_users`,
`internal_hr`, `company_hr`, `company_employees`, `branders`. New signups
default to `free_users`.

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
drop function if exists public.handle_new_user();
drop function if exists public.is_admin();
drop table if exists public.doc_bookmarks;
drop table if exists public.bookmarks;
drop table if exists public.profiles;
drop type if exists public.user_role;

-- ============================================================
-- 1. PROFILES (roles, admin management)
-- ============================================================

create type public.user_role as enum (
  'admin', 'free_users', 'paid_users', 'internal_hr',
  'company_hr', 'company_employees', 'branders'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role public.user_role not null default 'free_users',
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

-- auto-create a profile row (role = free_users) on signup
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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
```

After running this, backfill + bootstrap admin as shown in
[Step 4](#step-4--backfill--bootstrap-admin) above.

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
