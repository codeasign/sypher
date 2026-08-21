-- Multi-vendor email rotation quota tracking (Brevo + Resend)
-- Run once in the Supabase SQL editor. Backs apps/app/src/lib/email/emailQuota.ts,
-- used by apps/app/src/lib/email/rotation.ts (pre-send quota check) and
-- app/api/email/test (status display + standalone test sends).
-- Source: SupabaseSchema.md, "Email rotation quota (Brevo + Resend)"
--
-- STANDALONE SYSTEM: not wired into Supabase Auth's Send Email Hook yet --
-- that's a separate follow-up step. This table only tracks sends made
-- through sendEmailWithRotation, never Auth's own magic-link/OTP mailer.

-- One row per confirmed successful send (mirrors judge0_monthly_submissions:
-- "remaining" is derived as limit minus count(rows in the current period),
-- no stored counter, no cron reset needed). to_email/subject are for admin
-- debugging via the test endpoint, not required by the quota math itself.
create table if not exists public.email_sends (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  to_email text,
  subject text,
  sent_at timestamptz not null default now()
);

create index if not exists email_sends_provider_sent_at_idx
  on public.email_sends (provider, sent_at);

alter table public.email_sends enable row level security;
-- deliberately no select/insert/update policy for anon/authenticated --
-- only the service-role client (emailQuota.ts) touches this table,
-- bypassing RLS. Mirrors judge0_monthly_submissions.

-- Single source of truth for period boundaries -- called by both status
-- functions below so the enforcement check (rotation.ts, via isUnderQuota)
-- and the display status (api/email/test GET) can never disagree.
create or replace function public.email_day_start()
returns timestamptz
language sql
stable
as $$
  select date_trunc('day', now());
$$;

create or replace function public.email_month_start()
returns timestamptz
language sql
stable
as $$
  select date_trunc('month', now());
$$;

-- Generic per-provider daily status. p_provider is a free-text tag
-- ('brevo', 'resend', ...) matching EmailProviderName in emailQuota.ts --
-- adding a third provider needs no SQL change, just a new PROVIDER_CAPS
-- entry in emailQuota.ts pointing at this same function. p_limit is passed
-- in from env (BREVO_DAILY_LIMIT / RESEND_DAILY_LIMIT) -- never hardcoded here.
create or replace function public.email_daily_status(p_provider text, p_limit integer)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_period_start timestamptz := public.email_day_start();
  v_used integer;
begin
  select count(*) into v_used
    from public.email_sends
    where provider = p_provider and sent_at >= v_period_start;

  return jsonb_build_object(
    'limit', p_limit,
    'used', v_used,
    'remaining', greatest(p_limit - v_used, 0),
    'resetsAt', v_period_start + interval '1 day'
  );
end;
$$;

-- Generic per-provider monthly status -- only Resend uses this today (its
-- free tier caps both daily AND monthly independently), but any future
-- provider with a monthly-only cap can reuse it directly.
create or replace function public.email_monthly_status(p_provider text, p_limit integer)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_period_start timestamptz := public.email_month_start();
  v_used integer;
begin
  select count(*) into v_used
    from public.email_sends
    where provider = p_provider and sent_at >= v_period_start;

  return jsonb_build_object(
    'limit', p_limit,
    'used', v_used,
    'remaining', greatest(p_limit - v_used, 0),
    'resetsAt', v_period_start + interval '1 month'
  );
end;
$$;

revoke execute on function public.email_daily_status(text, integer) from public;
revoke execute on function public.email_daily_status(text, integer) from anon;
revoke execute on function public.email_daily_status(text, integer) from authenticated;
grant execute on function public.email_daily_status(text, integer) to service_role;

revoke execute on function public.email_monthly_status(text, integer) from public;
revoke execute on function public.email_monthly_status(text, integer) from anon;
revoke execute on function public.email_monthly_status(text, integer) from authenticated;
grant execute on function public.email_monthly_status(text, integer) to service_role;

notify pgrst, 'reload schema';
