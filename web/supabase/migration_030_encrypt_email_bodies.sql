-- GetGuac Migration 030 — Application-layer encryption of email bodies
--
-- Reduces the blast radius of any Supabase compromise. Sensitive email
-- content is now encrypted with AES-256-GCM (lib/crypto.js) BEFORE landing
-- in the row, using a key that lives only in the Vercel env
-- (EMAIL_ENCRYPTION_KEY — the same key we already use for mailbox passwords).
--
-- A leaked database alone reveals only ciphertext. Decryption requires
-- BOTH the DB and the key, which never sit in the same place at rest.
--
-- Schema:
--   subject_enc      text   AES-GCM-encrypted subject ("<iv>:<ct>:<tag>")
--   preview_enc      text   Encrypted preview (~200 chars of body)
--   body_text_enc    text   Encrypted text/plain body
--   body_html_enc    text   Encrypted text/html body
--   body_enc_v       int    Key version, defaults to 1. Future rotations
--                            bump this so the decryptor knows which key
--                            tried first.
--
-- The original plaintext columns (subject, preview, body_text, body_html)
-- are KEPT during the transition for two reasons:
--   1. Backwards compatibility — existing rows are still readable while a
--      background backfill script encrypts them.
--   2. Some indexes / RLS predicates (none today, but defensively) might
--      depend on plaintext access.
-- A follow-up migration (031) will null out the plaintext columns once
-- backfill is complete and verified.
--
-- Safe to re-run.

alter table public.email_messages
  add column if not exists subject_enc    text,
  add column if not exists preview_enc    text,
  add column if not exists body_text_enc  text,
  add column if not exists body_html_enc  text,
  add column if not exists body_enc_v     smallint not null default 1;

comment on column public.email_messages.subject_enc is
  'AES-256-GCM ciphertext of subject. Encrypted with EMAIL_ENCRYPTION_KEY at the app layer (lib/crypto.js encryptSecret). Format: <iv-b64>:<ct-b64>:<tag-b64>.';
comment on column public.email_messages.preview_enc is
  'AES-256-GCM ciphertext of preview (first ~200 chars of body_text). Same format as subject_enc.';
comment on column public.email_messages.body_text_enc is
  'AES-256-GCM ciphertext of the text/plain body. Same format as subject_enc.';
comment on column public.email_messages.body_html_enc is
  'AES-256-GCM ciphertext of the text/html body. Same format as subject_enc.';
comment on column public.email_messages.body_enc_v is
  'Encryption key version. Used by a future rotation to know which key to try first when decrypting.';

notify pgrst, 'reload schema';
