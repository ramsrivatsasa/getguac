-- ---------------------------------------------------------------------------
-- migration_086_receipts_source_backfill.sql
--
-- Backfill receipts.source for the rows that can be derived WITH CERTAINTY.
--
-- migration_069 added the column and defined the taxonomy
-- (image / pdf / email / manual / statement), and lib/save-receipt.js has
-- always accepted opts.source — but only /api/receipts/from-pdf ever passed
-- it. Measured 2026-08-03: source was NULL on 273 of 347 rows.
--
-- WHY IT MATTERED: without this column, receipts and statements cannot be told
-- apart when measuring extraction quality. "230 of 347 receipts have zero line
-- items" reads as a catastrophic parser failure, but statement imports and
-- manual entries have no line items BY DESIGN. Split by source, the real
-- figure is 84 of 201 actual scans. A genuine extraction bug was
-- indistinguishable from correct behaviour.
--
-- 🔴 THIS BACKFILL IS DELIBERATELY INCOMPLETE.
-- Only two groups can be identified from the data that exists:
--   * from_statement = true            -> unambiguously 'statement'
--   * validation_comment LIKE 'From email:%'  -> the stub row that
--     lib/email-to-receipt.js writes, and nothing else produces that prefix
--
-- Everything else — phone camera vs screenshot vs drag-drop vs typed-in — left
-- NULL. Those rows have no distinguishing column, and guessing 'image' would
-- put a fabricated value into the exact metric this migration exists to make
-- trustworthy. A NULL says "we did not record this"; a wrong label lies.
-- Rows created from this deploy onward are tagged at write time by all four
-- writers, so the NULL block is a fixed historical set that will not grow.
-- ---------------------------------------------------------------------------

update public.receipts
   set source = 'statement'
 where source is null
   and from_statement = true;

update public.receipts
   set source = 'email'
 where source is null
   and validation_comment like 'From email:%';

comment on column public.receipts.source is
  'Capture modality: image | pdf | email | manual | statement (migration_069). Set by all four writers since 2026-08-03. NULL only on pre-backfill rows whose modality was never recorded and cannot be derived — never infer a value for them.';
