-- ============================================================================
-- GetGuac Migration 017 — Bank statements + fees ledger
-- ============================================================================
-- The statement-import flow (added in 015) shoves rows into the `receipts`
-- table with `from_statement = true`. That works for spending reconciliation,
-- but it loses two pieces of information the user actually wants to see:
--
--   1. The STATEMENT as an entity — when was it uploaded, what issuer, what
--      account, what period, what were the issuer-reported totals.
--   2. EVERY fee + interest charge — even ones the user did NOT import as
--      receipts, so the bank-fee picture is complete.
--
-- This migration adds two tables:
--   - bank_statements  : one row per uploaded statement
--   - bank_fees        : one row per fee / interest / penalty extracted from
--                        a statement (always inserted, regardless of whether
--                        the user opted to also import it as a receipt)
--
-- Safe to re-run.
-- ============================================================================

-- ── 1. bank_statements ────────────────────────────────────────────────────
create table if not exists public.bank_statements (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  statement_import_id uuid unique,                                -- matches receipts.statement_import_id
  issuer              text,                                       -- "Chase Sapphire Preferred"
  account_last4       text,                                       -- "1234"
  statement_kind      text,                                       -- 'credit-card' | 'bank' | 'rows-only' | null
  file_name           text,
  period_start        date,
  period_end          date,
  -- Issuer-reported (or computed) totals — jsonb so we can add new keys later
  -- without an alter table. Expected shape:
  --   { purchases, refunds, fees, interest, payments, deposits }
  totals              jsonb,
  row_count           int not null default 0,                     -- transactions parsed
  imported_count      int not null default 0,                     -- transactions inserted into receipts
  fee_count           int not null default 0,                     -- transactions inserted into bank_fees
  reconciled_count    int not null default 0,                     -- pairs created by reconcile_statement_batch
  uploaded_at         timestamptz not null default now(),
  notes               text
);

create index if not exists idx_bank_statements_user_date
  on public.bank_statements(user_id, period_end desc nulls last, uploaded_at desc);
create index if not exists idx_bank_statements_user_issuer
  on public.bank_statements(user_id, issuer);

alter table public.bank_statements enable row level security;

do $$ begin
  drop policy if exists "bs: select own" on public.bank_statements;
  drop policy if exists "bs: insert own" on public.bank_statements;
  drop policy if exists "bs: update own" on public.bank_statements;
  drop policy if exists "bs: delete own" on public.bank_statements;

  create policy "bs: select own" on public.bank_statements
    for select using (auth.uid() = user_id);
  create policy "bs: insert own" on public.bank_statements
    for insert with check (auth.uid() = user_id);
  create policy "bs: update own" on public.bank_statements
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  create policy "bs: delete own" on public.bank_statements
    for delete using (auth.uid() = user_id);
end $$;

-- ── 2. bank_fees ──────────────────────────────────────────────────────────
-- Always inserted for every fee / interest / penalty row in a statement,
-- whether or not the user also imported that row as a receipt. Lets the
-- fee picture stay complete even if the user de-selects fees at import time.
create table if not exists public.bank_fees (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  statement_id    uuid references public.bank_statements(id) on delete cascade,
  receipt_id      uuid references public.receipts(id) on delete set null,  -- non-null if also imported as a receipt
  date            date not null,
  kind            text not null,                                  -- 'fee' | 'interest' | 'penalty'
  fee_kind        text,                                            -- "Annual fee","Foreign tx fee","ATM fee","Overdraft","Late fee","Purchase interest","Cash-advance interest"
  merchant        text,                                            -- raw merchant / payee field if present
  amount          numeric not null,                                -- positive (money out)
  raw_description text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_bank_fees_user_date_desc
  on public.bank_fees(user_id, date desc);
create index if not exists idx_bank_fees_statement
  on public.bank_fees(statement_id);
create index if not exists idx_bank_fees_user_kind
  on public.bank_fees(user_id, kind);
create index if not exists idx_bank_fees_user_feekind
  on public.bank_fees(user_id, fee_kind) where fee_kind is not null;

alter table public.bank_fees enable row level security;

do $$ begin
  drop policy if exists "bf: select own" on public.bank_fees;
  drop policy if exists "bf: insert own" on public.bank_fees;
  drop policy if exists "bf: update own" on public.bank_fees;
  drop policy if exists "bf: delete own" on public.bank_fees;

  create policy "bf: select own" on public.bank_fees
    for select using (auth.uid() = user_id);
  create policy "bf: insert own" on public.bank_fees
    for insert with check (auth.uid() = user_id);
  create policy "bf: update own" on public.bank_fees
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  create policy "bf: delete own" on public.bank_fees
    for delete using (auth.uid() = user_id);
end $$;

-- ── 3. Roll-ups view ──────────────────────────────────────────────────────
-- Quick "fees this year by issuer" / "fees by kind" — both heavy on the UI
-- side, both better as views so the client doesn't reinvent the sum.
create or replace view public.bank_fee_summary as
  select
    bf.user_id,
    bs.issuer,
    sum(bf.amount)     as total_amount,
    count(*)           as fee_count,
    max(bf.date)       as latest_date
  from public.bank_fees bf
  left join public.bank_statements bs on bs.id = bf.statement_id
  group by bf.user_id, bs.issuer;

-- View runs as caller, so RLS on bank_fees / bank_statements still applies.
notify pgrst, 'reload schema';
