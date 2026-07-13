-- ── slugify helper (shared by every taxonomy insert below) ──
create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(trim(input)), '[^a-z0-9]+', '-', 'g'));
$$;

-- ── core catalog tables ──
do $$ begin
  create type public.seniority_level as enum ('base', 'senior', 'lead', 'staff', 'principal');
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
-- registry entry -> resolve each technology's category (by id, by name —
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
      raise exception 'slug "%" is already registered as a %, cannot register as a role', v_slug, v_kind;
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
      raise exception 'slug "%" is already registered as a %, cannot register as a skill', v_slug, v_kind;
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
      raise exception 'slug "%" is already registered as a %, cannot register as a technology', v_slug, v_kind;
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
-- security boundary.
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
