-- ============================================================================
-- GetGuac Migration 022 — Audit log
-- ============================================================================
-- One row per security-relevant action: sign-in, sign-out, alias claim,
-- account delete, data export, email-inbox poll batch, etc.
--
-- RLS: users see their own log entries. Admins see all (via is_admin flag).
-- Inserts go through a SECURITY DEFINER RPC so the writer doesn't need
-- table-level INSERT — keeps the surface tight.
--
-- Safe to re-run.
-- ============================================================================

create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  action      text not null,           -- 'sign_in', 'sign_out', 'alias_claim', 'mailbox_provision', 'account_delete', 'data_export', 'email_poll', 'password_reset'
  status      text not null,           -- 'ok' | 'denied' | 'error'
  ip          inet,
  user_agent  text,
  detail      jsonb,                   -- { reason, errCode, target, count, ... }
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_log_user_time on public.audit_log(user_id, created_at desc);
create index if not exists idx_audit_log_action     on public.audit_log(action, created_at desc);

alter table public.audit_log enable row level security;

do $$ begin
  drop policy if exists "al: select own"  on public.audit_log;
  drop policy if exists "al: select admin" on public.audit_log;
  drop policy if exists "al: insert any"  on public.audit_log;

  create policy "al: select own" on public.audit_log
    for select using (auth.uid() = user_id);
  create policy "al: select admin" on public.audit_log
    for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
  -- Direct INSERTs only via the RPC (security definer). No public INSERT.
end $$;

create or replace function public.log_audit(
  p_action text,
  p_status text,
  p_detail jsonb default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (user_id, action, status, detail)
  values (auth.uid(), p_action, p_status, p_detail);
end $$;

revoke all on function public.log_audit(text, text, jsonb) from public;
grant execute on function public.log_audit(text, text, jsonb) to authenticated, service_role;

notify pgrst, 'reload schema';
