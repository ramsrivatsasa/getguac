-- ============================================================================
-- GetGuac Migration 042 — extra page URLs for multi-page receipts
-- ============================================================================
-- Long receipts captured via the mobile Camera (long receipt) flow or the
-- ML Kit Document Scanner produce multiple page images. Before this
-- migration, only the FIRST page was persisted in receipts.receipt_link
-- — the other pages went to Gemini for OCR and were never stored, so
-- tapping View on a multi-page receipt showed only the first frame.
--
-- text[] is the right shape here: every receipt has 0..N extra pages,
-- order matters (page 2 should display before page 3), and we don't need
-- per-page metadata. Indexed access from SQL/REST/mobile is simple.
--
-- Safe to re-run.
-- ============================================================================

alter table public.receipts
  add column if not exists extra_page_urls text[] not null default '{}';

notify pgrst, 'reload schema';
