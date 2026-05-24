-- ============================================================================
-- GetGuac Migration 014 — pgvector self-learning model
-- ============================================================================
-- Adds the pgvector extension and an `embedding` column on receipt_items so we
-- can do real semantic search: "find items similar to X" without exact name
-- matching. Each item gets a 768-dim vector from Gemini's text-embedding-004
-- model (free tier, called from /api/embeddings/refresh).
--
-- Storage cost: 768 × 4 bytes = ~3 KB per item. 10,000 items = ~30 MB.
-- Safe to re-run.
-- ============================================================================

-- Enable pgvector (Supabase ships it; this enables it for the project)
create extension if not exists vector;

-- Add embedding column. 768 dims matches Gemini's text-embedding-004 output.
alter table public.receipt_items
  add column if not exists embedding vector(768),
  add column if not exists embedding_text text,        -- canonical text we embedded (for re-embed detection)
  add column if not exists embedded_at timestamptz;

-- IVFFlat index for fast approximate nearest-neighbor search.
-- `lists` should be ~sqrt(rows) — start with 100, retune later if needed.
create index if not exists idx_receipt_items_embedding
  on public.receipt_items using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Track which items still need embedding (NULL embedding or stale text)
create index if not exists idx_receipt_items_needs_embedding
  on public.receipt_items(id) where embedding is null and item_name is not null;

-- RPC for semantic similarity search. Returns receipt_items rows ordered by
-- cosine distance to the query embedding. RLS still applies via the join to receipts.
create or replace function public.match_items(
  query_embedding vector(768),
  match_count int default 10,
  similarity_threshold float default 0.3
)
returns table (
  id          uuid,
  item_name   text,
  sku         text,
  price       numeric,
  category    text,
  receipt_id  uuid,
  store_name  text,
  date        date,
  similarity  float
)
language sql security definer
as $$
  select
    ri.id,
    ri.item_name,
    ri.sku,
    ri.price,
    ri.category,
    ri.receipt_id,
    r.store_name,
    r.date,
    1 - (ri.embedding <=> query_embedding) as similarity
  from public.receipt_items ri
  join public.receipts r on r.id = ri.receipt_id
  where ri.embedding is not null
    and r.user_id = auth.uid()
    and 1 - (ri.embedding <=> query_embedding) > similarity_threshold
  order by ri.embedding <=> query_embedding
  limit match_count;
$$;

notify pgrst, 'reload schema';
