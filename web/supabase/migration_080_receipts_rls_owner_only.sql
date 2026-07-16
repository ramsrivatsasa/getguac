-- ============================================================================
-- GetGuac Migration 080 — SECURITY FIX: receipts are strictly owner-only
-- ============================================================================
-- ROOT CAUSE of "I see someone else's receipts / subscriptions I don't have":
--
--   The receipt-family RLS policies granted access with
--       USING ( auth.uid() = user_id
--               OR EXISTS (SELECT 1 FROM profiles
--                          WHERE id = auth.uid() AND is_admin = true) )
--
--   i.e. ANY account flagged profiles.is_admin = true could read (and, because
--   the policy was FOR ALL, also UPDATE/DELETE) EVERY user's receipts through
--   the ordinary authenticated client. When an admin signed in on web or the
--   mobile app, the Receipts screen (`from('receipts').select()`, RLS-scoped,
--   no explicit user filter) returned the ENTIRE table, so other households'
--   receipts, e-mailed bills, anomalies and subscriptions all merged into the
--   admin's dashboard.
--
-- FIX: remove the is_admin bypass. Receipts, their items, their refund policies
--   and rewards are visible ONLY to the row owner. Legitimate cross-user admin
--   analytics must run through the SERVICE ROLE (which bypasses RLS server-side
--   and is never exposed to the client) — not through an is_admin RLS carve-out.
--
-- No data moves. Every receipt keeps its original owner; this only stops the
-- admin session from *seeing* rows it never owned. Idempotent / safe to re-run.
-- ============================================================================

-- ── receipts ────────────────────────────────────────────────────────────────
alter table public.receipts enable row level security;
drop policy if exists "receipts: own rows" on public.receipts;
create policy "receipts: own rows" on public.receipts
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── receipt_items (scoped through the parent receipt) ────────────────────────
alter table public.receipt_items enable row level security;
drop policy if exists "receipt_items: own receipts" on public.receipt_items;
create policy "receipt_items: own receipts" on public.receipt_items
  for all
  using (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_id and r.user_id = auth.uid()
    )
  );

-- ── receipt_refund_policies (scoped through the parent receipt) ──────────────
alter table public.receipt_refund_policies enable row level security;
drop policy if exists "refund_policies: own receipts" on public.receipt_refund_policies;
create policy "refund_policies: own receipts" on public.receipt_refund_policies
  for all
  using (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_id and r.user_id = auth.uid()
    )
  );

-- ── rewards (same latent is_admin bypass — an admin could read all rewards) ──
alter table public.rewards enable row level security;
drop policy if exists "rewards: own rows" on public.rewards;
create policy "rewards: own rows" on public.rewards
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
