-- ============================================================================
-- GetGuac Migration 016 — Receipt ↔ statement reconciliation
-- ============================================================================
-- When a credit-card or bank statement gets imported, every transaction row
-- becomes a `from_statement = true` receipt. The user already has REAL receipts
-- for many of those purchases. This migration adds:
--
--  1. `reconciled`, `reconciled_with`, `reconciled_at` columns on receipts —
--     a pair of rows points at each other (statement-row ←→ real-receipt).
--  2. `reconcile_pair()`, `reconcile_statement_batch()`, `reconcile_all()` —
--     RPCs that find matches by date ± tolerance, store-name similarity, and
--     amount ± cents. They flip both sides' `reconciled` flag and cross-link.
--
-- Match criteria (all must hold):
--   - same user
--   - one side has `from_statement = true`, the other has `from_statement = false`
--   - dates within ±3 days (statements post 1–3 days after purchase)
--   - same sign on total_amount (purchases match purchases, refunds match refunds)
--   - |amount_a - amount_b| ≤ $0.50 (handles tip-not-yet-posted edge cases)
--   - store-name trigram similarity > 0.4 (AMAZON MKTPLACE ↔ Amazon.com)
--
-- Safe to re-run.
-- ============================================================================

-- pg_trgm gives us similarity() for fuzzy store-name match
create extension if not exists pg_trgm;

alter table public.receipts
  add column if not exists reconciled       boolean not null default false,
  add column if not exists reconciled_with  uuid references public.receipts(id) on delete set null,
  add column if not exists reconciled_at    timestamptz;

create index if not exists idx_receipts_user_reconciled
  on public.receipts(user_id, reconciled);
create index if not exists idx_receipts_reconciled_with
  on public.receipts(reconciled_with) where reconciled_with is not null;

-- Trigram index on store_name to make similarity() lookups fast at scale
create index if not exists idx_receipts_store_name_trgm
  on public.receipts using gin (store_name gin_trgm_ops);

-- ── Helper: match one statement-row against one real-receipt ──────────────
-- Returns the best (closest date) candidate id, or null.
create or replace function public.find_reconcile_match(p_receipt_id uuid)
returns uuid
language plpgsql stable security definer
as $$
declare
  uid uuid := auth.uid();
  r   record;
  m   uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select * into r from public.receipts where id = p_receipt_id and user_id = uid;
  if not found then return null; end if;

  -- Match the opposite kind: statement-row → look for real receipts, and vice versa.
  select r2.id into m
    from public.receipts r2
   where r2.user_id = uid
     and r2.id <> r.id
     and r2.reconciled = false
     and r2.from_statement = (not coalesce(r.from_statement, false))
     and abs(r2.date - r.date) <= 3
     and sign(r2.total_amount) = sign(r.total_amount)
     and abs(r2.total_amount - r.total_amount) <= 0.50
     and similarity(coalesce(r2.store_name,''), coalesce(r.store_name,'')) > 0.4
   order by abs(r2.date - r.date) asc,
            abs(r2.total_amount - r.total_amount) asc,
            similarity(coalesce(r2.store_name,''), coalesce(r.store_name,'')) desc
   limit 1;

  return m;
end $$;

-- ── Pair two rows together (mutual link) ──────────────────────────────────
create or replace function public.reconcile_pair(p_a uuid, p_b uuid)
returns void
language plpgsql security definer
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;

  -- Verify both rows belong to caller before linking
  perform 1 from public.receipts where id = p_a and user_id = uid;
  if not found then raise exception 'receipt % not found', p_a; end if;
  perform 1 from public.receipts where id = p_b and user_id = uid;
  if not found then raise exception 'receipt % not found', p_b; end if;

  update public.receipts set reconciled = true, reconciled_with = p_b, reconciled_at = now() where id = p_a;
  update public.receipts set reconciled = true, reconciled_with = p_a, reconciled_at = now() where id = p_b;
end $$;

-- ── Unlink ────────────────────────────────────────────────────────────────
create or replace function public.unreconcile(p_id uuid)
returns void
language plpgsql security definer
as $$
declare
  uid uuid := auth.uid();
  partner uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select reconciled_with into partner from public.receipts where id = p_id and user_id = uid;
  update public.receipts set reconciled = false, reconciled_with = null, reconciled_at = null
   where id = p_id and user_id = uid;
  if partner is not null then
    update public.receipts set reconciled = false, reconciled_with = null, reconciled_at = null
     where id = partner and user_id = uid;
  end if;
end $$;

-- ── Sweep one statement batch ─────────────────────────────────────────────
create or replace function public.reconcile_statement_batch(p_import_id uuid)
returns int
language plpgsql security definer
as $$
declare
  uid    uuid := auth.uid();
  paired int := 0;
  r      record;
  partner uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  for r in
    select id from public.receipts
     where user_id = uid
       and statement_import_id = p_import_id
       and from_statement = true
       and reconciled = false
  loop
    partner := public.find_reconcile_match(r.id);
    if partner is not null then
      perform public.reconcile_pair(r.id, partner);
      paired := paired + 1;
    end if;
  end loop;

  return paired;
end $$;

-- ── Sweep ALL unreconciled rows for the user ──────────────────────────────
create or replace function public.reconcile_all()
returns int
language plpgsql security definer
as $$
declare
  uid    uuid := auth.uid();
  paired int := 0;
  r      record;
  partner uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  -- Iterate statement-side rows; the matcher will pair to real receipts.
  for r in
    select id from public.receipts
     where user_id = uid
       and from_statement = true
       and reconciled = false
     order by date desc
  loop
    partner := public.find_reconcile_match(r.id);
    if partner is not null then
      perform public.reconcile_pair(r.id, partner);
      paired := paired + 1;
    end if;
  end loop;

  return paired;
end $$;

revoke all on function public.find_reconcile_match(uuid) from public;
revoke all on function public.reconcile_pair(uuid, uuid)  from public;
revoke all on function public.unreconcile(uuid)           from public;
revoke all on function public.reconcile_statement_batch(uuid) from public;
revoke all on function public.reconcile_all()             from public;

grant execute on function public.find_reconcile_match(uuid)        to authenticated;
grant execute on function public.reconcile_pair(uuid, uuid)        to authenticated;
grant execute on function public.unreconcile(uuid)                 to authenticated;
grant execute on function public.reconcile_statement_batch(uuid)   to authenticated;
grant execute on function public.reconcile_all()                   to authenticated;

notify pgrst, 'reload schema';
