-- Judge0 monthly call limit (paid users)
-- Run once in the Supabase SQL editor. Backs apps/app/src/lib/judge0MonthlyLimit.ts,
-- used by /api/judge0/batch (both kind:"run" and "submit") and
-- /api/judge0/custom -- every Judge0 call counts, not just Submit.
-- Source: SupabaseSchema.md, "Judge0 monthly call limit (paid users)"

-- One row per counted call (a real Judge0 verdict, not an infra failure).
-- "Remaining" is derived as limit minus count(rows in the current calendar
-- month) -- no stored counter, no cron reset needed.
create table if not exists public.judge0_monthly_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists judge0_monthly_submissions_user_month_idx
  on public.judge0_monthly_submissions (user_id, created_at);

alter table public.judge0_monthly_submissions enable row level security;
-- deliberately no select/insert/update policy for anon/authenticated --
-- only the service-role client (judge0MonthlyLimit.ts) touches this table,
-- bypassing RLS. Mirrors judge0_submission_cache / cron_runs.

-- Single source of truth for "current calendar month" boundary -- called by
-- judge0_monthly_status so the number CoreEditor displays and the number
-- that gates every Judge0 route can never disagree.
create or replace function public.judge0_month_start()
returns timestamptz
language sql
stable
as $$
  select date_trunc('month', now());
$$;

-- Read-only status: used by the pre-flight check in /api/judge0/batch AND
-- /api/judge0/custom, AND by /api/judge0/usage (CoreEditor's display) --
-- literally the same function call in all three, so enforcement and
-- display can't diverge. p_limit is passed in from
-- JUDGE0_MONTHLY_LIMIT_PAID -- never hardcoded here.
create or replace function public.judge0_monthly_status(p_user_id uuid, p_limit integer)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_month_start timestamptz := public.judge0_month_start();
  v_used integer;
begin
  select count(*) into v_used
    from public.judge0_monthly_submissions
    where user_id = p_user_id and created_at >= v_month_start;

  return jsonb_build_object(
    'limit', p_limit,
    'used', v_used,
    'remaining', greatest(p_limit - v_used, 0),
    'resetsAt', v_month_start + interval '1 month'
  );
end;
$$;

revoke execute on function public.judge0_monthly_status(uuid, integer) from public;
revoke execute on function public.judge0_monthly_status(uuid, integer) from anon;
revoke execute on function public.judge0_monthly_status(uuid, integer) from authenticated;
grant execute on function public.judge0_monthly_status(uuid, integer) to service_role;

notify pgrst, 'reload schema';
