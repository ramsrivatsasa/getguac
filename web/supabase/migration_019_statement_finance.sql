-- ============================================================================
-- GetGuac Migration 019 — Statement finance fields
-- ============================================================================
-- Adds the fields the user actually cares about on a credit-card statement:
-- minimum payment, due date, APRs, balance, and a payoff estimate.
-- ============================================================================

alter table public.bank_statements
  add column if not exists previous_balance       numeric,
  add column if not exists new_balance            numeric,
  add column if not exists credit_limit           numeric,
  add column if not exists available_credit       numeric,
  add column if not exists minimum_payment_due    numeric,
  add column if not exists payment_due_date       date,
  add column if not exists purchase_apr           numeric,   -- annual %, e.g. 24.99 (NOT a decimal)
  add column if not exists balance_transfer_apr   numeric,
  add column if not exists cash_advance_apr       numeric,
  add column if not exists payoff_months_min      int,        -- months to clear new_balance paying ONLY minimum each month
  add column if not exists payoff_total_interest  numeric;    -- total interest paid on the minimum-only schedule

create index if not exists idx_bank_statements_due
  on public.bank_statements(user_id, payment_due_date) where payment_due_date is not null;

-- ── Payoff calculator ─────────────────────────────────────────────────────
-- Given balance B, monthly min payment M, monthly rate r = APR/100/12:
--   - if M <= B*r → minimum never even covers interest → return null (infinite)
--   - else        n = -log(1 - r*B/M) / log(1 + r)
-- Total interest = M*n - B
create or replace function public.estimate_payoff(
  p_balance numeric,
  p_min_payment numeric,
  p_apr_percent numeric            -- e.g. 24.99 for 24.99%
)
returns table (months int, total_interest numeric)
language plpgsql immutable
as $$
declare
  r numeric;
  n numeric;
begin
  if p_balance is null or p_balance <= 0
     or p_min_payment is null or p_min_payment <= 0
     or p_apr_percent is null or p_apr_percent < 0 then
    months := null; total_interest := null; return next; return;
  end if;

  r := p_apr_percent / 100.0 / 12.0;

  -- 0% APR: linear payoff
  if r = 0 then
    months := ceil(p_balance / p_min_payment)::int;
    total_interest := 0;
    return next; return;
  end if;

  -- Minimum never covers monthly interest → never pays off
  if p_min_payment <= p_balance * r then
    months := null; total_interest := null; return next; return;
  end if;

  n := - ln(1 - r * p_balance / p_min_payment) / ln(1 + r);
  months := ceil(n)::int;
  total_interest := round((p_min_payment * months - p_balance)::numeric, 2);
  return next;
end $$;

-- Trigger to keep payoff_months_min + payoff_total_interest in sync whenever
-- the inputs change. Means the client never has to recompute on the fly.
create or replace function public.bank_statements_recalc_payoff() returns trigger
language plpgsql as $$
declare
  m int;
  ti numeric;
begin
  select months, total_interest into m, ti
    from public.estimate_payoff(new.new_balance, new.minimum_payment_due, new.purchase_apr);
  new.payoff_months_min := m;
  new.payoff_total_interest := ti;
  return new;
end $$;

drop trigger if exists trg_bank_stmt_payoff on public.bank_statements;
create trigger trg_bank_stmt_payoff
  before insert or update of new_balance, minimum_payment_due, purchase_apr
  on public.bank_statements
  for each row execute function public.bank_statements_recalc_payoff();

notify pgrst, 'reload schema';
