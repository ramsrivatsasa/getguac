-- ============================================================================
-- GetGuac Migration 045 — prediction_outcomes (predictor telemetry)
-- ============================================================================
-- We've shipped a Smashlist predictor (migration 032 + lib/predict-smashlist.js)
-- without ever measuring its accuracy. This table is the feedback loop:
-- every prediction lands one of three outcomes, and we can compute the
-- model's precision over time.
--
-- Outcomes:
--   purchased  — user bought a matching item within the lookback window.
--                (Match heuristic: same normalized item-name + user, receipt
--                date >= predicted_at, within 30 days.)
--   dismissed  — user explicitly deleted the predicted row from the list.
--                Strong negative signal — "no, I never buy that".
--   ignored    — TTL: prediction has sat unactioned for > 30 days. Weaker
--                negative signal than dismissed (user may have just
--                bought it offline / forgotten / not opened the app).
--   superseded — a newer prediction for the same item replaced this one
--                (user dismissed it, model re-fired later). Neutral.
--
-- One row per (shopping_list row that was predicted). FK cascades when the
-- source list row is deleted so we don't accumulate phantom outcomes.
-- ============================================================================

create table if not exists public.prediction_outcomes (
  -- No FK on shopping_list_id: the source row often gets DELETEd as
  -- part of the dismiss flow (and we want the outcome row to outlive
  -- the source). user_id stays FK so RLS works + auth-cascade
  -- delete cleans up alongside the user.
  shopping_list_id  uuid         primary key,
  user_id           uuid         not null    references auth.users(id) on delete cascade,
  outcome           text         not null
                    check (outcome in ('purchased','dismissed','ignored','superseded')),
  outcome_at        timestamptz  not null default now(),
  -- When outcome='purchased', the receipt + item that matched. Null
  -- for dismissed / ignored / superseded. No FK — analytics rows
  -- should survive even if the source receipt is later purged.
  receipt_id        uuid,
  receipt_item_id   uuid,
  -- Days between prediction insert and outcome — lets us compute
  -- "how early/late are we predicting?" over time.
  days_to_outcome   int,
  -- Item key snapshot at outcome time. Useful for grouping precision
  -- by item identity (eggs vs supplements) without re-joining
  -- shopping_list (which may have been deleted).
  item_key          text,
  created_at        timestamptz  not null default now()
);

create index if not exists idx_prediction_outcomes_user_outcome
  on public.prediction_outcomes(user_id, outcome);

create index if not exists idx_prediction_outcomes_at
  on public.prediction_outcomes(outcome_at desc);

alter table public.prediction_outcomes enable row level security;

drop policy if exists "prediction_outcomes: own rows" on public.prediction_outcomes;
create policy "prediction_outcomes: own rows"
  on public.prediction_outcomes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
