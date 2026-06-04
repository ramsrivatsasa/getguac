-- Guac-AI enrichment backfill: three small additive surfaces that all
-- decorate existing receipts/items without changing core taxonomy.
--
--   1. receipt_items.ai_tag       — small fixed-vocab semantic tag rendered
--                                   as a chip on item rows. Vocabulary lives
--                                   in lib/itemTagVocab.js (kept fixed so the
--                                   chip styling is exhaustive).
--
--   2. anomaly_narratives          — one-sentence plain-language explanation
--                                   for an anomaly row produced by lib/
--                                   spending-anomalies.js. Keyed by the
--                                   anomaly identity tuple so a re-render of
--                                   the panel can fetch the cached blurb
--                                   without re-prompting the AI.
--
-- Nullable + no CHECK on ai_tag so older code paths keep inserting cleanly;
-- the renderer treats unknown values as a passthrough chip.

-- ── receipt_items.ai_tag ─────────────────────────────────────────────────
alter table public.receipt_items
  add column if not exists ai_tag text;

-- Partial index — only rows that DO have an ai_tag participate. Keeps the
-- index tiny on a column most rows leave null forever.
create index if not exists idx_receipt_items_ai_tag
  on public.receipt_items(ai_tag)
  where ai_tag is not null;

-- ── anomaly_narratives cache ─────────────────────────────────────────────
-- Identity tuple = (user_id, kind, storeKey-or-category, period_start_day).
-- period_start_day = current-window-start as a date — anomalies recompute
-- on a rolling 30d window so we want narratives to age out naturally with
-- the underlying data.
create table if not exists public.anomaly_narratives (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  kind            text not null,                       -- 'merchant-spike' | 'category-spike' | 'missing-recurring'
  bucket          text not null,                       -- storeKey OR category slug
  period_start    date not null,                       -- start of the current window
  narrative       text not null,                       -- one-sentence blurb
  created_at      timestamptz not null default now(),
  unique (user_id, kind, bucket, period_start)
);

create index if not exists idx_anomaly_narratives_user
  on public.anomaly_narratives(user_id, created_at desc);

alter table public.anomaly_narratives enable row level security;

drop policy if exists "anomaly_narratives: owner full access" on public.anomaly_narratives;
create policy "anomaly_narratives: owner full access"
  on public.anomaly_narratives
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
