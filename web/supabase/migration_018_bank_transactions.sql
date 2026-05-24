-- ============================================================================
-- GetGuac Migration 018 — Bank statement transactions (full ledger per upload)
-- ============================================================================
-- Migration 017 added bank_statements + bank_fees. That covers the STATEMENT
-- entity and the FEE/INTEREST charges, but it loses the rows the user did NOT
-- opt to import as receipts (regular purchases, refunds, card payments) — those
-- rows were extracted by the AI parser and then thrown away.
--
-- This migration adds `bank_transactions`: every parsed row from every
-- uploaded statement, regardless of whether the user opted to import it as a
-- receipt. With this, the Bank page can show "here is statement X and every
-- transaction the bank reported on it", and the user can later import skipped
-- rows on second look without re-parsing the file.
--
-- Relationships:
--   bank_statements  1 ─── many ─→  bank_transactions
--   bank_transactions  0..1 ──→  receipts        (set when imported as a receipt)
--   bank_transactions  0..1 ──→  bank_fees       (set when also logged as a fee)
--
-- Safe to re-run.
-- ============================================================================

create table if not exists public.bank_transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  statement_id    uuid not null references public.bank_statements(id) on delete cascade,
  -- Optional cross-links: filled in when the row was ALSO imported as a receipt
  -- and/or recorded in bank_fees.
  receipt_id      uuid references public.receipts(id)  on delete set null,
  fee_id          uuid references public.bank_fees(id) on delete set null,

  -- Position in the parsed list (for stable ordering when re-rendering)
  position        int,

  -- Core transaction fields
  date            date not null,
  merchant        text not null,
  raw_description text,
  amount          numeric not null,           -- signed: positive = money out
  category        text,                       -- spending category (null for non-spending rows)
  kind            text not null,              -- 'purchase'|'refund'|'fee'|'interest'|'payment'|'deposit'|'withdrawal'|'transfer'|'other'
  fee_kind        text,                       -- when kind in ('fee','interest'): short label

  -- Classification flags (exactly one is true, or all false for "purchase")
  is_payment      boolean not null default false,
  is_fee          boolean not null default false,
  is_interest     boolean not null default false,
  is_refund       boolean not null default false,

  -- User decisions captured at import time
  imported        boolean not null default false,   -- did the user opt to import this as a receipt
  business        boolean not null default false,   -- was the row tagged as a business expense
  city            text,
  state           text,

  created_at      timestamptz not null default now()
);

create index if not exists idx_bank_transactions_user_date_desc
  on public.bank_transactions(user_id, date desc);
create index if not exists idx_bank_transactions_statement_pos
  on public.bank_transactions(statement_id, position);
create index if not exists idx_bank_transactions_user_kind
  on public.bank_transactions(user_id, kind);
create index if not exists idx_bank_transactions_receipt
  on public.bank_transactions(receipt_id) where receipt_id is not null;
create index if not exists idx_bank_transactions_unimported
  on public.bank_transactions(user_id, statement_id) where imported = false;

alter table public.bank_transactions enable row level security;

do $$ begin
  drop policy if exists "btx: select own" on public.bank_transactions;
  drop policy if exists "btx: insert own" on public.bank_transactions;
  drop policy if exists "btx: update own" on public.bank_transactions;
  drop policy if exists "btx: delete own" on public.bank_transactions;

  create policy "btx: select own" on public.bank_transactions
    for select using (auth.uid() = user_id);
  create policy "btx: insert own" on public.bank_transactions
    for insert with check (auth.uid() = user_id);
  create policy "btx: update own" on public.bank_transactions
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  create policy "btx: delete own" on public.bank_transactions
    for delete using (auth.uid() = user_id);
end $$;

-- Extend bank_statements with a counter that summarizes the ledger
alter table public.bank_statements
  add column if not exists transaction_count int not null default 0;

notify pgrst, 'reload schema';
