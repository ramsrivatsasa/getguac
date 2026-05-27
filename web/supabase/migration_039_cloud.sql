-- ============================================================================
-- GetGuac Migration 039 — Add 'cloud' category, backfill from tech/misc/subs
-- ============================================================================
-- New 'cloud' category covers web hosting, domain registrations, SSL/CDN,
-- cloud infrastructure (AWS/GCP/Azure), VPS, and email hosting.
-- Previously these landed in 'tech' (wrong — tech is physical electronics)
-- or 'subs' (close, but conflates with Netflix/Spotify consumer subs)
-- or 'misc' (when Gemini couldn't tell).
--
-- This migration moves rows where the store name OR the item name
-- unambiguously indicates a cloud/web-infrastructure service. Receipts
-- with mixed lines (e.g. a SaaS bundle that ALSO has hardware) are left
-- alone — the user can re-categorize manually via the per-row chip on
-- /receipts.
--
-- Safe to re-run — idempotent. Only matches rows still on the old slugs.
-- ============================================================================

-- ── receipts.category (by store name) ──────────────────────────────────────
-- Match the known service merchants explicitly. ILIKE so case variants
-- (IONOS Inc., ionos inc, IONOS.com) all hit.
update public.receipts
   set category = 'cloud'
 where category in ('tech', 'misc', 'subs')
   and (
        store_name ilike 'ionos%'      or store_name ilike 'godaddy%'
     or store_name ilike 'namecheap%'  or store_name ilike 'hostinger%'
     or store_name ilike 'bluehost%'   or store_name ilike 'siteground%'
     or store_name ilike 'dreamhost%'  or store_name ilike 'name.com%'
     or store_name ilike 'cloudflare%' or store_name ilike 'vercel%'
     or store_name ilike 'netlify%'    or store_name ilike 'digitalocean%'
     or store_name ilike 'linode%'
     or store_name ilike 'aws%'        or store_name ilike '%amazon web services%'
     or store_name ilike 'google cloud%' or store_name ilike 'gcp%'
     or store_name ilike 'microsoft azure%' or store_name ilike 'azure%'
   );

-- ── receipts.category (by item name) ──────────────────────────────────────
-- Catch receipts where the store name is generic but a child item is
-- clearly a cloud line ("Domain renewal", "Hosting plan", ".com renewal").
update public.receipts r
   set category = 'cloud'
 where r.category in ('tech', 'misc', 'subs')
   and exists (
     select 1 from public.receipt_items ri
      where ri.receipt_id = r.id
        and (
             ri.item_name ilike '%domain renewal%'
          or ri.item_name ilike '%domain registration%'
          or ri.item_name ilike '%domain fee%'
          or ri.item_name ilike '%hosting plan%'
          or ri.item_name ilike '%web hosting%'
          or ri.item_name ilike '%shared hosting%'
          or ri.item_name ilike '%vps%'
          or ri.item_name ilike '%ssl certificate%'
          or ri.item_name ilike '%.com renewal%'
          or ri.item_name ilike '%.net renewal%'
          or ri.item_name ilike '%.org renewal%'
          or ri.item_name ilike '%.io renewal%'
          or ri.item_name ilike '%cloud storage%'
          or ri.item_name ilike '%cloud compute%'
          or ri.item_name ilike '%email hosting%'
        )
   );

-- ── receipt_items.category — mirror so item-level views agree ─────────────
update public.receipt_items
   set category = 'cloud'
 where (category in ('tech', 'misc', 'subs') or category is null)
   and (
        item_name ilike '%domain renewal%'
     or item_name ilike '%domain registration%'
     or item_name ilike '%domain fee%'
     or item_name ilike '%hosting plan%'
     or item_name ilike '%web hosting%'
     or item_name ilike '%shared hosting%'
     or item_name ilike '%vps%'
     or item_name ilike '%ssl certificate%'
     or item_name ilike '%.com renewal%'
     or item_name ilike '%.net renewal%'
     or item_name ilike '%.org renewal%'
     or item_name ilike '%.io renewal%'
     or item_name ilike '%cloud storage%'
     or item_name ilike '%cloud compute%'
     or item_name ilike '%email hosting%'
   );

-- Items on receipts already moved to 'cloud' get the same slug for
-- consistency, even if their own item name was generic ("Your purchase
-- at IONOS Inc.").
update public.receipt_items
   set category = 'cloud'
 where (category in ('tech', 'misc', 'subs') or category is null)
   and receipt_id in (select id from public.receipts where category = 'cloud');

notify pgrst, 'reload schema';
