# Supabase Schema

This static Docusaurus site talks to Supabase using only the **anon key**
almost everywhere (no `service_role` key in any client-side or build-time
code). That means:

- No server-side admin operations (e.g. hard-deleting an auth user) — user
  deletion is a soft delete (`profiles.deleted_at`).
- All access control is enforced entirely through **Row Level Security
  (RLS)** policies on the tables below.

**One narrow, deliberate exception:** `SUPABASE_SERVICE_ROLE_KEY` is used
by the Vercel Serverless Functions under `api/razorpay/` and `api/cron/`
(via the single helper `api/_lib/supabaseAdmin.js`) to verify a Razorpay
payment and upgrade `profiles.role`/`paid_until` — a trusted write that
must bypass RLS. It never appears in `docusaurus.config.js` `customFields`
or any client bundle. See [Payments (Razorpay upgrades)](#payments-razorpay-upgrades)
below.

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
| `blog_posts`               | Blog posts (draft/published), authored by admin or any role granted `nav_access` for `manage-blog-post` | `src/data/blogPosts.js`, `/manage-blog`, `/blog` |
| `domains`, `base_roles`, `skills`, `technologies`, `technology_categories` | Shared taxonomy catalog (career domains, role designations, skills, technologies) — admin-written, cached, public-read | `src/data/taxonomy.js`, `api/taxonomy.js`, `/manage-access` Taxonomy tab |
| `domain_roles`, `domain_skills`, `domain_technologies` | Many-to-many links between a domain and its roles/skills/technologies | `admin_save_taxonomy_category` RPC |
| `taxonomy_slugs`           | Cross-table slug registry — the single source of truth for "does this name exist, and as what kind" (role/skill/technology), so classification is sticky and dedupe works across tables | `admin_save_taxonomy_category` RPC |
| `taxonomy_meta`            | Single-row version counter, bumped on every taxonomy save, used to invalidate the `GET /api/taxonomy` cache | `api/taxonomy.js` |
| `user_skills`, `user_technologies` | Per-user picks (FK into `skills`/`technologies`) with proficiency + years — live, never cached | `src/data/userTaxonomy.js`, `/profile` |

Roles (`public.user_role` enum): `admin`, `free_users`, `paid_users`,
`internal_hr`, `company_hr`, `company_employees`, `branders`,
`external_job_poster`. New signups default to `free_users`.

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
drop function if exists public.can_manage_blog();
drop function if exists public.email_is_invited(text);
drop table if exists public.blog_posts;
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
drop type if exists public.looking_for_type;

-- ============================================================
-- 1. PROFILES (roles, admin management)
-- ============================================================

create type public.user_role as enum (
  'admin', 'free_users', 'paid_users', 'internal_hr',
  'company_hr', 'company_employees', 'branders', 'external_job_poster'
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

-- ============================================================
-- 8. BLOG_POSTS (draft/published posts — src/data/blogPosts.js).
--    Authoring is admin, plus any role granted nav_access for the
--    'manage-blog-post' item_key (configured on /manage-access).
-- ============================================================

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null check (char_length(title) <= 80),
  description text not null check (char_length(description) <= 120),
  content text not null default '',
  cover_image_url text,
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published')),
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

alter table public.blog_posts enable row level security;

-- security-definer helper: true if caller is admin, or caller's role is
-- listed in nav_access.allowed_roles for 'manage-blog-post'. Reuses
-- nav_access instead of a separate blog-specific access table so admin
-- grants manage-blog permission the same way as any other sidebar item.
create function public.can_manage_blog()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'admin'
        or p.role::text = any(
          select unnest(allowed_roles)::text from public.nav_access
          where item_key = 'manage-blog-post'
        )
      )
  );
$$;

create policy "anyone can read published posts" on public.blog_posts
  for select using (status = 'published');

create policy "authorized roles manage blog posts" on public.blog_posts
  for all using (public.can_manage_blog()) with check (public.can_manage_blog());

-- lets scripts/watch-blog-posts.mjs (npm run dev / npm run start) receive
-- live postgres_changes events and re-bake blog-content/ without a
-- dev-server restart. RLS policies above still apply to what the anon-key
-- subscription can actually see.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'blog_posts'
  ) then
    alter publication supabase_realtime add table public.blog_posts;
  end if;
end $$;
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

### Fixing the `ai-engineering-crash-course` / `ai-engineering-hands-on` mismatch

Before this fix, `packages/course-catalog/src/courses.js`'s catalog `slug`
for this course (`ai-engineering-crash-course`) didn't match its real
Docusaurus docs folder (`ai-engineering-hands-on`) — so any access grant
made from `/manage-access` for this course upserted a `course_access` row
under the wrong key, one `DocRoot`'s guard (and `check_course_access`) never
actually reads. The catalog now has a `docsSlug` field that corrects this,
and `/manage-access`'s Courses tab keys off it — so **no raw SQL is
required**: an admin just needs to open `/manage-access` → Courses tab and
re-toggle this course's role checkboxes once (even unchecking then
rechecking the same box works), which re-upserts the row under the correct
`ai-engineering-hands-on` key. The old row keyed under
`ai-engineering-crash-course` is simply orphaned afterward (nothing reads
it) — safe to leave, or delete explicitly:

```sql
delete from public.course_access where course_slug = 'ai-engineering-crash-course';
```

---

## Server-side course access check (`check_course_access`)

`hasCourseAccess()` (`src/data/courseAccess.js`, now shared from
`@sypher/course-catalog/src/courseAccess`) is a pure client-side function —
until now the only place it was ever called was `apps/docs`'s `DocRoot`
guard, a `useEffect` that runs *after* the page and its content chunk have
already downloaded. That's enforceable in the browser but not against a
direct HTTP request (curl, a disabled-JS client, or a request straight at
the compiled chunk file). `check_course_access` is a `security definer` RPC
that runs the exact same access logic server-side, in one round trip, under
`auth.uid()` — used by `apps/docs/middleware.ts` (Vercel Edge Middleware) to
gate both premium doc pages and their isolated content chunks before any
bytes are served. Safe to call from anon/authenticated: it only returns a
boolean, never row data, and a course with no `course_access` row at all
resolves to "admin only" — same default-locked-down behavior described
above, so a brand-new course is safe the moment its docs folder exists,
before an admin has granted anyone access to it.

```sql
create or replace function public.check_course_access(p_course_slug text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_company text;
  v_allowed_roles public.user_role[];
begin
  if auth.uid() is null then
    return false;
  end if;

  select role, company_name into v_role, v_company
  from public.profiles where id = auth.uid();

  if v_role = 'admin' then
    return true;
  end if;

  select allowed_roles into v_allowed_roles
  from public.course_access where course_slug = p_course_slug;

  if v_role is null then
    return coalesce('free_users' = any(v_allowed_roles), false);
  end if;

  if coalesce(v_role = any(v_allowed_roles), false) then
    return true;
  end if;

  if v_role = 'company_employees' and v_company is not null then
    return exists (
      select 1 from public.company_course_access
      where company_name = v_company and course_slug = p_course_slug
    );
  end if;

  return false;
end;
$$;

revoke execute on function public.check_course_access(text) from public;
grant execute on function public.check_course_access(text) to anon, authenticated;
```

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

## Editable profile fields (name + bio + current status + notice period + looking for + education status + resume + social links)

`/profile`'s About Me tab lets a user edit their own `bio` field (capped at
250 words), pick exactly **one** `current_status` (radio buttons: Open to
Opportunities, Actively Looking, In Notice Period) and exactly **one**
`notice_period` (radio buttons: Immediately available, Between 7 to 15 days,
30 Days, 45 Days, 60 Days, 90 Days) — each stored as a single enum value,
since both are single-select — pick **any number** of `looking_for` options
(checkboxes: Internship, Permanent Job - Onsite/Hybrid/Remote, Freelance,
Contractual) — stored as an array column, not a single value, since this is
multi-select — pick exactly **one** `education_status` (radio buttons:
Fresher, Passed Out, In Institution or University or College, Experienced)
— stored as a single enum value, since this is single-select — and upload a
resume (PDF only). Selecting "Passed Out" reveals a `passing_year` dropdown
(1980–2080, defaulting client-side to the current year minus one), the same
conditional-reveal pattern as "Experienced" revealing `experience_years`.
The resume file itself is uploaded straight from the browser to Bunny.net
storage (`src/data/bunnyUpload.js`, already used for blog cover
images/content) — Postgres only ever stores the resulting CDN URL in
`profiles.resume_url`. The user can also fill in any subset of six social
profile URLs (LinkedIn, GitHub, Medium, X, Substack, dev.to), stored
together as a single `social_links jsonb` column (e.g.
`{"github": "https://github.com/...", "x": "https://x.com/..."}`) rather
than six separate scalar columns — a fixed small set of optional strings
with no independent querying/filtering need, so one jsonb column avoids
growing `update_own_profile`'s argument list by six more positional params.
Any platform left blank is simply omitted from the object. Saved links are
rendered back as clickable badges on the same `/profile` page. `full_name`
is accepted by the RPC for backward
compatibility but the current UI never sends it (Name is no longer
shown/editable on `/profile`). There is deliberately **no** RLS `update`
policy granting authenticated users `update` on `profiles` — that would let
a user update *any* column on their own row, including `role`, by calling
`supabase.from('profiles').update(...)` directly from the browser console
with their own session. Instead, a `security definer` RPC exposes exactly
these columns, the same pattern as `extend_paid_until` (see
[Payments](#payments-razorpay-upgrades)):

```sql
alter table public.profiles
  add column if not exists bio text;

-- create type has no native IF NOT EXISTS — guard it so re-running this
-- block doesn't error (and never DROP the type, since that would cascade
-- into dropping the looking_for column below and wipe existing data)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'looking_for_type') then
    create type public.looking_for_type as enum (
      'internship', 'permanent_onsite', 'permanent_hybrid',
      'permanent_remote', 'freelance', 'contractual'
    );
  end if;
end;
$$;

-- If an earlier run of this migration already added looking_for as a
-- single scalar value, convert it to an array in place (wrapping any
-- existing value) instead of dropping/losing data.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'looking_for' and data_type <> 'ARRAY'
  ) then
    alter table public.profiles
      alter column looking_for type public.looking_for_type[]
      using case when looking_for is null then null else array[looking_for]::public.looking_for_type[] end;
  end if;
end;
$$;

alter table public.profiles
  add column if not exists looking_for public.looking_for_type[];

do $$
begin
  if not exists (select 1 from pg_type where typname = 'education_status_type') then
    create type public.education_status_type as enum (
      'fresher', 'passed_out', 'in_institution', 'experienced'
    );
  end if;
end;
$$;

-- If education_status_type already existed from an earlier migration
-- (before 'fresher' was added), add the missing enum value in place — ALTER
-- TYPE ... ADD VALUE can't run inside the same transaction as the CREATE
-- TYPE above on older Postgres, so this is a separate guarded block.
alter type public.education_status_type add value if not exists 'fresher';

alter table public.profiles
  add column if not exists education_status public.education_status_type;

alter table public.profiles
  add column if not exists experience_years integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_experience_years_range'
  ) then
    alter table public.profiles
      add constraint profiles_experience_years_range
      check (experience_years is null or experience_years between 1 and 30);
  end if;
end;
$$;

alter table public.profiles
  add column if not exists passing_year integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_passing_year_range'
  ) then
    alter table public.profiles
      add constraint profiles_passing_year_range
      check (passing_year is null or passing_year between 1980 and 2080);
  end if;
end;
$$;

alter table public.profiles
  add column if not exists resume_url text;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'current_status_type') then
    create type public.current_status_type as enum (
      'open_to_opportunities', 'actively_looking', 'in_notice_period'
    );
  end if;
end;
$$;

alter table public.profiles
  add column if not exists current_status public.current_status_type;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'notice_period_type') then
    create type public.notice_period_type as enum (
      'immediately_available', 'seven_to_fifteen_days', 'thirty_days',
      'forty_five_days', 'sixty_days', 'ninety_days'
    );
  end if;
end;
$$;

alter table public.profiles
  add column if not exists notice_period public.notice_period_type;

alter table public.profiles
  add column if not exists social_links jsonb;

drop function if exists public.update_own_profile(text, text);
drop function if exists public.update_own_profile(text, text, public.looking_for_type);
drop function if exists public.update_own_profile(text, text, public.looking_for_type[]);
drop function if exists public.update_own_profile(text, text, public.looking_for_type[], text);
drop function if exists public.update_own_profile(text, text, public.looking_for_type[], text, public.education_status_type);
drop function if exists public.update_own_profile(text, text, public.looking_for_type[], text, public.education_status_type, integer);
drop function if exists public.update_own_profile(text, text, public.looking_for_type[], text, public.education_status_type, integer, public.current_status_type, public.notice_period_type);
drop function if exists public.update_own_profile(text, text, public.looking_for_type[], text, public.education_status_type, integer, public.current_status_type, public.notice_period_type, integer);

create or replace function public.update_own_profile(
  p_full_name text,
  p_bio text,
  p_looking_for public.looking_for_type[] default null,
  p_resume_url text default null,
  p_education_status public.education_status_type default null,
  p_experience_years integer default null,
  p_current_status public.current_status_type default null,
  p_notice_period public.notice_period_type default null,
  p_passing_year integer default null,
  p_social_links jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_bio is not null
     and array_length(regexp_split_to_array(trim(p_bio), '\s+'), 1) > 250 then
    raise exception 'Bio must be 250 words or fewer';
  end if;

  update public.profiles
  set
    full_name = coalesce(p_full_name, full_name),
    bio = p_bio,
    looking_for = p_looking_for,
    resume_url = coalesce(p_resume_url, resume_url),
    education_status = p_education_status,
    experience_years = case when p_education_status = 'experienced' then p_experience_years else null end,
    current_status = p_current_status,
    notice_period = p_notice_period,
    passing_year = case when p_education_status = 'passed_out' then p_passing_year else null end,
    social_links = p_social_links
  where id = auth.uid();
end;
$$;

-- Scoped on purpose: this function only ever touches full_name/bio/
-- looking_for/resume_url/education_status/experience_years/current_status/
-- notice_period/passing_year/social_links for the caller's OWN row (where id
-- = auth.uid(), not a passed-in user id) — it can't be used to change role,
-- company_name, or anyone else's row, so granting it to `authenticated`
-- carries none of the self-elevation risk that a general `update` policy on
-- profiles would. resume_url uses coalesce (not a plain overwrite like the
-- other fields) because the Save button always re-sends the current
-- bio/looking_for/education_status/experience_years/current_status/
-- notice_period/passing_year/social_links, but a resume upload is a separate
-- action — passing null here must mean "leave the existing resume alone,"
-- not "delete it." experience_years is forced to null whenever
-- education_status isn't 'experienced', and passing_year is forced to null
-- whenever education_status isn't 'passed_out', both server-side, so a stale
-- value can't linger under the hood if a client ever forgets to clear it
-- when switching away from that option. current_status, notice_period, and
-- social_links are all independent of education_status/experience_years/
-- passing_year (and of each other), so all three use a plain overwrite like
-- bio/looking_for/education_status — the client always sends the full
-- current social_links object (with blank platforms omitted), never a
-- partial patch, so an overwrite is safe.
revoke execute on function public.update_own_profile(text, text, public.looking_for_type[], text, public.education_status_type, integer, public.current_status_type, public.notice_period_type, integer, jsonb) from public;
grant execute on function public.update_own_profile(text, text, public.looking_for_type[], text, public.education_status_type, integer, public.current_status_type, public.notice_period_type, integer, jsonb) to authenticated;

notify pgrst, 'reload schema';
```

The 250-word check is enforced both here (source of truth) and client-side
in `profile.tsx` (live counter, disables Save past the limit) — the client
check is for UX feedback, not security. `looking_for` is an array column on
`profiles` (not a separate table) since it's a 1:many-but-still-per-user
attribute — a join table would only be worth it if these options needed
their own metadata or were queried independently of the profile.
`education_status` is a plain scalar enum column (not an array like
`looking_for`) since only one value applies at a time. `experience_years`
is only meaningful when `education_status = 'experienced'` (the UI shows
the dropdown exclusively in that case), enforced with a `check` constraint
capping it to 1–30 and by the RPC itself nulling it out whenever the
incoming `education_status` isn't `'experienced'`. `passing_year` follows
the identical pattern for `'passed_out'` — only meaningful when
`education_status = 'passed_out'` (the UI shows its dropdown exclusively in
that case), enforced with a `check` constraint capping it to 1980–2080 and
nulled server-side whenever `education_status` isn't `'passed_out'`.
`current_status` and `notice_period` are likewise plain scalar enum
columns, each independent of the other and of
`education_status`/`experience_years`/`passing_year` — the UI always shows
both radio groups (no conditional show/hide), so unlike `experience_years`/
`passing_year` there's no server-side nulling logic tied to a sibling
field's value.

`social_links` is a single `jsonb` column rather than six scalar columns
(`linkedin_url`, `github_url`, etc.) — the six platforms (LinkedIn, GitHub,
Medium, X, Substack, dev.to) are a fixed, small, optional set that's never
queried or filtered on independently of the profile itself, so a jsonb blob
avoids both six more `alter table add column` statements and six more
positional arguments on `update_own_profile`. The client
(`src/pages/profile.tsx`) always sends the full current object with blank
platforms omitted (`src/data/profiles.js`'s `updateOwnBio` strips any
empty/whitespace-only values before sending), so the RPC's plain overwrite
is safe — there's no partial-patch case to worry about clobbering.

`resume_url` just stores a CDN URL — the actual PDF bytes live in Bunny.net
storage, uploaded directly from the browser via `uploadToBunny()`
(`src/data/bunnyUpload.js`), the same helper already used for blog cover
images. `profile.tsx` restricts the file picker to `application/pdf` and
also checks `file.type`/extension client-side before upload; Bunny.net
itself does not enforce a content-type restriction, so this is a UX
guardrail, not a security boundary — resumes are self-uploaded by their own
owner, so there's no cross-user risk in accepting whatever they choose to
upload to their own `resume/<user-id>/` path.

If you already ran an earlier version of `update_own_profile` (the original
two-argument form, the three-argument single-value form, the
three-argument array form, the four-argument form before `education_status`
was added, the six-argument form before `current_status`/`notice_period`
were added, the eight-argument form before `passing_year` was added, or the
nine-argument form before `social_links` was added), the `drop function if
exists` lines above remove those overloads before `create or replace`
defines the current ten-argument version — otherwise Postgres would keep
multiple overloaded signatures side by side.

---

## Profile total experience — months (`experience_months`)

`experience_years` alone can't express "2 years 6 months" — this adds a
sibling `experience_months` column (0-11) so total experience is captured
as years + months together on `/profile`. Follows `experience_years`'
exact pattern: capped by a `check` constraint, and nulled server-side by
`update_own_profile` whenever `education_status` isn't `'experienced'`.

```sql
alter table public.profiles
  add column if not exists experience_months integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_experience_months_range'
  ) then
    alter table public.profiles
      add constraint profiles_experience_months_range
      check (experience_months is null or experience_months between 0 and 11);
  end if;
end;
$$;

drop function if exists public.update_own_profile(text, text, public.looking_for_type[], text, public.education_status_type, integer, public.current_status_type, public.notice_period_type, integer, jsonb);

create or replace function public.update_own_profile(
  p_full_name text,
  p_bio text,
  p_looking_for public.looking_for_type[] default null,
  p_resume_url text default null,
  p_education_status public.education_status_type default null,
  p_experience_years integer default null,
  p_current_status public.current_status_type default null,
  p_notice_period public.notice_period_type default null,
  p_passing_year integer default null,
  p_social_links jsonb default null,
  p_experience_months integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_bio is not null
     and array_length(regexp_split_to_array(trim(p_bio), '\s+'), 1) > 250 then
    raise exception 'Bio must be 250 words or fewer';
  end if;

  update public.profiles
  set
    full_name = coalesce(p_full_name, full_name),
    bio = p_bio,
    looking_for = p_looking_for,
    resume_url = coalesce(p_resume_url, resume_url),
    education_status = p_education_status,
    experience_years = case when p_education_status = 'experienced' then p_experience_years else null end,
    experience_months = case when p_education_status = 'experienced' then p_experience_months else null end,
    current_status = p_current_status,
    notice_period = p_notice_period,
    passing_year = case when p_education_status = 'passed_out' then p_passing_year else null end,
    social_links = p_social_links
  where id = auth.uid();
end;
$$;

revoke execute on function public.update_own_profile(text, text, public.looking_for_type[], text, public.education_status_type, integer, public.current_status_type, public.notice_period_type, integer, jsonb, integer) from public;
grant execute on function public.update_own_profile(text, text, public.looking_for_type[], text, public.education_status_type, integer, public.current_status_type, public.notice_period_type, integer, jsonb, integer) to authenticated;

notify pgrst, 'reload schema';
```

`experience_months` mirrors `experience_years` exactly: same conditional
nulling tied to `education_status = 'experienced'`, same self-scoped RPC
(`where id = auth.uid()`), just a narrower 0-11 range since it represents
the remainder-months component of total experience, not a standalone value.

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

## Blog posts (`blog_posts`)

Adds `/manage-blog` (draft/edit/delete/publish posts) and the public
`/blog` + `/blog/:slug` pages. Authoring access is admin, plus whichever
roles an admin grants `nav_access` for `manage-blog-post` on
`/manage-access` — no separate blog-specific access table. If your project
predates this, run the migration below against an existing database —
idempotent, safe to re-run. If you're running the
[fresh schema](#fresh-schema-all-tables) from scratch, section 8 above
already includes this.

```sql
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null check (char_length(title) <= 80),
  description text not null check (char_length(description) <= 120),
  content text not null default '',
  cover_image_url text,
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published')),
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

alter table public.blog_posts enable row level security;

alter table public.blog_posts add column if not exists tags text[] not null default '{}';

create or replace function public.can_manage_blog()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'admin'
        or p.role::text = any(
          select unnest(allowed_roles)::text from public.nav_access
          where item_key = 'manage-blog-post'
        )
      )
  );
$$;

drop policy if exists "anyone can read published posts" on public.blog_posts;
create policy "anyone can read published posts" on public.blog_posts
  for select using (status = 'published');

drop policy if exists "authorized roles manage blog posts" on public.blog_posts;
create policy "authorized roles manage blog posts" on public.blog_posts
  for all using (public.can_manage_blog()) with check (public.can_manage_blog());

-- lets scripts/watch-blog-posts.mjs (npm run dev / npm run start) receive
-- live postgres_changes events and re-bake blog-content/ without a
-- dev-server restart. Safe to re-run — no-op if already added.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'blog_posts'
  ) then
    alter publication supabase_realtime add table public.blog_posts;
  end if;
end $$;

notify pgrst, 'reload schema';
```

---

## Taxonomy (career domains, roles, skills, technologies)

Adds a shared reference catalog — career **domains** (e.g. "MLOps"), **base
roles**/designations with seniority variants (e.g. "MLOps Engineer" at
`base`/`senior`/`staff`), **skills** (concepts/practices — "System Design",
"CI/CD"), and **technologies** (named tools/products — "Python",
"Kubernetes"), each technology bucketed into a **technology category**. This
is edited occasionally by an admin (`/manage-access` Taxonomy tab) and read
constantly by every user (the `/profile` skills/designation pickers), so it's
modeled and cached very differently from per-user data:

- Catalog tables (`domains`, `base_roles`, `skills`, `technologies`,
  `technology_categories`, the three junction tables, `taxonomy_meta`) are
  public-read, admin-write, and served through a cached endpoint
  (`GET /api/taxonomy` — see [Caching](#caching-the-taxonomy-catalog) below).
- Per-user picks (`user_skills`, `user_technologies`, plus two new columns on
  `profiles`) are self-scoped by RLS and read **live** on every request —
  never routed through the cached endpoint.

Roles, skills, and technologies are **global catalog rows** linked to
domains via many-to-many join tables, so "Python" pasted under both "MLOps"
and "Data Engineering" links one row twice instead of creating a duplicate.
A single cross-table registry, `taxonomy_slugs`, is the authoritative answer
to "does this name already exist, and as what kind (role/skill/technology)"
— this is what makes an admin's skill-vs-technology classification durable:
once "Model Drift" is saved as a `skill`, pasting that name again (even
under a different domain) resolves to the existing skill row instead of a
keyword guesser creating a duplicate technology row.

```sql
-- ── slugify helper (shared by every taxonomy insert below) ──
create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(trim(input)), '[^a-z0-9]+', '-', 'g'));
$$;

-- ── core catalog tables ──
-- Values below 'principal' (l1-l6/architect/manager) were added later —
-- see "Seniority levels — adding L1-L6/Architect/Manager" for the
-- ALTER TYPE migration that adds them to an already-existing enum.
do $$ begin
  create type public.seniority_level as enum (
    'base', 'senior', 'lead', 'staff', 'principal',
    'l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'architect', 'manager'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.technology_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

insert into public.technology_categories (name, slug)
  values ('Uncategorized', 'uncategorized')
  on conflict (slug) do nothing;

create table if not exists public.base_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  seniority_levels public.seniority_level[] not null default '{base}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.technologies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  technology_category_id uuid not null references public.technology_categories(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.domain_roles (
  domain_id uuid not null references public.domains(id) on delete cascade,
  role_id uuid not null references public.base_roles(id) on delete cascade,
  primary key (domain_id, role_id)
);

create table if not exists public.domain_skills (
  domain_id uuid not null references public.domains(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  primary key (domain_id, skill_id)
);

create table if not exists public.domain_technologies (
  domain_id uuid not null references public.domains(id) on delete cascade,
  technology_id uuid not null references public.technologies(id) on delete cascade,
  primary key (domain_id, technology_id)
);

create table if not exists public.taxonomy_meta (
  id smallint primary key default 1 check (id = 1),
  version integer not null default 1,
  updated_at timestamptz not null default now()
);
insert into public.taxonomy_meta (id, version) values (1, 1) on conflict (id) do nothing;

-- Cross-table slug registry — see explanation above. kind must agree with
-- whichever of base_roles/skills/technologies item_id actually lives in;
-- the admin_save_taxonomy_category RPC below is the only writer and
-- enforces this invariant itself (no DB-level FK, since item_id can point
-- into one of three different tables).
create table if not exists public.taxonomy_slugs (
  slug text primary key,
  kind text not null check (kind in ('role', 'skill', 'technology')),
  item_id uuid not null
);

alter table public.domains enable row level security;
alter table public.technology_categories enable row level security;
alter table public.base_roles enable row level security;
alter table public.technologies enable row level security;
alter table public.skills enable row level security;
alter table public.domain_roles enable row level security;
alter table public.domain_skills enable row level security;
alter table public.domain_technologies enable row level security;
alter table public.taxonomy_meta enable row level security;
alter table public.taxonomy_slugs enable row level security;

drop policy if exists "public read" on public.domains;
drop policy if exists "admins manage" on public.domains;
create policy "public read" on public.domains for select using (true);
create policy "admins manage" on public.domains for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read" on public.technology_categories;
drop policy if exists "admins manage" on public.technology_categories;
create policy "public read" on public.technology_categories for select using (true);
create policy "admins manage" on public.technology_categories for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read" on public.base_roles;
drop policy if exists "admins manage" on public.base_roles;
create policy "public read" on public.base_roles for select using (true);
create policy "admins manage" on public.base_roles for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read" on public.technologies;
drop policy if exists "admins manage" on public.technologies;
create policy "public read" on public.technologies for select using (true);
create policy "admins manage" on public.technologies for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read" on public.skills;
drop policy if exists "admins manage" on public.skills;
create policy "public read" on public.skills for select using (true);
create policy "admins manage" on public.skills for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read" on public.domain_roles;
drop policy if exists "admins manage" on public.domain_roles;
create policy "public read" on public.domain_roles for select using (true);
create policy "admins manage" on public.domain_roles for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read" on public.domain_skills;
drop policy if exists "admins manage" on public.domain_skills;
create policy "public read" on public.domain_skills for select using (true);
create policy "admins manage" on public.domain_skills for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read" on public.domain_technologies;
drop policy if exists "admins manage" on public.domain_technologies;
create policy "public read" on public.domain_technologies for select using (true);
create policy "admins manage" on public.domain_technologies for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read" on public.taxonomy_meta;
drop policy if exists "admins manage" on public.taxonomy_meta;
create policy "public read" on public.taxonomy_meta for select using (true);
create policy "admins manage" on public.taxonomy_meta for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read" on public.taxonomy_slugs;
drop policy if exists "admins manage" on public.taxonomy_slugs;
create policy "public read" on public.taxonomy_slugs for select using (true);
create policy "admins manage" on public.taxonomy_slugs for all using (public.is_admin()) with check (public.is_admin());

-- ── Atomic admin upsert RPC ──
-- Payload shape:
-- {
--   domain: { name: text },
--   roles: [{ name: text, seniorityLevels: text[] }],
--   skills: [{ name: text }],
--   technologies: [{ name: text, categoryId?: uuid, categoryName?: text }]
-- }
--
-- Single plpgsql function, one transaction, no sub-commits: is_admin()
-- guard (raises 'not authorized' and writes nothing if the caller isn't an
-- admin) -> upsert domain by slug -> for each role/skill/technology, look
-- up its slug in taxonomy_slugs FIRST (global dedupe across kinds — this
-- is what makes classification sticky) or insert a new catalog row +
-- registry entry. If the slug is already registered under a DIFFERENT kind
-- than the caller sent it as (e.g. pasted into the technologies box here,
-- but it's an existing skill from another category's save), this does not
-- raise — it links the existing item under its true kind instead. A bulk
-- paste has no way to know every name's prior classification ahead of
-- time, so a mismatch is corrected silently rather than failing the whole
-- save -> resolve each technology's category (by id, by name —
-- creating it inline if new — or fall back to Uncategorized) -> sync
-- domain_roles/domain_skills/domain_technologies for this domain to
-- exactly the given sets (insert new links, delete links no longer
-- present — this is how "remove" works in the edit-later flow; it never
-- deletes the global catalog row itself, only this domain's link to it)
-- -> bump taxonomy_meta -> return the fresh domain subtree. A failure
-- anywhere inside raises and the whole function's implicit transaction
-- rolls back — there is no COMMIT/savepoint inside it to partially persist.
create or replace function public.admin_save_taxonomy_category(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain_id uuid;
  v_domain_slug text;
  v_domain_name text;
  v_role jsonb;
  v_skill jsonb;
  v_tech jsonb;
  v_slug text;
  v_name text;
  v_id uuid;
  v_kind text;
  v_seniority public.seniority_level[];
  v_category_id uuid;
  v_category_name text;
  v_role_ids uuid[] := '{}';
  v_skill_ids uuid[] := '{}';
  v_tech_ids uuid[] := '{}';
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  v_domain_name := payload->'domain'->>'name';
  if v_domain_name is null or trim(v_domain_name) = '' then
    raise exception 'domain name is required';
  end if;
  v_domain_slug := public.slugify(v_domain_name);

  select id into v_domain_id from public.domains where slug = v_domain_slug;
  if v_domain_id is null then
    insert into public.domains (name, slug) values (trim(v_domain_name), v_domain_slug)
      returning id into v_domain_id;
  else
    update public.domains set name = trim(v_domain_name) where id = v_domain_id;
  end if;

  -- roles
  for v_role in select * from jsonb_array_elements(coalesce(payload->'roles', '[]'::jsonb))
  loop
    v_name := trim(v_role->>'name');
    if v_name is null or v_name = '' then
      continue;
    end if;
    v_slug := public.slugify(v_name);
    v_seniority := coalesce(
      (select array_agg(x::public.seniority_level) from jsonb_array_elements_text(coalesce(v_role->'seniorityLevels', '[]'::jsonb)) x),
      '{base}'::public.seniority_level[]
    );

    select item_id, kind into v_id, v_kind from public.taxonomy_slugs where slug = v_slug;
    if v_id is not null and v_kind <> 'role' then
      if v_kind = 'skill' then
        update public.skills set name = v_name, updated_at = now() where id = v_id;
        v_skill_ids := v_skill_ids || v_id;
      elsif v_kind = 'technology' then
        update public.technologies set name = v_name, updated_at = now() where id = v_id;
        v_tech_ids := v_tech_ids || v_id;
      end if;
      continue;
    end if;

    if v_id is null then
      insert into public.base_roles (name, slug, seniority_levels)
        values (v_name, v_slug, v_seniority)
        returning id into v_id;
      insert into public.taxonomy_slugs (slug, kind, item_id) values (v_slug, 'role', v_id);
    else
      update public.base_roles
        set name = v_name,
            seniority_levels = (select array_agg(distinct e) from unnest(seniority_levels || v_seniority) e),
            updated_at = now()
        where id = v_id;
    end if;

    v_role_ids := v_role_ids || v_id;
  end loop;

  -- skills
  for v_skill in select * from jsonb_array_elements(coalesce(payload->'skills', '[]'::jsonb))
  loop
    v_name := trim(v_skill->>'name');
    if v_name is null or v_name = '' then
      continue;
    end if;
    v_slug := public.slugify(v_name);

    select item_id, kind into v_id, v_kind from public.taxonomy_slugs where slug = v_slug;
    if v_id is not null and v_kind <> 'skill' then
      if v_kind = 'role' then
        update public.base_roles set name = v_name, updated_at = now() where id = v_id;
        v_role_ids := v_role_ids || v_id;
      elsif v_kind = 'technology' then
        update public.technologies set name = v_name, updated_at = now() where id = v_id;
        v_tech_ids := v_tech_ids || v_id;
      end if;
      continue;
    end if;

    if v_id is null then
      insert into public.skills (name, slug) values (v_name, v_slug) returning id into v_id;
      insert into public.taxonomy_slugs (slug, kind, item_id) values (v_slug, 'skill', v_id);
    else
      update public.skills set name = v_name, updated_at = now() where id = v_id;
    end if;

    v_skill_ids := v_skill_ids || v_id;
  end loop;

  -- technologies
  for v_tech in select * from jsonb_array_elements(coalesce(payload->'technologies', '[]'::jsonb))
  loop
    v_name := trim(v_tech->>'name');
    if v_name is null or v_name = '' then
      continue;
    end if;
    v_slug := public.slugify(v_name);

    v_category_id := case when v_tech->>'categoryId' is not null then (v_tech->>'categoryId')::uuid else null end;
    if v_category_id is null then
      v_category_name := trim(v_tech->>'categoryName');
      if v_category_name is not null and v_category_name <> '' then
        select id into v_category_id from public.technology_categories where slug = public.slugify(v_category_name);
        if v_category_id is null then
          insert into public.technology_categories (name, slug)
            values (v_category_name, public.slugify(v_category_name))
            returning id into v_category_id;
        end if;
      else
        select id into v_category_id from public.technology_categories where slug = 'uncategorized';
      end if;
    end if;

    select item_id, kind into v_id, v_kind from public.taxonomy_slugs where slug = v_slug;
    if v_id is not null and v_kind <> 'technology' then
      if v_kind = 'role' then
        update public.base_roles set name = v_name, updated_at = now() where id = v_id;
        v_role_ids := v_role_ids || v_id;
      elsif v_kind = 'skill' then
        update public.skills set name = v_name, updated_at = now() where id = v_id;
        v_skill_ids := v_skill_ids || v_id;
      end if;
      continue;
    end if;

    if v_id is null then
      insert into public.technologies (name, slug, technology_category_id)
        values (v_name, v_slug, v_category_id)
        returning id into v_id;
      insert into public.taxonomy_slugs (slug, kind, item_id) values (v_slug, 'technology', v_id);
    else
      update public.technologies
        set name = v_name, technology_category_id = coalesce(v_category_id, technology_category_id), updated_at = now()
        where id = v_id;
    end if;

    v_tech_ids := v_tech_ids || v_id;
  end loop;

  -- sync this domain's junction links to exactly the given sets (an empty
  -- set removes every existing link for this domain, per kind)
  delete from public.domain_roles
    where domain_id = v_domain_id and role_id <> all (v_role_ids);
  insert into public.domain_roles (domain_id, role_id)
    select v_domain_id, r from unnest(v_role_ids) r
    on conflict do nothing;

  delete from public.domain_skills
    where domain_id = v_domain_id and skill_id <> all (v_skill_ids);
  insert into public.domain_skills (domain_id, skill_id)
    select v_domain_id, s from unnest(v_skill_ids) s
    on conflict do nothing;

  delete from public.domain_technologies
    where domain_id = v_domain_id and technology_id <> all (v_tech_ids);
  insert into public.domain_technologies (domain_id, technology_id)
    select v_domain_id, t from unnest(v_tech_ids) t
    on conflict do nothing;

  update public.taxonomy_meta set version = version + 1, updated_at = now() where id = 1;

  return jsonb_build_object(
    'domainId', v_domain_id,
    'roleIds', v_role_ids,
    'skillIds', v_skill_ids,
    'technologyIds', v_tech_ids
  );
end;
$$;

-- HARD REQUIREMENT: granted to `authenticated`, not `service_role` — the
-- caller here is a trusted logged-in admin session (unlike the Razorpay
-- webhook path), so the internal is_admin() check above is the actual
-- security boundary. Verify with the same discipline as extend_paid_until:
--   select grantee, privilege_type from information_schema.role_routine_grants
--   where routine_name = 'admin_save_taxonomy_category';
-- — must show authenticated (and the definer-owner) with EXECUTE, never
-- anon/public standing alone without the is_admin() guard also in place.
revoke all on function public.admin_save_taxonomy_category(jsonb) from public, anon;
grant execute on function public.admin_save_taxonomy_category(jsonb) to authenticated;

-- ── Per-user taxonomy picks — separate, self-scoped, always-live tables ──
create table if not exists public.user_skills (
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  proficiency text check (proficiency in ('beginner','intermediate','advanced','expert')),
  years_experience integer,
  created_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);

create table if not exists public.user_technologies (
  user_id uuid not null references auth.users(id) on delete cascade,
  technology_id uuid not null references public.technologies(id) on delete cascade,
  proficiency text check (proficiency in ('beginner','intermediate','advanced','expert')),
  years_experience integer,
  created_at timestamptz not null default now(),
  primary key (user_id, technology_id)
);

alter table public.user_skills enable row level security;
alter table public.user_technologies enable row level security;

drop policy if exists "users manage own skills" on public.user_skills;
create policy "users manage own skills" on public.user_skills
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "admins read all user skills" on public.user_skills;
create policy "admins read all user skills" on public.user_skills for select using (public.is_admin());

drop policy if exists "users manage own technologies" on public.user_technologies;
create policy "users manage own technologies" on public.user_technologies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "admins read all user technologies" on public.user_technologies;
create policy "admins read all user technologies" on public.user_technologies for select using (public.is_admin());

-- "role/designation the user identifies as" — FK into base_roles, never
-- free text, so renaming a role in the admin tab updates everywhere.
alter table public.profiles add column if not exists designation_id uuid references public.base_roles(id);
alter table public.profiles add column if not exists designation_seniority public.seniority_level;

-- Self-service update, mirrors update_own_profile's self-scoping pattern
-- (where id = auth.uid(), no user-id parameter — cannot target another
-- user's row) but kept as its own function so update_own_profile's
-- argument list doesn't keep growing.
create or replace function public.update_own_designation(p_designation_id uuid, p_seniority public.seniority_level)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set designation_id = p_designation_id, designation_seniority = p_seniority
  where id = auth.uid();
end;
$$;
revoke all on function public.update_own_designation(uuid, public.seniority_level) from public, anon;
grant execute on function public.update_own_designation(uuid, public.seniority_level) to authenticated;

notify pgrst, 'reload schema';
```

`user_skills`/`user_technologies` have no sensitive column (unlike
`profiles.role`), so `/profile` reads/writes them with direct
`supabase.from('user_skills')...` calls under RLS — no RPC indirection
needed, the same reasoning that keeps `nav_access`/`course_access` writes
direct while `profiles` itself routes through an RPC (to block
self-role-elevation).

### Caching (the taxonomy catalog)

`GET /api/taxonomy` (`api/taxonomy.js`) is the first cached endpoint in this
repo. It uses the **anon** key — every catalog table's read policy is
`using (true)`, no auth required — and layers two caches:

1. A module-level in-memory `{ version, data }` cache inside the serverless
   function, which survives warm invocations of the same lambda instance.
2. An HTTP `Cache-Control: public, s-maxage=300, stale-while-revalidate=3600`
   header, so Vercel's edge/CDN caches the response across invocations and
   instances.

The one query that is **never** itself cached or skipped is
`select version from taxonomy_meta` — it runs on every single request. Only
the assembled tree (the expensive part: every domain/role/skill/technology/
category plus all three junction tables, joined into nested JSON) is cached,
keyed by that version number. `admin_save_taxonomy_category` bumps
`taxonomy_meta.version` as the last step of its transaction, so the next
`GET` — on any instance, warm or cold — sees a version mismatch, discards
its stale in-memory tree, and rebuilds it. Skipping the version check would
be exactly how invalidation could silently break on a long-lived warm
lambda; it's the one query in this endpoint that isn't subject to any cache.

---

## Payments (Razorpay upgrades)

Free → Paid upgrades (`profiles.role: free_users` → `paid_users`) are paid
for via Razorpay and processed by a small set of Vercel Serverless
Functions under `api/razorpay/` and `api/cron/`. This is the one deliberate,
narrowly-scoped exception to this repo's anon-key-only rule stated at the
top of this file: those functions — and only those functions — hold
`SUPABASE_SERVICE_ROLE_KEY` server-side, because verifying a payment and
then upgrading a role is a trusted write that must bypass the normal RLS
(which otherwise only lets `admin` update `role`). See `api/_lib/supabaseAdmin.js`
for the single place that key is used.

```sql
alter table public.profiles
  add column if not exists paid_until timestamptz;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  razorpay_order_id text not null unique,
  razorpay_payment_id text unique,
  amount_paise integer not null,
  base_amount_paise integer not null,
  gst_amount_paise integer not null,
  gst_rate numeric not null default 0.18,
  currency text not null default 'INR',
  plan text not null default 'paid_users_1y',
  status text not null default 'created' check (status in ('created', 'paid', 'failed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.payments enable row level security;

create policy "users read own payments" on public.payments
  for select using (auth.uid() = user_id);

create policy "admins read all payments" on public.payments
  for select using (public.is_admin());

-- deliberately no insert/update policy for anon/authenticated — only the
-- service-role serverless functions write to this table, bypassing RLS.

create table public.cron_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  run_at timestamptz not null default now(),
  rows_affected integer,
  success boolean not null,
  error text
);

alter table public.cron_runs enable row level security;

create policy "admins read cron runs" on public.cron_runs
  for select using (public.is_admin());

-- Additive renewal: a user renewing early keeps remaining time rather than
-- resetting to a fresh year from "now". Single atomic UPDATE (no
-- read-then-write in application code) so this can't race against the
-- daily cron expiry job in api/cron/expire-paid-users.js — whichever
-- commits second sees the other's already-written row and acts on live
-- state, never a stale cached value.
create or replace function public.extend_paid_until(p_user_id uuid, p_days integer)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  new_paid_until timestamptz;
begin
  update public.profiles
  set
    paid_until = greatest(coalesce(paid_until, now()), now()) + (p_days || ' days')::interval,
    role = 'paid_users'
  where id = p_user_id
  returning paid_until into new_paid_until;

  return new_paid_until;
end;
$$;

-- HARD REQUIREMENT: this function is security definer and flips role to
-- paid_users, so it must be UNCALLABLE by anon or authenticated — otherwise
-- any logged-in user could call supabase.rpc('extend_paid_until', ...) with
-- their own anon-key session and self-upgrade for free, no payment
-- required. Only the service-role client (used exclusively inside
-- api/_lib/finalizePayment.js) may call it. Verify with:
--   select grantee, privilege_type from information_schema.role_routine_grants
--   where routine_name = 'extend_paid_until';
-- — must show only service_role (and definer-owner) with EXECUTE, never
-- anon/authenticated/public.
revoke execute on function public.extend_paid_until(uuid, integer) from public;
revoke execute on function public.extend_paid_until(uuid, integer) from anon;
revoke execute on function public.extend_paid_until(uuid, integer) from authenticated;
grant execute on function public.extend_paid_until(uuid, integer) to service_role;
```

### Why `payments` is a separate table, not just fields on `profiles`

Audit trail (`created` vs `paid` vs `failed`), idempotency (a Razorpay
webhook retry or a client-retry-plus-webhook race can't double-upgrade —
see `api/_lib/finalizePayment.js`), and a place for `/profile` to show "last
attempt failed, try again." Abandoned `created` rows (checkout started,
never completed) are left as-is — each new attempt gets its own order/row,
so a stale one never blocks a retry.

---

## Resume Reviews & Mock Interview (credits)

Gates the "Resume Review" / "Mock Interview" features behind a per-user
allowance: every role gets a plan-level default number of free uses,
any individual user can get an additive bonus on top of that from an
admin, and once both are exhausted further uses are paid for out of a
**credits** balance (bought in packs, converted to feature-uses at an
admin-configurable rate, each purchased lot expiring exactly 1 year after
purchase). This mirrors the two existing patterns in this file: pure
admin-config tables are written directly from the client under an
`is_admin()` RLS policy (same as `course_access`), and anything that
mutates a balance goes through a `security definer` RPC with an explicit
`revoke`/`grant` block (same as `extend_paid_until`).

```sql
-- ============================================================
-- 1. PLAN_FEATURE_DEFAULTS (admin-editable per-role allowance — src/data/featureCredits.js)
-- ============================================================
create table if not exists public.plan_feature_defaults (
  role text primary key check (role in ('free_users', 'paid_users')),
  resume_reviews_included integer not null default 0,
  mock_interviews_included integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.plan_feature_defaults enable row level security;

create policy "authenticated read plan feature defaults"
  on public.plan_feature_defaults for select
  to authenticated
  using (true);

create policy "admins write plan feature defaults"
  on public.plan_feature_defaults for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.plan_feature_defaults (role, resume_reviews_included, mock_interviews_included)
values ('free_users', 0, 0), ('paid_users', 2, 3)
on conflict (role) do nothing;

-- ============================================================
-- 2. USER_FEATURE_OVERRIDES (per-user additive bonus — src/data/featureCredits.js)
-- ============================================================
create table if not exists public.user_feature_overrides (
  user_id uuid primary key references auth.users(id) on delete cascade,
  resume_reviews_bonus integer not null default 0,
  mock_interviews_bonus integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_feature_overrides enable row level security;

create policy "users read own feature overrides"
  on public.user_feature_overrides for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

create policy "admins write feature overrides"
  on public.user_feature_overrides for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- 3. FEATURE_USAGE (tracks drawdown of included allowance — mutated only via consume_feature RPC)
-- ============================================================
create table if not exists public.feature_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('resume_review', 'mock_interview')),
  used_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, feature)
);

alter table public.feature_usage enable row level security;

create policy "users read own feature usage"
  on public.feature_usage for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- No insert/update policy for anon/authenticated on purpose — this table
-- is only ever mutated inside consume_feature(), which is security
-- definer and checks auth.uid() = p_user_id itself. Same "no client
-- write path" shape as payments.

-- ============================================================
-- 4. CREDIT_CONVERSION_RATES (admin-editable credits-per-use — src/data/featureCredits.js)
-- ============================================================
create table if not exists public.credit_conversion_rates (
  feature text primary key check (feature in ('resume_review', 'mock_interview')),
  credits_per_use integer not null,
  updated_at timestamptz not null default now()
);

alter table public.credit_conversion_rates enable row level security;

create policy "authenticated read conversion rates"
  on public.credit_conversion_rates for select
  to authenticated
  using (true);

create policy "admins write conversion rates"
  on public.credit_conversion_rates for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.credit_conversion_rates (feature, credits_per_use)
values ('resume_review', 5), ('mock_interview', 20)
on conflict (feature) do nothing;

-- ============================================================
-- 5. CREDIT_PACKS (admin-editable Bronze/Silver/Gold/Ultra packs — src/data/featureCredits.js)
-- ============================================================
create table if not exists public.credit_packs (
  id uuid primary key default gen_random_uuid(),
  tier text unique not null check (tier in ('bronze', 'silver', 'gold', 'ultra')),
  name text not null,
  credits integer not null,
  price_paise integer not null,
  currency text not null default 'INR',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.credit_packs enable row level security;

-- anon too: the public marketing pages show pack pricing to logged-out
-- visitors as part of the upgrade/buy-credits CTA.
create policy "anyone reads active credit packs"
  on public.credit_packs for select
  to anon, authenticated
  using (is_active or public.is_admin());

create policy "admins write credit packs"
  on public.credit_packs for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Seed prices are placeholders — edit from the admin tab at any time.
insert into public.credit_packs (tier, name, credits, price_paise, sort_order)
values
  ('bronze', 'Bronze Pack', 20, 19900, 1),
  ('silver', 'Silver Pack', 50, 39900, 2),
  ('gold', 'Gold Pack', 120, 79900, 3),
  ('ultra', 'Ultra Pack', 300, 149900, 4)
on conflict (tier) do nothing;

-- ============================================================
-- 6. CREDIT_LOTS (purchased/granted credit balances, FIFO by expiry — src/data/featureCredits.js)
-- ============================================================
create table if not exists public.credit_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credits_purchased integer not null,
  credits_remaining integer not null,
  source text not null check (source in ('pack_purchase', 'admin_grant')),
  pack_tier text,
  payment_id uuid references public.payments(id),
  purchased_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.credit_lots enable row level security;

create index if not exists credit_lots_user_expiry_idx
  on public.credit_lots (user_id, expires_at);

create policy "users read own credit lots"
  on public.credit_lots for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- No client write policy — every lot expires exactly 1 year after
-- purchase (purchased_at + interval '1 year'), and every row is minted
-- exclusively by grant_credit_lot() (service_role only) or drained by
-- consume_feature() (security definer). A user's own anon-key session
-- can never insert or top up a lot directly.

-- ============================================================
-- 7. CREDIT_TRANSACTIONS (audit ledger, mirrors why `payments` is separate — src/data/featureCredits.js)
-- ============================================================
create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  reason text not null check (reason in ('pack_purchase', 'admin_grant', 'feature_consumed')),
  feature text check (feature is null or feature in ('resume_review', 'mock_interview')),
  lot_id uuid references public.credit_lots(id),
  created_at timestamptz not null default now()
);

alter table public.credit_transactions enable row level security;

create policy "users read own credit transactions"
  on public.credit_transactions for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- ============================================================
-- 8. PAYMENTS — add credit-pack columns (extends table in the Payments section above)
-- ============================================================
alter table public.payments
  add column if not exists kind text not null default 'subscription' check (kind in ('subscription', 'credit_pack')),
  add column if not exists pack_tier text,
  add column if not exists credits integer;

-- ============================================================
-- 9. get_feature_status(p_user_id) — single-round-trip read for dashboard + marketing gate
-- ============================================================
create or replace function public.get_feature_status(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_role text;
  v_resume_default int;
  v_mock_default int;
  v_resume_bonus int;
  v_mock_bonus int;
  v_resume_used int;
  v_mock_used int;
  v_resume_rate int;
  v_mock_rate int;
  v_credit_balance int;
begin
  if auth.uid() <> p_user_id and not public.is_admin() then
    raise exception 'forbidden';
  end if;

  select role::text into v_role from public.profiles where id = p_user_id;

  select resume_reviews_included, mock_interviews_included
    into v_resume_default, v_mock_default
    from public.plan_feature_defaults
    where role = v_role;
  v_resume_default := coalesce(v_resume_default, 0);
  v_mock_default := coalesce(v_mock_default, 0);

  select resume_reviews_bonus, mock_interviews_bonus
    into v_resume_bonus, v_mock_bonus
    from public.user_feature_overrides
    where user_id = p_user_id;
  v_resume_bonus := coalesce(v_resume_bonus, 0);
  v_mock_bonus := coalesce(v_mock_bonus, 0);

  select used_count into v_resume_used
    from public.feature_usage where user_id = p_user_id and feature = 'resume_review';
  v_resume_used := coalesce(v_resume_used, 0);

  select used_count into v_mock_used
    from public.feature_usage where user_id = p_user_id and feature = 'mock_interview';
  v_mock_used := coalesce(v_mock_used, 0);

  select credits_per_use into v_resume_rate from public.credit_conversion_rates where feature = 'resume_review';
  select credits_per_use into v_mock_rate from public.credit_conversion_rates where feature = 'mock_interview';

  select coalesce(sum(credits_remaining), 0) into v_credit_balance
    from public.credit_lots
    where user_id = p_user_id and expires_at > now() and credits_remaining > 0;

  return jsonb_build_object(
    'role', v_role,
    'resumeReview', jsonb_build_object(
      'included', v_resume_default + v_resume_bonus,
      'used', v_resume_used,
      'remainingIncluded', greatest(v_resume_default + v_resume_bonus - v_resume_used, 0),
      'creditsPerUse', coalesce(v_resume_rate, 0)
    ),
    'mockInterview', jsonb_build_object(
      'included', v_mock_default + v_mock_bonus,
      'used', v_mock_used,
      'remainingIncluded', greatest(v_mock_default + v_mock_bonus - v_mock_used, 0),
      'creditsPerUse', coalesce(v_mock_rate, 0)
    ),
    'creditBalance', v_credit_balance
  );
end;
$$;

revoke execute on function public.get_feature_status(uuid) from public, anon;
grant execute on function public.get_feature_status(uuid) to authenticated;

-- ============================================================
-- 10. consume_feature(p_user_id, p_feature) — atomic drawdown: included allowance first, then credits FIFO by expiry
-- ============================================================
create or replace function public.consume_feature(p_user_id uuid, p_feature text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_default int;
  v_bonus int;
  v_used int;
  v_included int;
  v_rate int;
  v_lot record;
  v_remaining_needed int;
  v_deduct int;
  v_credits_deducted int := 0;
begin
  if auth.uid() <> p_user_id then
    raise exception 'forbidden';
  end if;
  if p_feature not in ('resume_review', 'mock_interview') then
    raise exception 'invalid feature: %', p_feature;
  end if;

  select role::text into v_role from public.profiles where id = p_user_id;

  if p_feature = 'resume_review' then
    select resume_reviews_included into v_default from public.plan_feature_defaults where role = v_role;
    select resume_reviews_bonus into v_bonus from public.user_feature_overrides where user_id = p_user_id;
  else
    select mock_interviews_included into v_default from public.plan_feature_defaults where role = v_role;
    select mock_interviews_bonus into v_bonus from public.user_feature_overrides where user_id = p_user_id;
  end if;
  v_included := coalesce(v_default, 0) + coalesce(v_bonus, 0);

  select used_count into v_used from public.feature_usage where user_id = p_user_id and feature = p_feature;
  v_used := coalesce(v_used, 0);

  if v_used < v_included then
    insert into public.feature_usage (user_id, feature, used_count, updated_at)
    values (p_user_id, p_feature, 1, now())
    on conflict (user_id, feature)
    do update set used_count = feature_usage.used_count + 1, updated_at = now();

    return jsonb_build_object('source', 'included', 'remainingIncluded', v_included - v_used - 1);
  end if;

  select credits_per_use into v_rate from public.credit_conversion_rates where feature = p_feature;
  if v_rate is null then
    raise exception 'no conversion rate configured for %', p_feature;
  end if;

  v_remaining_needed := v_rate;

  for v_lot in
    select id, credits_remaining
    from public.credit_lots
    where user_id = p_user_id and expires_at > now() and credits_remaining > 0
    order by expires_at asc
    for update
  loop
    exit when v_remaining_needed <= 0;
    v_deduct := least(v_lot.credits_remaining, v_remaining_needed);
    update public.credit_lots set credits_remaining = credits_remaining - v_deduct where id = v_lot.id;
    v_remaining_needed := v_remaining_needed - v_deduct;
    v_credits_deducted := v_credits_deducted + v_deduct;
  end loop;

  if v_remaining_needed > 0 then
    raise exception 'insufficient allowance and credits for %', p_feature;
  end if;

  insert into public.credit_transactions (user_id, delta, reason, feature, created_at)
  values (p_user_id, -v_credits_deducted, 'feature_consumed', p_feature, now());

  return jsonb_build_object('source', 'credits', 'creditsDeducted', v_credits_deducted);
end;
$$;

revoke execute on function public.consume_feature(uuid, text) from public, anon;
grant execute on function public.consume_feature(uuid, text) to authenticated;

-- ============================================================
-- 11. grant_credit_lot(...) — mints a credit lot; service_role only (called from finalizePayment.ts)
-- ============================================================
create or replace function public.grant_credit_lot(
  p_user_id uuid,
  p_credits integer,
  p_source text,
  p_pack_tier text default null,
  p_payment_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lot_id uuid;
begin
  if p_source not in ('pack_purchase', 'admin_grant') then
    raise exception 'invalid source: %', p_source;
  end if;

  insert into public.credit_lots (
    user_id, credits_purchased, credits_remaining, source, pack_tier, payment_id, purchased_at, expires_at
  )
  values (
    p_user_id, p_credits, p_credits, p_source, p_pack_tier, p_payment_id, now(), now() + interval '1 year'
  )
  returning id into v_lot_id;

  insert into public.credit_transactions (user_id, delta, reason, feature, lot_id, created_at)
  values (p_user_id, p_credits, p_source, null, v_lot_id, now());

  return v_lot_id;
end;
$$;

revoke execute on function public.grant_credit_lot(uuid, integer, text, text, uuid) from public, anon, authenticated;
grant execute on function public.grant_credit_lot(uuid, integer, text, text, uuid) to service_role;

notify pgrst, 'reload schema';
```

### Verifying the lockdown

```sql
select routine_name, grantee, privilege_type
from information_schema.role_routine_grants
where routine_name in ('get_feature_status', 'consume_feature', 'grant_credit_lot')
order by routine_name, grantee;
```

Expect `get_feature_status`/`consume_feature` → `authenticated` only,
`grant_credit_lot` → `service_role` only. If `anon` or `public` shows up
for any of the three, the revoke didn't take — re-run the `revoke`
statement for that function.

---

## Company HR — job posts & branding (`job_posts`, `company_branding`)

Adds `/add-job-post` and `/add-company-branding` (plus the public `/careers`
+ `/careers/:slug` pages). Both tables are scoped by the free-text
`profiles.company_name` a `company_hr` account was invited with — an HR user
can only ever see/edit rows matching their own company. Authoring access
follows the same `nav_access`-driven convention as `manage-blog-post`
(admin, plus whichever roles an admin grants `nav_access` for the relevant
`item_key` on `/manage-access`), so one generic helper —
`can_manage_company_content(company_name, item_key)` — covers both tables
instead of a bespoke check per feature. Idempotent, safe to re-run against
an existing database.

```sql
create table if not exists public.job_posts (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  slug text unique not null,
  title text not null,
  description text not null,
  location text,
  employment_type text check (employment_type in ('full_time', 'part_time', 'contract', 'internship', 'freelance')),
  experience_level text,
  salary_min integer,
  salary_max integer,
  apply_url text,
  apply_email text,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.job_posts enable row level security;

-- security-definer helper: true if caller is admin, or caller's profile
-- company_name matches p_company_name AND caller's role is listed in
-- nav_access.allowed_roles for p_item_key. Shared by job_posts and
-- company_branding below -- same "reuse nav_access, no bespoke access
-- table per feature" reasoning as can_manage_blog().
create or replace function public.can_manage_company_content(p_company_name text, p_item_key text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'admin'
        or (
          p.company_name = p_company_name
          and p.role::text = any(
            select unnest(allowed_roles)::text from public.nav_access
            where item_key = p_item_key
          )
        )
      )
  );
$$;

drop policy if exists "anyone can read open job posts" on public.job_posts;
create policy "anyone can read open job posts" on public.job_posts
  for select using (status = 'open');

drop policy if exists "authorized roles manage own company job posts" on public.job_posts;
create policy "authorized roles manage own company job posts" on public.job_posts
  for all using (public.can_manage_company_content(company_name, 'add-job-post'))
  with check (public.can_manage_company_content(company_name, 'add-job-post'));

-- Settings-only for now (logo/tagline/about) -- nothing else reads this
-- yet, so there's no public-select policy, unlike job_posts.
create table if not exists public.company_branding (
  company_name text primary key,
  logo_url text,
  tagline text,
  about text,
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.company_branding enable row level security;

drop policy if exists "authorized roles manage own company branding" on public.company_branding;
create policy "authorized roles manage own company branding" on public.company_branding
  for all using (public.can_manage_company_content(company_name, 'add-company-branding'))
  with check (public.can_manage_company_content(company_name, 'add-company-branding'));

notify pgrst, 'reload schema';
```

No seed rows are needed in `nav_access` -- same rule as every other item:
a missing row means `allowed_roles = []`, so only the hardcoded admin
bypass sees `/add-job-post`/`/add-company-branding` until an admin grants
`company_hr` access to both `item_key`s from `/manage-access`.

---

## Company branding — profile fields (`display_name`, `linkedin_url`, `employee_range`, `locations`)

Extends `company_branding` (above) with company-profile fields alongside
the existing logo/colors/tagline/about -- same table, same RLS policy,
no new migration surface. `display_name` is a separate column rather than
reusing the `company_name` primary key, since `company_name` is the
free-text value shared with `profiles.company_name` for RLS scoping and
may not be the friendly name HR wants shown publicly.

```sql
alter table public.company_branding
  add column if not exists display_name text,
  add column if not exists linkedin_url text,
  add column if not exists employee_range text check (
    employee_range in ('1-10', '11-50', '51-200', '201-500', '500+')
  ),
  add column if not exists locations text[] not null default '{}';

notify pgrst, 'reload schema';
```

---

## External job posters (`external_job_poster`)

A new role for people who post jobs *on behalf of* a company rather than
being that company's own HR — e.g. an internal recruiting team handling
postings for multiple client companies. Unlike `company_hr`, this role has
no fixed `company_name`: the company is chosen per job post (free-text
field on the form) and per branding edit, not read from `profiles`. Access
follows the same `nav_access`-driven convention as everything else — an
admin still has to grant `external_job_poster` access to `add-job-post`/
`add-company-branding` from `/manage-access` before the pages are visible.

`is_external_job_poster(p_item_key)` mirrors `can_manage_company_content`'s
`nav_access` check (minus the `company_name` match, since this role isn't
scoped to one company) so that grant is actually enforced server-side, not
just by the client hiding the page — an earlier version of this helper
took no argument and skipped the `nav_access` check entirely, which meant
just being assigned the role (before an admin ever granted feature access)
was enough to write to every company's `company_branding` row directly via
PostgREST.

Scoping differs from `company_hr` in one way, and used to differ in a
second: both `job_posts` and `company_branding` now scope an external
poster to the rows they personally created (`created_by = auth.uid()`).
`company_branding` originally had no `created_by` column and let an
external poster edit *any* company's branding row (a shared-edit model,
since it's one row per company primary key) — that's been replaced below
by an owned-row model to match `job_posts`, so an external poster only
sees/edits brandings they themselves created; a different external poster
working with the same company_name gets their own row lineage tracked via
`created_by`, not silent shared access.

```sql
alter type public.user_role add value if not exists 'external_job_poster';

-- security-definer helper: true if caller's own role is external_job_poster
-- AND that role is listed in nav_access.allowed_roles for p_item_key --
-- same nav_access-is-the-real-gate reasoning as can_manage_company_content,
-- just without the company_name match (this role isn't scoped to one company).
create or replace function public.is_external_job_poster(p_item_key text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'external_job_poster'
      and p.role::text = any(
        select unnest(allowed_roles)::text from public.nav_access
        where item_key = p_item_key
      )
  );
$$;

drop function if exists public.is_external_job_poster();

drop policy if exists "external job posters manage own created job posts" on public.job_posts;
create policy "external job posters manage own created job posts" on public.job_posts
  for all using (public.is_external_job_poster('add-job-post') and created_by = auth.uid())
  with check (public.is_external_job_poster('add-job-post') and created_by = auth.uid());

-- company_branding used to be a shared-edit-any-company model for this
-- role (no created_by column existed). Adding created_by here moves it
-- to the same owned-row model as job_posts -- existing rows predate the
-- column and backfill to null, which the policy below treats as
-- unowned/inaccessible to external posters (a company_hr can still see
-- their own company's pre-existing row fine, since that policy doesn't
-- reference created_by at all).
alter table public.company_branding add column if not exists created_by uuid references auth.users(id) on delete set null;

drop policy if exists "external job posters manage any company branding" on public.company_branding;
drop policy if exists "external job posters manage own created company branding" on public.company_branding;
create policy "external job posters manage own created company branding" on public.company_branding
  for all using (public.is_external_job_poster('add-company-branding') and created_by = auth.uid())
  with check (public.is_external_job_poster('add-company-branding') and created_by = auth.uid());

notify pgrst, 'reload schema';
```

Rows created before this migration have `created_by = null`, so no
external poster will see them in their list until someone re-saves that
company's branding (which sets `created_by` on upsert going forward). To
attribute a specific pre-existing row to a specific poster instead of
leaving it unowned, run this once per row, by hand:

```sql
update public.company_branding
set created_by = (select id from auth.users where email = 'poster@example.com')
where company_name = 'Some Company' and created_by is null;
```

No seed rows needed in `nav_access` — same rule as every other item: an
admin grants `external_job_poster` access to `add-job-post` and
`add-company-branding` from `/manage-access` when ready. Until that grant
exists, an `external_job_poster` account is denied by RLS even with the
role assigned, matching `company_hr`'s behavior.

---

## Job posts — include company branding (`include_branding`)

A poster can opt in to showing their company's branding (logo/tagline/
about, from `company_branding`) alongside a job post on the signed-in
Jobs feed. Explicit boolean rather than inferring from "does a
`company_branding` row exist for this company_name" — a poster may have
branding set up but not want it shown on a specific posting.

```sql
alter table public.job_posts add column if not exists include_branding boolean not null default false;

notify pgrst, 'reload schema';
```

No RLS change needed — `include_branding` is just another column covered
by the existing `job_posts` policies (`can_manage_company_content`/
`is_external_job_poster` for writes, `status = 'open'` for public reads).

---

## Job posts — taxonomy tagging (Domain, Role, Skills, required experience)

Job posts have had zero connection to the Domain/Role/Skills taxonomy that
drives `/profile` — a poster could only describe a role in free text
(`experience_level`), and the signed-in Jobs feed could only filter on
employment type and a text search. This adds the same Domain → Role
cascade and Skills concept from `/profile` to `job_posts`, plus a numeric
required-experience years/months pair (mirroring the new
`profiles.experience_months`, above) so Jobs feed can filter on structured
data instead of free text. `experience_level` (free text, e.g. "3-5
years") is untouched — these are new, additive columns alongside it, not
a replacement.

```sql
alter table public.job_posts add column if not exists category_domain_id uuid references public.domains(id);
alter table public.job_posts add column if not exists category_role_id uuid references public.base_roles(id);

alter table public.job_posts add column if not exists required_experience_years integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'job_posts_required_experience_years_range'
  ) then
    alter table public.job_posts
      add constraint job_posts_required_experience_years_range
      check (required_experience_years is null or required_experience_years between 0 and 30);
  end if;
end;
$$;

alter table public.job_posts add column if not exists required_experience_months integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'job_posts_required_experience_months_range'
  ) then
    alter table public.job_posts
      add constraint job_posts_required_experience_months_range
      check (required_experience_months is null or required_experience_months between 0 and 11);
  end if;
end;
$$;

-- one row per (job, required skill) -- mirrors user_skills' shape, but
-- scoped by job ownership (via a join back to job_posts) instead of a
-- user_id column, since job_post_skills has no owner column of its own.
create table if not exists public.job_post_skills (
  job_id uuid not null references public.job_posts(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  primary key (job_id, skill_id)
);

alter table public.job_post_skills enable row level security;

-- Public read: the signed-in Jobs feed's skill filter and skill-chip
-- display run as the candidate viewing an open job, not the poster.
drop policy if exists "anyone can read skills of open job posts" on public.job_post_skills;
create policy "anyone can read skills of open job posts" on public.job_post_skills
  for select using (
    exists (select 1 from public.job_posts jp where jp.id = job_id and jp.status = 'open')
  );

-- Write access is re-derived by joining back to job_posts and reusing
-- the exact same authorization check job_posts itself uses for writes
-- (can_manage_company_content for company_hr/admin, is_external_job_poster
-- + created_by for external posters) -- job_post_skills has no created_by
-- of its own, so ownership can only be checked through the parent row.
drop policy if exists "posters manage skills of own job posts" on public.job_post_skills;
create policy "posters manage skills of own job posts" on public.job_post_skills
  for all using (
    exists (
      select 1 from public.job_posts jp where jp.id = job_id and (
        public.can_manage_company_content(jp.company_name, 'add-job-post')
        or (public.is_external_job_poster('add-job-post') and jp.created_by = auth.uid())
      )
    )
  )
  with check (
    exists (
      select 1 from public.job_posts jp where jp.id = job_id and (
        public.can_manage_company_content(jp.company_name, 'add-job-post')
        or (public.is_external_job_poster('add-job-post') and jp.created_by = auth.uid())
      )
    )
  );

notify pgrst, 'reload schema';
```

No seniority field is added to job posts — the user explicitly scoped
this to Domain, Role, Skills, and years+months of experience only, unlike
`base_roles.seniority_levels`/`profiles.designation_seniority`.

---

## Job posts — work mode (On Site / Hybrid / Remote / Work From Home)

`employment_type` (full_time/part_time/contract/internship) already
captures the *contract* shape of a role, but nothing captured the
*where-you-work* shape. This adds a sibling `work_mode` column, same
plain scalar check-constrained pattern as `employment_type` — no new
table needed since it's a single fixed-choice field per job post.

```sql
alter table public.job_posts add column if not exists work_mode text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'job_posts_work_mode_check'
  ) then
    alter table public.job_posts
      add constraint job_posts_work_mode_check
      check (work_mode is null or work_mode in ('onsite', 'hybrid', 'remote', 'work_from_home'));
  end if;
end;
$$;

notify pgrst, 'reload schema';
```

Values mirror `apps/app/src/types/workMode.ts`'s `WorkMode` union exactly
(`onsite`, `hybrid`, `remote`, `work_from_home`) — labelled "On Site",
"Hybrid", "Remote", "Work From Home" in the UI. Shown in Add Job Post
(`JobPostEditor`), the signed-in Jobs feed detail pane, and the public
`/careers` list + job page, same places `employment_type` already
appears.

`employment_type` also gained a `freelance` option at the same time (UI
dropdown in `JobPostEditor` was missing it). On an existing database the
`create table if not exists` above won't touch the already-created
`employment_type` check constraint, so it needs its own migration:

```sql
alter table public.job_posts drop constraint if exists job_posts_employment_type_check;

alter table public.job_posts
  add constraint job_posts_employment_type_check
  check (employment_type is null or employment_type in ('full_time', 'part_time', 'contract', 'internship', 'freelance'));

notify pgrst, 'reload schema';
```

(The original inline `check (employment_type in (...))` on the table
definition has no name of its own — Postgres auto-names unnamed column
checks `job_posts_employment_type_check` by convention, which is what
this `drop constraint if exists` targets.)

---

## Job applications (`job_applications`) — in-app Apply + Applies view

Lets a signed-in `free_users`/`paid_users` account apply to an open job
post directly (using their existing Profile data — no separate
application form), and lets that job's poster (`company_hr` or
`external_job_poster`, whichever `created_by` on `job_posts` is) see who
applied. `created_by` is already set unconditionally on every job post
regardless of poster role, so a single `created_by = auth.uid()` check
covers both roles without branching — same pattern as the owned-row
policies for `job_posts`/`company_branding` above.

Applicant profile data can't be read directly by the poster — `profiles`
RLS only allows reading your own row — so `get_job_applicants` is a
security-definer function scoped to the caller's own jobs, mirroring
`can_manage_company_content`/`is_external_job_poster`'s "helper enforces
the real check server-side" reasoning.

```sql
create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_posts(id) on delete cascade,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (job_id, applicant_id)
);

alter table public.job_applications enable row level security;

drop policy if exists "applicants manage own application" on public.job_applications;
create policy "applicants manage own application" on public.job_applications
  for all using (auth.uid() = applicant_id)
  with check (
    auth.uid() = applicant_id
    and exists (select 1 from public.job_posts jp where jp.id = job_id and jp.status = 'open')
  );

drop policy if exists "posters view applications to own jobs" on public.job_applications;
create policy "posters view applications to own jobs" on public.job_applications
  for select using (
    exists (select 1 from public.job_posts jp where jp.id = job_id and jp.created_by = auth.uid())
  );

-- security-definer: returns each applicant's profile snapshot for one job,
-- restricted to that job's creator -- profiles RLS otherwise only allows
-- reading your own row, so a poster can't see applicant rows directly.
create or replace function public.get_job_applicants(p_job_id uuid)
returns table (
  applicant_id uuid,
  full_name text,
  email text,
  resume_url text,
  social_links jsonb,
  current_status text,
  designation_name text,
  designation_seniority public.seniority_level,
  skills text[],
  applied_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $body$
  select
    p.id, p.full_name, p.email, p.resume_url, p.social_links, p.current_status,
    br.name, p.designation_seniority,
    coalesce(array_agg(distinct s.name) filter (where s.name is not null), '{}'),
    ja.created_at
  from public.job_applications ja
  join public.profiles p on p.id = ja.applicant_id
  left join public.base_roles br on br.id = p.designation_id
  left join public.user_skills us on us.user_id = p.id
  left join public.skills s on s.id = us.skill_id
  where ja.job_id = p_job_id
    and exists (select 1 from public.job_posts jp where jp.id = p_job_id and jp.created_by = auth.uid())
  group by p.id, p.full_name, p.email, p.resume_url, p.social_links, p.current_status, br.name, p.designation_seniority, ja.created_at;
$body$;

notify pgrst, 'reload schema';
```

No seed rows needed in `nav_access` for the poster-facing Applies view —
it's nested inside the already-gated `/add-job-post` page, and the RLS/RPC
`created_by = auth.uid()` check is what actually restricts visibility to
the job's own poster, not a separate nav item. The signed-in Jobs feed
that applicants use to apply is a new page (`/jobs`) with its own
`nav_access` item — see "Sidebar — Jobs" below.

---

## Applicants pipeline status & poster-wide Applicants view (`get_my_job_applicants`)

The Applicants page (`/applicants`) shows a poster every applicant across
*all* of their job posts at once, filterable by pipeline stage (Applied /
Shortlisted), instead of one job at a time — so `get_job_applicants(p_job_id)`
above is superseded by `get_my_job_applicants(p_status)`, scoped the same
way (`job_posts.created_by = auth.uid()`) but across every job the poster
owns, and returning the full profile snapshot the two-pane Applicants UI
displays (not just the handful of columns the old per-job function
returned). Nothing in the app still calls `get_job_applicants`/
`listJobApplicants`, so it's dropped rather than kept alongside the new
function.

`job_applications` gets a `status` column (`applied`/`shortlisted`) so a
poster can shortlist a candidate without a separate table — same inline
check-constraint style as `job_posts.status`. The existing "posters view
applications to own jobs" policy only covers `select`; shortlisting needs a
new `update` policy scoped the same way (own jobs only — the `with check`
re-validates job ownership on write, not just the row's pre-image, so a
poster can't repoint an application at a job they don't own).

```sql
alter table public.job_applications
  add column if not exists status text not null default 'applied' check (status in ('applied', 'shortlisted'));

drop policy if exists "posters update applications to own jobs" on public.job_applications;
create policy "posters update applications to own jobs" on public.job_applications
  for update using (
    exists (select 1 from public.job_posts jp where jp.id = job_id and jp.created_by = auth.uid())
  )
  with check (
    exists (select 1 from public.job_posts jp where jp.id = job_id and jp.created_by = auth.uid())
  );

drop function if exists public.get_job_applicants(uuid);
drop function if exists public.get_my_job_applicants(text);

-- security-definer: every applicant across every job the caller posted,
-- optionally filtered to one pipeline status. profiles/base_roles/domains/
-- locations RLS would otherwise block a poster from reading another user's
-- row at all, so (like get_job_applicants before it) this function does the
-- real authorization itself via the job_posts.created_by check, then reads
-- past profiles RLS as security definer. Two separate joins into
-- base_roles (dr/cr) because designation_id (skills-profile designation)
-- and category_role_id ("Current Role" on /profile) are deliberately
-- independent columns -- see "Profile category & location" below.
-- current_location_state_name and open_to_state_names both walk through
-- locations -> states so the Applicants view can render "State - Location"
-- for the current pick and a plain list of every state the candidate is
-- open to relocating within (no location-level detail for open-to, just
-- the distinct state names).
create or replace function public.get_my_job_applicants(p_status text default null)
returns table (
  applicant_id uuid,
  full_name text,
  email text,
  bio text,
  current_status public.current_status_type,
  notice_period public.notice_period_type,
  looking_for public.looking_for_type[],
  education_status public.education_status_type,
  experience_years integer,
  experience_months integer,
  passing_year integer,
  resume_url text,
  social_links jsonb,
  designation_id uuid,
  designation_name text,
  designation_seniority public.seniority_level,
  category_domain_id uuid,
  category_domain_name text,
  category_role_id uuid,
  category_role_name text,
  current_location_id uuid,
  current_location_name text,
  current_location_state_name text,
  open_to_state_names text[],
  skills text[],
  job_id uuid,
  job_title text,
  applied_at timestamptz,
  status text
)
language sql
security definer
set search_path = public
stable
as $body$
  select
    p.id, p.full_name, p.email, p.bio, p.current_status, p.notice_period,
    p.looking_for, p.education_status, p.experience_years, p.experience_months,
    p.passing_year, p.resume_url, p.social_links,
    p.designation_id, dr.name, p.designation_seniority,
    p.category_domain_id, cd.name, p.category_role_id, cr.name,
    p.current_location_id, loc.name, cur_state.name,
    coalesce(array_agg(distinct ot_state.name) filter (where ot_state.name is not null), '{}'),
    coalesce(array_agg(distinct s.name) filter (where s.name is not null), '{}'),
    ja.job_id, jp.title, ja.created_at, ja.status
  from public.job_applications ja
  join public.job_posts jp on jp.id = ja.job_id
  join public.profiles p on p.id = ja.applicant_id
  left join public.base_roles dr on dr.id = p.designation_id
  left join public.domains cd on cd.id = p.category_domain_id
  left join public.base_roles cr on cr.id = p.category_role_id
  left join public.locations loc on loc.id = p.current_location_id
  left join public.states cur_state on cur_state.id = loc.state_id
  left join public.user_open_to_locations uotl on uotl.user_id = p.id
  left join public.locations otl on otl.id = uotl.location_id
  left join public.states ot_state on ot_state.id = otl.state_id
  left join public.user_skills us on us.user_id = p.id
  left join public.skills s on s.id = us.skill_id
  where jp.created_by = auth.uid()
    and (p_status is null or ja.status = p_status)
  group by
    p.id, p.full_name, p.email, p.bio, p.current_status, p.notice_period,
    p.looking_for, p.education_status, p.experience_years, p.experience_months,
    p.passing_year, p.resume_url, p.social_links, p.designation_id, dr.name,
    p.designation_seniority, p.category_domain_id, cd.name, p.category_role_id,
    cr.name, p.current_location_id, loc.name, cur_state.name, ja.job_id, jp.title,
    ja.created_at, ja.status
  order by ja.created_at desc;
$body$;

revoke all on function public.get_my_job_applicants(text) from public, anon;
grant execute on function public.get_my_job_applicants(text) to authenticated;

notify pgrst, 'reload schema';
```

`email` is kept in the return set (posters need it for the mailto action
on `/applicants`, same as the old `get_job_applicants`). `setApplicantStatus`
in `src/data/jobApplicants.js` needs no change against this schema — its
unconditional `update({ status })` is already covered by the new column and
policy, and the check constraint doesn't encode a state machine (either
direction, applied→shortlisted or back, is a valid transition).

---

## Saved jobs (`saved_jobs`) — "Saved For Later" tab on `/jobs`

Lets a signed-in candidate bookmark an open job post to revisit later,
without applying. Same shape and RLS style as `job_applications` above,
minus the poster-facing view policy — saving is private to the candidate,
the poster has no need to see who saved their job.

```sql
create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (job_id, user_id)
);

alter table public.saved_jobs enable row level security;

drop policy if exists "users manage own saved jobs" on public.saved_jobs;
create policy "users manage own saved jobs" on public.saved_jobs
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.job_posts jp where jp.id = job_id and jp.status = 'open')
  );

notify pgrst, 'reload schema';
```

---

## Locations catalog (States & Locations)

Backs the "Locations" tab in Manage Course Access (`/manage-access`),
mirroring the "Roles & Skills" tab's paste-a-category / paste-its-items UX.
Simpler than the taxonomy tables on purpose: a location belongs to exactly
one state, so this is a plain one-to-many (`locations.state_id`), not a
junction table — no `taxonomy_slugs`-style cross-kind registry needed.

```sql
create table if not exists public.states (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  state_id uuid not null references public.states(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (state_id, slug)
);

create table if not exists public.locations_meta (
  id smallint primary key default 1 check (id = 1),
  version integer not null default 1,
  updated_at timestamptz not null default now()
);
insert into public.locations_meta (id, version)
  values (1, 1)
  on conflict (id) do nothing;
```

RLS — same `"public read"` / `"admins manage"` pair used by every taxonomy
table, reusing the existing `public.is_admin()`:

```sql
alter table public.states enable row level security;
alter table public.locations enable row level security;
alter table public.locations_meta enable row level security;

drop policy if exists "public read" on public.states;
drop policy if exists "admins manage" on public.states;
create policy "public read" on public.states for select using (true);
create policy "admins manage" on public.states
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read" on public.locations;
drop policy if exists "admins manage" on public.locations;
create policy "public read" on public.locations for select using (true);
create policy "admins manage" on public.locations
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read" on public.locations_meta;
drop policy if exists "admins manage" on public.locations_meta;
create policy "public read" on public.locations_meta for select using (true);
create policy "admins manage" on public.locations_meta
  for all using (public.is_admin()) with check (public.is_admin());
```

`admin_save_location_state(payload jsonb)` — upserts one state by name,
upserts/updates each pasted location scoped to `(state_id, slug)`, then
deletes any location under that state not present in this save (an empty
`locations` array clears the state), and bumps `locations_meta.version`
for `/api/locations`'s cache to pick up:

```sql
create or replace function public.admin_save_location_state(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_state_id uuid;
  v_state_slug text;
  v_state_name text;
  v_location jsonb;
  v_slug text;
  v_name text;
  v_id uuid;
  v_location_ids uuid[] := '{}';
  v_seen_slugs text[] := '{}';
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  v_state_name := payload->'state'->>'name';
  if v_state_name is null or trim(v_state_name) = '' then
    raise exception 'state name is required';
  end if;
  v_state_slug := public.slugify(v_state_name);

  select id into v_state_id
    from public.states
    where slug = v_state_slug;
  if v_state_id is null then
    insert into public.states (name, slug)
      values (trim(v_state_name), v_state_slug)
      returning id into v_state_id;
  else
    update public.states
      set name = trim(v_state_name)
      where id = v_state_id;
  end if;

  for v_location in
    select * from jsonb_array_elements(coalesce(payload->'locations', '[]'::jsonb))
  loop
    v_name := trim(v_location->>'name');
    if v_name is null or v_name = '' then
      continue;
    end if;
    v_slug := public.slugify(v_name);
    if v_slug = any(v_seen_slugs) then
      continue;
    end if;
    v_seen_slugs := v_seen_slugs || v_slug;

    select id into v_id
      from public.locations
      where state_id = v_state_id and slug = v_slug;

    if v_id is null then
      insert into public.locations (name, slug, state_id)
        values (v_name, v_slug, v_state_id)
        returning id into v_id;
    else
      update public.locations
        set name = v_name, updated_at = now()
        where id = v_id;
    end if;

    v_location_ids := v_location_ids || v_id;
  end loop;

  delete from public.locations
    where state_id = v_state_id and id <> all (v_location_ids);

  update public.locations_meta
    set version = version + 1, updated_at = now()
    where id = 1;

  return jsonb_build_object(
    'stateId', v_state_id,
    'locationIds', v_location_ids
  );
end;
$function$;

revoke all on function public.admin_save_location_state(jsonb) from public, anon;
grant execute on function public.admin_save_location_state(jsonb) to authenticated;

notify pgrst, 'reload schema';
```

No seed rows needed — the tab starts empty and admins populate it the same
way they populate Roles & Skills.

---

## Profile category & location

Backs three fields on `/profile`: **Current Role** (domain→role pick from
the Roles & Skills catalog), **Current Location** (single pick from the
Locations catalog), and **Open to Location** (multi-pick from the Locations
catalog). `category_domain_id`/`category_role_id` are deliberately their
own columns rather than reusing the Designation card's domain/role — a
user's Designation role is their skills-profile designation, but Current
Role (what they're interested in / describe themselves as) shouldn't be
forced to match it; the two pickers stay independent. All three of
`category_domain_id`, `category_role_id`, and `current_location_id` live on
`profiles`, so — like `designation_id` — they can only be written through a
`security definer` RPC, since `profiles` has no direct `update` RLS policy
(that would let a user update any column on their own row, including
`role`).

```sql
alter table public.profiles add column if not exists category_domain_id uuid references public.domains(id);
alter table public.profiles add column if not exists category_role_id uuid references public.base_roles(id);
alter table public.profiles add column if not exists current_location_id uuid references public.locations(id);

create table if not exists public.user_open_to_locations (
  user_id uuid not null references auth.users(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, location_id)
);

alter table public.user_open_to_locations enable row level security;

drop policy if exists "users manage own open-to locations" on public.user_open_to_locations;
create policy "users manage own open-to locations" on public.user_open_to_locations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "admins read all open-to locations" on public.user_open_to_locations;
create policy "admins read all open-to locations" on public.user_open_to_locations
  for select using (public.is_admin());

drop function if exists public.update_own_location_and_category(uuid, uuid);

create or replace function public.update_own_location_and_category(
  p_category_domain_id uuid,
  p_category_role_id uuid,
  p_current_location_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set category_domain_id = p_category_domain_id,
      category_role_id = p_category_role_id,
      current_location_id = p_current_location_id
  where id = auth.uid();
end;
$$;

revoke all on function public.update_own_location_and_category(uuid, uuid, uuid) from public, anon;
grant execute on function public.update_own_location_and_category(uuid, uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
```

`user_open_to_locations` has no sensitive column (same reasoning as
`user_skills`/`user_technologies`), so `/profile` reads/writes it with
direct `supabase.from('user_open_to_locations')...` calls under RLS — no RPC
indirection needed. `update_own_location_and_category` is kept as its own
function, mirroring `update_own_designation`, so `update_own_profile`'s
argument list doesn't keep growing.

---

## Seniority levels — adding L1-L6/Architect/Manager, and folding seniority into Current Role

Two changes, landed together:

1. `public.seniority_level` gains eight new values (`l1`-`l6`, `architect`,
   `manager`) alongside the original five (`base`/`senior`/`lead`/`staff`/
   `principal`) — this repo's earlier `create type` block above already
   lists all thirteen for a from-scratch run; an **existing** database
   needs `ALTER TYPE ... ADD VALUE` instead, since Postgres enums can't be
   redefined in place:
   ```sql
   alter type public.seniority_level add value if not exists 'l1' after 'principal';
   alter type public.seniority_level add value if not exists 'l2' after 'l1';
   alter type public.seniority_level add value if not exists 'l3' after 'l2';
   alter type public.seniority_level add value if not exists 'l4' after 'l3';
   alter type public.seniority_level add value if not exists 'l5' after 'l4';
   alter type public.seniority_level add value if not exists 'l6' after 'l5';
   alter type public.seniority_level add value if not exists 'architect' after 'l6';
   alter type public.seniority_level add value if not exists 'manager' after 'architect';

   notify pgrst, 'reload schema';
   ```
   `ALTER TYPE ... ADD VALUE` cannot run inside the same transaction as a
   statement that uses the type, so run this block by itself, not pasted
   into a larger migration. Nothing is renamed or removed — `base_roles.
   seniority_levels` (admin taxonomy) and `profiles.designation_seniority`
   keep every row they already had.

2. On `/profile`, the standalone "Current Designation" card (role +
   seniority pickers) is removed — "Current Role" (domain + role) becomes
   the one place a user sets their role, now with a third dropdown for
   seniority alongside it. On save, `designation_id` goes back to
   mirroring `category_role_id` (the same value is written to both), and
   `designation_seniority` is set from the new third dropdown via the
   existing `update_own_designation(p_designation_id, p_seniority)` RPC —
   no RPC signature changes needed, only the caller's arguments. This
   reverses the brief period where `designation_id`/`category_role_id`
   were independently settable; the "Profile category & location" section
   above (and its "two pickers stay independent" note) predates this and
   no longer reflects the UI, though the two columns remain structurally
   separate in the schema and `get_my_job_applicants` still joins
   `base_roles` twice (`dr`/`cr`) for them.

---

## Applicants view — drop Domain, add state names to Location

On `/applicants`, the detail pane's "Location" section drops the Domain
row (redundant with Current Role, which already implies a domain) and
reshapes Current Location to `"<State> - <Location>"`, plus a new "Open
to" row listing every distinct state the candidate is open to relocating
within (states only, no location-level detail — a candidate can be open
to several locations inside one state, so location detail would just be
noisy here).

`get_my_job_applicants`'s return shape changed (`current_location_name`
now paired with a new `current_location_state_name`, plus a new
`open_to_state_names text[]` column), so on an **existing** database the
function must be dropped before being recreated — Postgres won't let
`create or replace function` change a function's `returns table` column
list in place (same class of error as the earlier `42P13` you hit):

```sql
drop function if exists public.get_my_job_applicants(text);
```

Then run the full `create or replace function public.get_my_job_applicants(...)`
block from "Applicants pipeline status & poster-wide Applicants view"
above (it already has the updated return columns and joins), followed by
its `revoke`/`grant` lines and `notify pgrst, 'reload schema';`.

---

## Current CTC / Expected CTC

Two new numeric fields on `/profile`, displayed as "30.02 lacs per annum"
(the raw value is stored directly in lacs — `30.02` — not converted from a
rupee figure, so display formatting is just `value.toFixed(2) + ' lacs per
annum'` with no unit math anywhere in the app). Both are optional and
free-text numeric inputs (unlike the dropdown-driven fields elsewhere on
`/profile`), since "30.02"-style arbitrary decimals don't fit a fixed
option list.

Kept as its own self-scoped RPC (`update_own_ctc`), following the same
reasoning as `update_own_designation`/`update_own_location_and_category`:
`update_own_profile`'s argument list doesn't keep growing.

```sql
alter table public.profiles add column if not exists current_ctc numeric(6,2);
alter table public.profiles add column if not exists expected_ctc numeric(6,2);

create or replace function public.update_own_ctc(p_current_ctc numeric, p_expected_ctc numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set current_ctc = p_current_ctc, expected_ctc = p_expected_ctc
  where id = auth.uid();
end;
$$;
revoke all on function public.update_own_ctc(numeric, numeric) from public, anon;
grant execute on function public.update_own_ctc(numeric, numeric) to authenticated;

notify pgrst, 'reload schema';
```

`get_my_job_applicants` also needs both columns so the Applicants detail
pane can show a candidate's CTC alongside Current Role and Total
Experience in Candidate Overview. Return-shape change, so drop before
recreate on an existing database:

```sql
drop function if exists public.get_my_job_applicants(text);

create or replace function public.get_my_job_applicants(p_status text default null)
returns table (
  applicant_id uuid,
  full_name text,
  email text,
  bio text,
  current_status public.current_status_type,
  notice_period public.notice_period_type,
  looking_for public.looking_for_type[],
  education_status public.education_status_type,
  experience_years integer,
  experience_months integer,
  passing_year integer,
  resume_url text,
  social_links jsonb,
  designation_id uuid,
  designation_name text,
  designation_seniority public.seniority_level,
  category_domain_id uuid,
  category_domain_name text,
  category_role_id uuid,
  category_role_name text,
  current_location_id uuid,
  current_location_name text,
  current_location_state_name text,
  open_to_state_names text[],
  skills text[],
  current_ctc numeric,
  expected_ctc numeric,
  job_id uuid,
  job_title text,
  applied_at timestamptz,
  status text
)
language sql
security definer
set search_path = public
stable
as $body$
  select
    p.id, p.full_name, p.email, p.bio, p.current_status, p.notice_period,
    p.looking_for, p.education_status, p.experience_years, p.experience_months,
    p.passing_year, p.resume_url, p.social_links,
    p.designation_id, dr.name, p.designation_seniority,
    p.category_domain_id, cd.name, p.category_role_id, cr.name,
    p.current_location_id, loc.name, cur_state.name,
    coalesce(array_agg(distinct ot_state.name) filter (where ot_state.name is not null), '{}'),
    coalesce(array_agg(distinct s.name) filter (where s.name is not null), '{}'),
    p.current_ctc, p.expected_ctc,
    ja.job_id, jp.title, ja.created_at, ja.status
  from public.job_applications ja
  join public.job_posts jp on jp.id = ja.job_id
  join public.profiles p on p.id = ja.applicant_id
  left join public.base_roles dr on dr.id = p.designation_id
  left join public.domains cd on cd.id = p.category_domain_id
  left join public.base_roles cr on cr.id = p.category_role_id
  left join public.locations loc on loc.id = p.current_location_id
  left join public.states cur_state on cur_state.id = loc.state_id
  left join public.user_open_to_locations uotl on uotl.user_id = p.id
  left join public.locations otl on otl.id = uotl.location_id
  left join public.states ot_state on ot_state.id = otl.state_id
  left join public.user_skills us on us.user_id = p.id
  left join public.skills s on s.id = us.skill_id
  where jp.created_by = auth.uid()
    and (p_status is null or ja.status = p_status)
  group by
    p.id, p.full_name, p.email, p.bio, p.current_status, p.notice_period,
    p.looking_for, p.education_status, p.experience_years, p.experience_months,
    p.passing_year, p.resume_url, p.social_links, p.designation_id, dr.name,
    p.designation_seniority, p.category_domain_id, cd.name, p.category_role_id,
    cr.name, p.current_location_id, loc.name, cur_state.name, p.current_ctc,
    p.expected_ctc, ja.job_id, jp.title, ja.created_at, ja.status
  order by ja.created_at desc;
$body$;

revoke all on function public.get_my_job_applicants(text) from public, anon;
grant execute on function public.get_my_job_applicants(text) to authenticated;

notify pgrst, 'reload schema';
```

## Applicants pipeline — "Not fit" status

A poster can mark an applicant "Not fit" from the Applicants detail pane,
next to Shortlist. It's a third `job_applications.status` value stored
against that applicant's row for that job (not a separate table) — the
Applied tab calls `get_my_job_applicants('applied')`, so a `not_fit` row
is already excluded from that view for free once the applicant's status
moves off `'applied'`; no extra filtering needed in the RPC. The inline
check constraint from the `status` column above needs widening to allow
the new value:

```sql
alter table public.job_applications drop constraint if exists job_applications_status_check;
alter table public.job_applications
  add constraint job_applications_status_check check (status in ('applied', 'shortlisted', 'not_fit'));

notify pgrst, 'reload schema';
```

## Applicants pipeline — "Next Action" on Shortlisted candidates

Once a candidate is Shortlisted, the poster tracks where that candidate is
in the hiring process via a "Next Action" dropdown in the Applicants
detail pane. Stored as a free-standing text column on `job_applications`
(not its own lookup table — a fixed, app-defined list of stages, same
reasoning as `current_status`/`notice_period` being inline check
constraints rather than tables) so `get_my_job_applicants` can keep
returning it as a plain column alongside `status`.

```sql
alter table public.job_applications add column if not exists next_action text
  check (next_action in (
    'contact_candidate', 'follow_up_with_candidate', 'schedule_interview',
    'reschedule_interview', 'complete_interview', 'collect_interview_feedback',
    'schedule_next_interview_round', 'select_candidate', 'release_offer',
    'follow_up_on_offer', 'confirm_offer_acceptance', 'confirm_joining_date',
    'collect_documents', 'mark_joined', 'put_on_hold', 'resume_process', 'reject'
  ));

-- security-definer, mirrors setApplicantStatus's own-jobs-only update policy:
-- callable by the applicant's job poster only.
create or replace function public.update_applicant_next_action(p_job_id uuid, p_applicant_id uuid, p_next_action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.job_posts jp where jp.id = p_job_id and jp.created_by = auth.uid()) then
    raise exception 'Not authorized to update this application';
  end if;

  update public.job_applications
  set next_action = p_next_action
  where job_id = p_job_id and applicant_id = p_applicant_id;
end;
$$;
revoke all on function public.update_applicant_next_action(uuid, uuid, text) from public, anon;
grant execute on function public.update_applicant_next_action(uuid, uuid, text) to authenticated;

notify pgrst, 'reload schema';
```

`get_my_job_applicants` needs `next_action` added to its return shape so
the Shortlisted tab can render/select the current value. Return-shape
change, so drop before recreate:

```sql
drop function if exists public.get_my_job_applicants(text);

create or replace function public.get_my_job_applicants(p_status text default null)
returns table (
  applicant_id uuid,
  full_name text,
  email text,
  bio text,
  current_status public.current_status_type,
  notice_period public.notice_period_type,
  looking_for public.looking_for_type[],
  education_status public.education_status_type,
  experience_years integer,
  experience_months integer,
  passing_year integer,
  resume_url text,
  social_links jsonb,
  designation_id uuid,
  designation_name text,
  designation_seniority public.seniority_level,
  category_domain_id uuid,
  category_domain_name text,
  category_role_id uuid,
  category_role_name text,
  current_location_id uuid,
  current_location_name text,
  current_location_state_name text,
  open_to_state_names text[],
  skills text[],
  current_ctc numeric,
  expected_ctc numeric,
  job_id uuid,
  job_title text,
  company_name text,
  applied_at timestamptz,
  status text,
  next_action text
)
language sql
security definer
set search_path = public
stable
as $body$
  select
    p.id, p.full_name, p.email, p.bio, p.current_status, p.notice_period,
    p.looking_for, p.education_status, p.experience_years, p.experience_months,
    p.passing_year, p.resume_url, p.social_links,
    p.designation_id, dr.name, p.designation_seniority,
    p.category_domain_id, cd.name, p.category_role_id, cr.name,
    p.current_location_id, loc.name, cur_state.name,
    coalesce(array_agg(distinct ot_state.name) filter (where ot_state.name is not null), '{}'),
    coalesce(array_agg(distinct s.name) filter (where s.name is not null), '{}'),
    p.current_ctc, p.expected_ctc,
    ja.job_id, jp.title, jp.company_name, ja.created_at, ja.status, ja.next_action
  from public.job_applications ja
  join public.job_posts jp on jp.id = ja.job_id
  join public.profiles p on p.id = ja.applicant_id
  left join public.base_roles dr on dr.id = p.designation_id
  left join public.domains cd on cd.id = p.category_domain_id
  left join public.base_roles cr on cr.id = p.category_role_id
  left join public.locations loc on loc.id = p.current_location_id
  left join public.states cur_state on cur_state.id = loc.state_id
  left join public.user_open_to_locations uotl on uotl.user_id = p.id
  left join public.locations otl on otl.id = uotl.location_id
  left join public.states ot_state on ot_state.id = otl.state_id
  left join public.user_skills us on us.user_id = p.id
  left join public.skills s on s.id = us.skill_id
  where jp.created_by = auth.uid()
    and (p_status is null or ja.status = p_status)
  group by
    p.id, p.full_name, p.email, p.bio, p.current_status, p.notice_period,
    p.looking_for, p.education_status, p.experience_years, p.experience_months,
    p.passing_year, p.resume_url, p.social_links, p.designation_id, dr.name,
    p.designation_seniority, p.category_domain_id, cd.name, p.category_role_id,
    cr.name, p.current_location_id, loc.name, cur_state.name, p.current_ctc,
    p.expected_ctc, ja.job_id, jp.title, jp.company_name, ja.created_at, ja.status,
    ja.next_action
  order by ja.created_at desc;
$body$;

revoke all on function public.get_my_job_applicants(text) from public, anon;
grant execute on function public.get_my_job_applicants(text) to authenticated;

notify pgrst, 'reload schema';
```

`get_my_job_applicants` also needs `job_posts.company_name` so the
Applicants detail pane can show which company is hiring below the job
title. Return-shape change, so drop before recreate:

```sql
drop function if exists public.get_my_job_applicants(text);

create or replace function public.get_my_job_applicants(p_status text default null)
returns table (
  applicant_id uuid,
  full_name text,
  email text,
  bio text,
  current_status public.current_status_type,
  notice_period public.notice_period_type,
  looking_for public.looking_for_type[],
  education_status public.education_status_type,
  experience_years integer,
  experience_months integer,
  passing_year integer,
  resume_url text,
  social_links jsonb,
  designation_id uuid,
  designation_name text,
  designation_seniority public.seniority_level,
  category_domain_id uuid,
  category_domain_name text,
  category_role_id uuid,
  category_role_name text,
  current_location_id uuid,
  current_location_name text,
  current_location_state_name text,
  open_to_state_names text[],
  skills text[],
  current_ctc numeric,
  expected_ctc numeric,
  job_id uuid,
  job_title text,
  company_name text,
  applied_at timestamptz,
  status text
)
language sql
security definer
set search_path = public
stable
as $body$
  select
    p.id, p.full_name, p.email, p.bio, p.current_status, p.notice_period,
    p.looking_for, p.education_status, p.experience_years, p.experience_months,
    p.passing_year, p.resume_url, p.social_links,
    p.designation_id, dr.name, p.designation_seniority,
    p.category_domain_id, cd.name, p.category_role_id, cr.name,
    p.current_location_id, loc.name, cur_state.name,
    coalesce(array_agg(distinct ot_state.name) filter (where ot_state.name is not null), '{}'),
    coalesce(array_agg(distinct s.name) filter (where s.name is not null), '{}'),
    p.current_ctc, p.expected_ctc,
    ja.job_id, jp.title, jp.company_name, ja.created_at, ja.status
  from public.job_applications ja
  join public.job_posts jp on jp.id = ja.job_id
  join public.profiles p on p.id = ja.applicant_id
  left join public.base_roles dr on dr.id = p.designation_id
  left join public.domains cd on cd.id = p.category_domain_id
  left join public.base_roles cr on cr.id = p.category_role_id
  left join public.locations loc on loc.id = p.current_location_id
  left join public.states cur_state on cur_state.id = loc.state_id
  left join public.user_open_to_locations uotl on uotl.user_id = p.id
  left join public.locations otl on otl.id = uotl.location_id
  left join public.states ot_state on ot_state.id = otl.state_id
  left join public.user_skills us on us.user_id = p.id
  left join public.skills s on s.id = us.skill_id
  where jp.created_by = auth.uid()
    and (p_status is null or ja.status = p_status)
  group by
    p.id, p.full_name, p.email, p.bio, p.current_status, p.notice_period,
    p.looking_for, p.education_status, p.experience_years, p.experience_months,
    p.passing_year, p.resume_url, p.social_links, p.designation_id, dr.name,
    p.designation_seniority, p.category_domain_id, cd.name, p.category_role_id,
    cr.name, p.current_location_id, loc.name, cur_state.name, p.current_ctc,
    p.expected_ctc, ja.job_id, jp.title, jp.company_name, ja.created_at, ja.status
  order by ja.created_at desc;
$body$;

revoke all on function public.get_my_job_applicants(text) from public, anon;
grant execute on function public.get_my_job_applicants(text) to authenticated;

notify pgrst, 'reload schema';
```

---

## Applicants: server-side pagination + count (cost/bandwidth reduction)

The `/applicants` page currently calls `get_my_job_applicants(p_status)` and
pulls back **every** applicant that ever applied to any of the poster's job
posts, every time the tab loads (client then slices/filters it in the
browser). For a poster with a small applicant pool this is fine, but it
doesn't scale: every uncached load ships the full joined result set (skills
arrays, open-to-location arrays, social links jsonb, etc. for every row) over
the wire, even though the UI only ever renders one page at a time. Egress
bandwidth is one of Supabase's billed dimensions, so this scales with total
applicants, not with what's actually shown.

This revision adds `p_job_id`, `p_page`, and `p_page_size` parameters (all
optional, defaulting to the old "return everything" behavior so existing
callers that don't pass them keep working unchanged), moves the job-post
filter into SQL instead of filtering client-side after the full fetch, and
splits the total-row count into a separate lightweight function (mirrors the
pattern already used for `job_posts` in `listSignedInJobs.js` —
`count: 'exact', head: true` run as its own query rather than folded into the
main one) so counting doesn't pay for the same joins/aggregation as the
actual page fetch.

This also restores `next_action` to the return shape — a later revision that
added `company_name` (the "`get_my_job_applicants` also needs
`job_posts.company_name`" section above) dropped it by accident when it
copy-pasted an earlier `create or replace` instead of the version that
already had `next_action` added. If your Shortlisted tab's "Next Action"
picker has been silently forgetting your selection on reload, this is why —
worth checking before/after you run this.

Return-shape and signature change, so drop before recreate:

```sql
drop function if exists public.get_my_job_applicants(text);

create or replace function public.get_my_job_applicants(
  p_status text default null,
  p_job_id uuid default null,
  p_page int default null,
  p_page_size int default null
)
returns table (
  applicant_id uuid,
  full_name text,
  email text,
  bio text,
  current_status public.current_status_type,
  notice_period public.notice_period_type,
  looking_for public.looking_for_type[],
  education_status public.education_status_type,
  experience_years integer,
  experience_months integer,
  passing_year integer,
  resume_url text,
  social_links jsonb,
  designation_id uuid,
  designation_name text,
  designation_seniority public.seniority_level,
  category_domain_id uuid,
  category_domain_name text,
  category_role_id uuid,
  category_role_name text,
  current_location_id uuid,
  current_location_name text,
  current_location_state_name text,
  open_to_state_names text[],
  skills text[],
  current_ctc numeric,
  expected_ctc numeric,
  job_id uuid,
  job_title text,
  company_name text,
  applied_at timestamptz,
  status text,
  next_action text
)
language sql
security definer
set search_path = public
stable
as $body$
  select
    p.id, p.full_name, p.email, p.bio, p.current_status, p.notice_period,
    p.looking_for, p.education_status, p.experience_years, p.experience_months,
    p.passing_year, p.resume_url, p.social_links,
    p.designation_id, dr.name, p.designation_seniority,
    p.category_domain_id, cd.name, p.category_role_id, cr.name,
    p.current_location_id, loc.name, cur_state.name,
    coalesce(array_agg(distinct ot_state.name) filter (where ot_state.name is not null), '{}'),
    coalesce(array_agg(distinct s.name) filter (where s.name is not null), '{}'),
    p.current_ctc, p.expected_ctc,
    ja.job_id, jp.title, jp.company_name, ja.created_at, ja.status, ja.next_action
  from public.job_applications ja
  join public.job_posts jp on jp.id = ja.job_id
  join public.profiles p on p.id = ja.applicant_id
  left join public.base_roles dr on dr.id = p.designation_id
  left join public.domains cd on cd.id = p.category_domain_id
  left join public.base_roles cr on cr.id = p.category_role_id
  left join public.locations loc on loc.id = p.current_location_id
  left join public.states cur_state on cur_state.id = loc.state_id
  left join public.user_open_to_locations uotl on uotl.user_id = p.id
  left join public.locations otl on otl.id = uotl.location_id
  left join public.states ot_state on ot_state.id = otl.state_id
  left join public.user_skills us on us.user_id = p.id
  left join public.skills s on s.id = us.skill_id
  where jp.created_by = auth.uid()
    and (p_status is null or ja.status = p_status)
    and (p_job_id is null or ja.job_id = p_job_id)
  group by
    p.id, p.full_name, p.email, p.bio, p.current_status, p.notice_period,
    p.looking_for, p.education_status, p.experience_years, p.experience_months,
    p.passing_year, p.resume_url, p.social_links, p.designation_id, dr.name,
    p.designation_seniority, p.category_domain_id, cd.name, p.category_role_id,
    cr.name, p.current_location_id, loc.name, cur_state.name, p.current_ctc,
    p.expected_ctc, ja.job_id, jp.title, jp.company_name, ja.created_at, ja.status,
    ja.next_action
  order by ja.created_at desc
  limit case when p_page_size is null then null else p_page_size end
  offset case
    when p_page is null or p_page_size is null then 0
    else (greatest(p_page, 1) - 1) * p_page_size
  end;
$body$;

revoke all on function public.get_my_job_applicants(text, uuid, int, int) from public, anon;
grant execute on function public.get_my_job_applicants(text, uuid, int, int) to authenticated;

-- Lightweight sibling for the total-row count the Applicants page needs to
-- render "Page X of Y" -- no joins beyond job_posts (needed for the
-- created_by ownership check), so it's cheap to run on every page change
-- even though get_my_job_applicants itself only computes one page at a time.
create or replace function public.count_my_job_applicants(
  p_status text default null,
  p_job_id uuid default null
)
returns bigint
language sql
security definer
set search_path = public
stable
as $body$
  select count(*)
  from public.job_applications ja
  join public.job_posts jp on jp.id = ja.job_id
  where jp.created_by = auth.uid()
    and (p_status is null or ja.status = p_status)
    and (p_job_id is null or ja.job_id = p_job_id);
$body$;

revoke all on function public.count_my_job_applicants(text, uuid) from public, anon;
grant execute on function public.count_my_job_applicants(text, uuid) to authenticated;

notify pgrst, 'reload schema';
```

Old call sites (`get_my_job_applicants({ p_status })`) keep working exactly
as before — the new params all default to "no filter / no limit" — so this
is safe to run ahead of any frontend change. Once it's live, the frontend can
be updated to pass `p_job_id`/`p_page`/`p_page_size` and call
`count_my_job_applicants` for the total, which turns today's "fetch
everything, cache and paginate in the browser" into true server-side
pagination like the `/jobs` feed already has.

---

## Admin dashboard analytics (user counts by role, recently active users)

The admin role now gets an analytics view on `/dashboard` instead of the
learner course-browsing view: total courses (static, no query needed),
user counts per role, and a list of recently active users. Two new
functions back this:

- `admin_user_counts_by_role()` — `group by role` over `profiles`, so it
  returns one row per role instead of every profile row.
- `admin_recent_active_users(p_limit)` — joins `profiles` to
  `auth.users.last_sign_in_at`, which Supabase Auth updates on every sign-in.
  `auth.users` isn't reachable directly from the client (no anon/authenticated
  grant on that schema), so this has to go through a `security definer`
  function the same way `handle_new_user`/`handle_user_confirmed` already do.

Both are gated to admins only via the existing `public.is_admin()` helper
(from the [fresh schema](#fresh-schema-all-tables) above) — the `where ...
and public.is_admin()` clause means a non-admin caller gets an empty result
set back rather than an error, consistent with how RLS-style checks read
elsewhere in this file.

```sql
create or replace function public.admin_user_counts_by_role()
returns table (role text, user_count bigint)
language sql
security definer
set search_path = public
stable
as $body$
  select role::text, count(*) as user_count
  from public.profiles
  where deleted_at is null and public.is_admin()
  group by role
  order by role;
$body$;

revoke all on function public.admin_user_counts_by_role() from public, anon;
grant execute on function public.admin_user_counts_by_role() to authenticated;

create or replace function public.admin_recent_active_users(p_limit int default 10)
returns table (
  id uuid,
  email text,
  full_name text,
  role text,
  last_sign_in_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $body$
  select p.id, p.email, p.full_name, p.role::text, u.last_sign_in_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.deleted_at is null
    and u.last_sign_in_at is not null
    and public.is_admin()
  order by u.last_sign_in_at desc
  limit greatest(1, least(p_limit, 50));
$body$;

revoke all on function public.admin_recent_active_users(int) from public, anon;
grant execute on function public.admin_recent_active_users(int) to authenticated;

notify pgrst, 'reload schema';
```

Both verified against a real Postgres 17 instance (with a mock `auth.users`
+ `profiles` + `is_admin()`) before being handed over — confirmed empty
result set for a non-admin caller and correct grouped/ordered rows for an
admin caller.

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
