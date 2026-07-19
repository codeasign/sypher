-- Locations catalog (States & Locations)
-- Run this once in the Supabase SQL editor to back the "Locations" tab
-- in Manage Course Access and /api/locations.
-- Source: SupabaseSchema.md, "Locations catalog (States & Locations)"

-- 1. Tables ------------------------------------------------------------

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

-- 2. RLS -----------------------------------------------------------------

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

-- 3. admin_save_location_state(payload jsonb) -----------------------------
-- Upserts one state by name, upserts/updates each pasted location scoped to
-- (state_id, slug), deletes any location under that state not present in
-- this save (an empty `locations` array clears the state), and bumps
-- locations_meta.version for /api/locations's cache to pick up.

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
