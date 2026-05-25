-- ============================================================================
-- GetGuac Migration 018 — Returns/refunds flag on receipts
-- ============================================================================
-- The receipt parser, the receipts list page, the detail page, and the
-- "Worth It" / guaconomics roll-ups all read `is_return` from the receipts
-- table, but no prior migration ever added the column. PostgREST rejects
-- the entire SELECT when the column is missing, which silently empties
-- those pages while the narrower dashboard query (which doesn't ask for
-- `is_return`) keeps working.
--
-- Safe to re-run.
-- ============================================================================

alter table public.receipts
  add column if not exists is_return boolean not null default false;

-- Cheap to maintain index — refund-related queries always filter user_id
-- first, so this only kicks in for return-heavy users.
create index if not exists idx_receipts_user_is_return
  on public.receipts(user_id) where is_return = true;

notify pgrst, 'reload schema';
