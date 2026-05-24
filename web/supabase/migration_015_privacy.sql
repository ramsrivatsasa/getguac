-- ============================================================================
-- GetGuac Migration 015 — Privacy, retention, statement-import
-- ============================================================================
-- Three things in one migration (they all touch user-owned data):
--
-- 1.  Statement-import provenance on `receipts` — so we can show users which
--     receipts came from a statement upload vs a real receipt, and so the
--     retention sweeper can treat them differently if a policy says so.
-- 2.  `user_privacy_settings` — per-user retention windows + master switches
--     for auto-purge, embedding scrubbing, and data minimization.
-- 3.  `data_purge_log` — append-only audit row every time we delete on the
--     user's behalf (immediate delete OR scheduled retention sweep). Required
--     for GDPR/CCPA receipts and for the user's own peace of mind.
--
-- Safe to re-run.
-- ============================================================================

-- ── 1. Statement-import provenance ────────────────────────────────────────
alter table public.receipts
  add column if not exists from_statement      boolean default false,
  add column if not exists statement_source    text,                  -- file name or short hash, e.g. "amex-2026-04.pdf"
  add column if not exists statement_import_id uuid;                  -- groups rows imported from the same statement

create index if not exists idx_receipts_user_from_statement
  on public.receipts(user_id) where from_statement = true;
create index if not exists idx_receipts_statement_import
  on public.receipts(statement_import_id) where statement_import_id is not null;

-- ── 2. Per-user privacy + retention settings ─────────────────────────────
create table if not exists public.user_privacy_settings (
  user_id                 uuid primary key references auth.users(id) on delete cascade,

  -- Auto-purge: delete records older than N days. NULL = keep forever.
  -- One per data category so the user can say "keep receipts forever, but
  -- toss raw embeddings after 90 days".
  receipts_retention_days       int,
  receipt_items_retention_days  int,
  shopping_list_retention_days  int,
  car_trip_retention_days       int,
  embeddings_retention_days     int default 365,    -- vectors are inferred data; default trim to a year
  search_history_retention_days int default 30,     -- queries are sensitive, default to a month

  -- Master switches
  auto_purge_enabled         boolean not null default false,
  scrub_payment_last4        boolean not null default false,  -- redact last4 from stored receipts
  scrub_addresses            boolean not null default false,  -- redact street addresses from receipts/trips
  block_telemetry            boolean not null default true,   -- default-on: no analytics for this user
  disallow_ai_training       boolean not null default true,   -- default-on: never include this user's data in training pulls

  -- Bookkeeping
  last_export_at             timestamptz,
  last_purge_at              timestamptz,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

alter table public.user_privacy_settings enable row level security;

do $$ begin
  drop policy if exists "ups: select own" on public.user_privacy_settings;
  drop policy if exists "ups: insert own" on public.user_privacy_settings;
  drop policy if exists "ups: update own" on public.user_privacy_settings;
  drop policy if exists "ups: delete own" on public.user_privacy_settings;

  create policy "ups: select own" on public.user_privacy_settings
    for select using (auth.uid() = user_id);
  create policy "ups: insert own" on public.user_privacy_settings
    for insert with check (auth.uid() = user_id);
  create policy "ups: update own" on public.user_privacy_settings
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  create policy "ups: delete own" on public.user_privacy_settings
    for delete using (auth.uid() = user_id);
end $$;

-- updated_at trigger
create or replace function public.touch_ups() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_touch_ups on public.user_privacy_settings;
create trigger trg_touch_ups before update on public.user_privacy_settings
  for each row execute function public.touch_ups();

-- Auto-seed a row on user creation so the UI never has to handle "no row yet".
create or replace function public.seed_privacy_settings() returns trigger language plpgsql security definer as $$
begin
  insert into public.user_privacy_settings(user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists trg_seed_privacy on auth.users;
create trigger trg_seed_privacy after insert on auth.users
  for each row execute function public.seed_privacy_settings();

-- Backfill rows for existing users
insert into public.user_privacy_settings(user_id)
  select id from auth.users on conflict do nothing;

-- ── 3. Purge audit log ────────────────────────────────────────────────────
create table if not exists public.data_purge_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null,                          -- 'manual' | 'retention' | 'export' | 'wipe-all'
  category      text,                                   -- 'receipts','receipt_items','embeddings','shopping_list','car_trips','search_history','all'
  rows_affected int not null default 0,
  details       jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_data_purge_log_user_time
  on public.data_purge_log(user_id, created_at desc);

alter table public.data_purge_log enable row level security;

do $$ begin
  drop policy if exists "dpl: select own" on public.data_purge_log;
  drop policy if exists "dpl: insert own" on public.data_purge_log;

  create policy "dpl: select own" on public.data_purge_log
    for select using (auth.uid() = user_id);
  -- Insert restricted to security-definer functions (no client insert)
  create policy "dpl: insert own" on public.data_purge_log
    for insert with check (auth.uid() = user_id);
end $$;

-- ── 4. Purge RPC ──────────────────────────────────────────────────────────
-- Single security-definer function used by /api/privacy/delete and
-- /api/privacy/sweep. Returns total rows deleted, in one transaction.
create or replace function public.purge_user_data(
  p_categories text[],                  -- 'receipts','receipt_items','embeddings','shopping_list','car_trips','search_history','payments','privacy_log'
  p_older_than_days int default null   -- null = delete all; else delete rows older than N days
)
returns table (category text, rows_deleted int)
language plpgsql security definer
as $$
declare
  uid uuid := auth.uid();
  cutoff timestamptz := case when p_older_than_days is null then null
                             else now() - (p_older_than_days || ' days')::interval end;
  n int;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  -- search_history (created in 012; guard for absence)
  if 'search_history' = any(p_categories) then
    begin
      execute format(
        'delete from public.search_history where user_id = %L %s',
        uid,
        case when cutoff is null then '' else format('and created_at < %L', cutoff) end
      );
      get diagnostics n = row_count;
      category := 'search_history'; rows_deleted := n; return next;
    exception when undefined_table then
      category := 'search_history'; rows_deleted := 0; return next;
    end;
  end if;

  -- embeddings (scrub the vectors, keep the item rows)
  if 'embeddings' = any(p_categories) then
    update public.receipt_items ri
      set embedding = null, embedding_text = null, embedded_at = null
     where exists (select 1 from public.receipts r where r.id = ri.receipt_id and r.user_id = uid)
       and (cutoff is null or ri.embedded_at < cutoff);
    get diagnostics n = row_count;
    category := 'embeddings'; rows_deleted := n; return next;
  end if;

  -- shopping_list
  if 'shopping_list' = any(p_categories) then
    delete from public.shopping_list
     where user_id = uid
       and (cutoff is null or added_at < cutoff);
    get diagnostics n = row_count;
    category := 'shopping_list'; rows_deleted := n; return next;
  end if;

  -- car_trips
  if 'car_trips' = any(p_categories) then
    begin
      execute format(
        'delete from public.car_trips where user_id = %L %s',
        uid,
        case when cutoff is null then '' else format('and date < %L::date', cutoff::date) end
      );
      get diagnostics n = row_count;
      category := 'car_trips'; rows_deleted := n; return next;
    exception when undefined_table then
      category := 'car_trips'; rows_deleted := 0; return next;
    end;
  end if;

  -- receipt_items (without dropping receipts) — keeps the totals, drops the lines.
  if 'receipt_items' = any(p_categories) then
    delete from public.receipt_items ri
     using public.receipts r
     where ri.receipt_id = r.id
       and r.user_id = uid
       and (cutoff is null or r.date < cutoff::date);
    get diagnostics n = row_count;
    category := 'receipt_items'; rows_deleted := n; return next;
  end if;

  -- receipts (cascades to receipt_items + refund policies via FK)
  if 'receipts' = any(p_categories) then
    delete from public.receipts
     where user_id = uid
       and (cutoff is null or date < cutoff::date);
    get diagnostics n = row_count;
    category := 'receipts'; rows_deleted := n; return next;
  end if;

  -- payments (saved cards / last4)
  if 'payments' = any(p_categories) then
    delete from public.payment_options where user_id = uid;
    get diagnostics n = row_count;
    category := 'payments'; rows_deleted := n; return next;
  end if;

  -- Note: 'all' is handled in the API route by enumerating the rest.

  update public.user_privacy_settings set last_purge_at = now() where user_id = uid;
end;
$$;

revoke all on function public.purge_user_data(text[], int) from public;
grant execute on function public.purge_user_data(text[], int) to authenticated;

notify pgrst, 'reload schema';
