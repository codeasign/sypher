-- Profile: Category (domain) + Current Location + Open to Location
-- Run this once in the Supabase SQL editor to back the new fields on
-- /profile (Category, Current Location, Open to Location).
-- Source: SupabaseSchema.md, "Profile category & location"

-- 1. profiles: category (current role) + current location ----------------

alter table public.profiles add column if not exists category_domain_id uuid references public.domains(id);
alter table public.profiles add column if not exists category_role_id uuid references public.base_roles(id);
alter table public.profiles add column if not exists current_location_id uuid references public.locations(id);

-- 2. Open-to-locations junction (mirrors user_skills shape, no proficiency/years)

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

-- 3. update_own_location_and_category(payload) ----------------------------
-- Own function, mirrors update_own_designation's self-scoping
-- (id = auth.uid(), no user-id param) so update_own_profile's argument
-- list doesn't keep growing.

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
