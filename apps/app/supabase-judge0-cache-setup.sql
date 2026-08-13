-- Judge0 submission result cache (RapidAPI migration)
-- Run this once in the Supabase SQL editor to back the cache lookup in
-- apps/app/src/lib/judge0Cache.ts, used by /api/judge0/batch.
-- Source: SupabaseSchema.md, "Judge0 submission result cache"

create table if not exists public.judge0_submission_cache (
  cache_key text primary key,
  result jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.judge0_submission_cache enable row level security;
-- deliberately no select/insert/update policy for anon/authenticated --
-- only the service-role client (judge0Cache.ts) touches this table,
-- bypassing RLS. Mirrors public.cron_runs.

-- No TTL/expiry in v1 -- rows accumulate indefinitely. If this becomes a
-- storage concern, add a cron job pruning rows past some age, same pattern
-- as api/cron/expire-paid-users.

notify pgrst, 'reload schema';
