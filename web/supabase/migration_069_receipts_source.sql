-- Tag every receipt with the input modality it was captured from.
-- `source` (text, nullable) lives next to from_statement and lets the UI
-- distinguish "I dropped a utility bill PDF" from "I took a phone photo"
-- from "I uploaded a screenshot" without re-deriving the answer from a
-- combination of receipt_link suffix + from_statement + processed.
--
-- Allowed taxonomy (matches lib/save-receipt.js opts.source):
--   'image'   — phone camera, screenshot, drag-drop image (default for older rows is null)
--   'pdf'     — multi-page PDF parsed via /api/receipts/from-pdf (utility bill, invoice, statement receipt)
--   'email'   — IMAP poller / forwarded e-receipt
--   'manual'  — typed into the form, no upload
--   'statement' — bank-statement import (set by parse-statement route; duplicates from_statement boolean but tied into one column)
--
-- Nullable + no CHECK constraint so older code paths (and old rows) keep
-- inserting cleanly. Tighten to a CHECK once every writer is migrated.

alter table public.receipts
  add column if not exists source text;

-- Index on (user_id, source) so "show me my PDF uploads" stays fast even
-- when a user has thousands of receipts. Partial-where keeps it small —
-- the common case (NULL or 'image') never enters the index.
create index if not exists idx_receipts_user_source_pdf
  on public.receipts(user_id, created_at desc)
  where source = 'pdf';
