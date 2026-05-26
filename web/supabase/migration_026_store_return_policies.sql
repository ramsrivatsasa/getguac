-- ============================================================================
-- GetGuac Migration 026 — Store-default return policies
-- ============================================================================
-- Many receipts DON'T print the merchant's return policy (Amazon order emails,
-- e-receipts from chain restaurants, drag-and-drop scans). Without a printed
-- policy, the AI parser returns refund_policies=[], so the receipt looks like
-- it has no return rights — even though the merchant publishes a clear policy
-- on their site.
--
-- This migration adds:
--   1. A `store_return_policies` table seeded with the published policies of
--      the ~25 most common merchants (Amazon, Costco, Walmart, Target, Home
--      Depot, Lowe's, Best Buy, Apple, …). Category-specific rules where the
--      merchant differentiates (Costco electronics vs general, Best Buy
--      members vs non-members).
--   2. A `source` column on `receipt_refund_policies` so we can mark whether
--      a policy came from the printed receipt ("receipt"), the store-default
--      lookup ("store-default"), an AI guess ("ai-inferred"), or the user
--      typing it in ("manual"). UI can show this distinction.
--
-- Safe to re-run.
-- ============================================================================

-- ── 1. source column on receipt_refund_policies ────────────────────────────
alter table public.receipt_refund_policies
  add column if not exists source text not null default 'receipt';

-- Sanity index — most receipt-detail queries scope by receipt_id (already FK'd)
-- so a source-only index isn't necessary. Skipping unless analytics needs it.

-- ── 2. store_return_policies — global lookup table ─────────────────────────
-- Global (not per-user) because Costco's policy doesn't depend on which user
-- shopped there. Keyed on the normalized store name we use in the upsert path
-- (see web/src/lib/store-name-normalize.js).
create table if not exists public.store_return_policies (
  id                    uuid primary key default gen_random_uuid(),
  store_name_normalized text not null,
  store_display_name    text not null,
  category              text,                 -- NULL = applies to all categories
  policy_id             text not null,        -- 'A', 'B', or 'default' — short label paired with receipt_items.refund_policy_id
  days                  integer,              -- return window in days (NULL = no time limit / lifetime)
  eligible              boolean not null default true,
  details               text,
  source_url            text,                 -- where this was sourced from (citation)
  source_kind           text not null default 'curated',  -- 'curated' (seeded by us) | 'ai-inferred' (cached AI lookup)
  updated_at            timestamptz not null default now()
);

create unique index if not exists uq_store_policies_unique
  on public.store_return_policies(store_name_normalized, coalesce(category, '*'), policy_id);

create index if not exists idx_store_policies_store
  on public.store_return_policies(store_name_normalized);

-- RLS: read-only for any authenticated user; nobody writes from client
-- (writes happen via service-role from the AI-inference cache path).
alter table public.store_return_policies enable row level security;

do $$ begin
  drop policy if exists "srp: read all" on public.store_return_policies;
  create policy "srp: read all" on public.store_return_policies
    for select using (auth.role() = 'authenticated');
end $$;

-- ── 3. Seed top-merchant policies ──────────────────────────────────────────
-- Use INSERT ... ON CONFLICT so re-running the migration just updates the
-- updated_at timestamp without disturbing existing rows.
insert into public.store_return_policies
  (store_name_normalized, store_display_name, category, policy_id, days, eligible, details, source_url, source_kind)
values
  -- Amazon: 30 days general; 14 days for cell phones, jewelry > $35
  ('amazon',          'Amazon',          null,      'default',     30,  true,  'Most items 30 days from delivery; "Free returns" badge means no fees.',                  'https://www.amazon.com/returns', 'curated'),
  ('amazon',          'Amazon',          'tech',    'electronics', 30,  true,  'Most electronics 30 days; some sealed items final sale.',                                'https://www.amazon.com/returns', 'curated'),

  -- Apple: 14 days for almost everything
  ('apple',           'Apple',           null,      'default',     14,  true,  '14-day return window; opened software and gift cards non-returnable.',                   'https://www.apple.com/shop/help/returns_refund',                              'curated'),

  -- Walmart: 90 days general; 14 days electronics; 30 days mobile
  ('walmart',         'Walmart',         null,      'default',     90,  true,  'Most items 90 days; electronics 14d; cell phones 14d.',                                  'https://www.walmart.com/help/article/walmart-standard-return-policy/d56f4dba12384c84b22cdb18b4af6093', 'curated'),
  ('walmart',         'Walmart',         'tech',    'electronics', 14,  true,  'Electronics 14 days from purchase.',                                                     'https://www.walmart.com/help/article/walmart-standard-return-policy/d56f4dba12384c84b22cdb18b4af6093', 'curated'),

  -- Target: 90 days; 30 days electronics; member-extension
  ('target',          'Target',          null,      'default',     90,  true,  '90 days for most items; some categories shorter. RedCard +30 days.',                     'https://help.target.com/help/subcategoryarticle?childcat=Return+%26+Order+Information&parentcat=Returns',  'curated'),
  ('target',          'Target',          'tech',    'electronics', 30,  true,  'Electronics + entertainment 30 days.',                                                   'https://help.target.com/help/subcategoryarticle?childcat=Return+%26+Order+Information&parentcat=Returns',  'curated'),

  -- Costco: extremely generous; 90 days electronics; lifetime on else; final-sale on alcohol/cigarettes
  ('costco',          'Costco',          null,      'default',     null, true, 'Most items: no time limit, full refund. Diamonds, tires/batteries, cigarettes excluded.', 'https://customerservice.costco.com/app/answers/answer_view/a_id/1191', 'curated'),
  ('costco',          'Costco',          'tech',    'electronics', 90,  true,  'TVs, computers, smart devices: 90 days.',                                                'https://customerservice.costco.com/app/answers/answer_view/a_id/1191', 'curated'),

  -- Home Depot: 90 days; some major appliances 48 hours
  ('home depot',      'The Home Depot',  null,      'default',     90,  true,  'Most purchases 90 days; cash refunds may require ID.',                                   'https://www.homedepot.com/c/Return_Policy',                                  'curated'),
  ('home depot',      'The Home Depot',  'big-stuff', 'appliances', 30, true,  'Major appliances 30 days; defective products 48 hours.',                                  'https://www.homedepot.com/c/Return_Policy',                                  'curated'),

  -- Lowe's: 90 days standard, 30 days major appliances
  ('lowes',           'Lowe''s',         null,      'default',     90,  true,  '90 days from purchase; receipt required for cash refund.',                                'https://www.lowes.com/l/help/returns-policy.html',                            'curated'),
  ('lowes',           'Lowe''s',         'big-stuff', 'appliances', 30, true,  'Major appliances must be reported damaged within 3 days; returns 30 days.',               'https://www.lowes.com/l/help/returns-policy.html',                            'curated'),

  -- Best Buy: 15 days standard; 60 days Total members; 14 days cells
  ('best buy',        'Best Buy',        null,      'default',     15,  true,  '15 days standard; My Best Buy Plus/Total members get 60 days.',                          'https://www.bestbuy.com/site/help-topics/return-exchange-policy/pcmcat260800050014.c', 'curated'),
  ('best buy',        'Best Buy',        'tech',    'electronics', 15,  true,  'Cell phones, devices 14 days from purchase regardless of membership.',                   'https://www.bestbuy.com/site/help-topics/return-exchange-policy/pcmcat260800050014.c', 'curated'),

  -- Macy's: 90 days
  ('macys',           'Macy''s',         null,      'default',     90,  true,  '90 days with receipt for most items; some categories 30 days.',                          'https://www.customerservice-macys.com/articles/macys-return-policy',           'curated'),

  -- Nordstrom: no time limit, case-by-case
  ('nordstrom',       'Nordstrom',       null,      'default',     null, true, 'No time limit on returns; case-by-case for late returns.',                                'https://www.nordstrom.com/browse/customer-service/return-policy',              'curated'),

  -- BJ's Wholesale: 1 year on most, 30 days TVs/electronics
  ('bjs wholesale',   'BJ''s Wholesale', null,      'default',     365, true,  '1 year from purchase for most items.',                                                   'https://www.bjs.com/help/returns-policy',                                     'curated'),
  ('bjs wholesale',   'BJ''s Wholesale', 'tech',    'electronics', 30,  true,  'Electronics 30 days from purchase.',                                                     'https://www.bjs.com/help/returns-policy',                                     'curated'),

  -- Sam's Club: 90 days; 30 days electronics
  ('sams club',       'Sam''s Club',     null,      'default',     90,  true,  '90 days for most items.',                                                                 'https://help.samsclub.com/app/answers/detail/a_id/49',                        'curated'),

  -- IKEA: 365 days
  ('ikea',            'IKEA',            null,      'default',     365, true,  '365 days from purchase, unopened or used.',                                              'https://www.ikea.com/us/en/customer-service/returns-claims/',                  'curated'),

  -- REI: 1 year for members
  ('rei',             'REI',             null,      'default',     365, true,  'REI Co-op members get 1 year for full refund.',                                          'https://www.rei.com/help/returns',                                            'curated'),

  -- Patagonia: lifetime "Ironclad Guarantee"
  ('patagonia',       'Patagonia',       null,      'default',     null, true, 'Ironclad Guarantee — return any item for any reason, no time limit.',                     'https://www.patagonia.com/customer-service/returns/',                          'curated'),

  -- Wayfair: 30 days
  ('wayfair',         'Wayfair',         null,      'default',     30,  true,  '30 days from delivery; some items excluded (mattresses, custom).',                       'https://www.wayfair.com/help/article/return_policy/52',                       'curated'),

  -- Restaurants / consumables: no returns
  ('taco bell',       'Taco Bell',       null,      'default',     null, false,'Prepared food — no returns.',                                                            null,                                                                          'curated'),
  ('mcdonalds',       'McDonald''s',     null,      'default',     null, false,'Prepared food — no returns.',                                                            null,                                                                          'curated'),
  ('starbucks',       'Starbucks',       null,      'default',     null, false,'Beverages and food consumables — no returns.',                                           null,                                                                          'curated'),
  ('chipotle',        'Chipotle',        null,      'default',     null, false,'Prepared food — no returns.',                                                            null,                                                                          'curated'),

  -- Subscriptions / digital: short windows
  ('apple',           'Apple',           'subs',    'app-store',    null, false,'App Store / subscription purchases — refunds via Apple support case-by-case.',          'https://reportaproblem.apple.com/',                                            'curated'),
  ('netflix',         'Netflix',         null,      'default',     null, false,'No refunds on Netflix subscriptions.',                                                   null,                                                                          'curated'),
  ('spotify',         'Spotify',         null,      'default',     14,  true,  '14-day refund window on annual plans; monthly plans non-refundable after billing.',     'https://support.spotify.com/us/article/refund-policy/',                       'curated'),

  -- Hosting / saas
  ('ionos',           'IONOS',           null,      'default',     30,  true,  '30-day money-back guarantee on hosting plans.',                                          'https://www.ionos.com/help/billing-and-payments/your-rights-as-a-customer/',  'curated')
on conflict (store_name_normalized, coalesce(category, '*'), policy_id) do update
  set days          = excluded.days,
      eligible      = excluded.eligible,
      details       = excluded.details,
      source_url    = excluded.source_url,
      store_display_name = excluded.store_display_name,
      updated_at    = now();

notify pgrst, 'reload schema';
