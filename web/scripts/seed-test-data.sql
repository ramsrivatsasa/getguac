-- =============================================================================
-- GetGuac test-data seed — every feature, one SQL block.
-- =============================================================================
-- Paste this into the Supabase SQL editor while signed in as the user you want
-- to populate. Everything keys off auth.uid(), so no IDs to edit.
--
-- What it builds, for the LAST 6 MONTHS of fake history:
--   - Weekly grocery runs (Costco / Walmart / Target rotating) → predictive
--     shopping list will detect cadences + suggest "buy again" items
--   - Bi-weekly + monthly cadences (dish soap, laundry, dog food)
--   - Monthly recurring CHARGES at fixed merchants (Netflix, Spotify,
--     Apple One, gym) → subscription tracker picks these up
--   - One "merchant spike": Target spend in the last 30 days is 4× the avg
--     of the prior 3 windows → anomaly card flag
--   - One "missing recurring": Hulu paid monthly for 5 months then nothing
--     for 50+ days → anomaly card watch
--   - Rated receipts (1-5★) for GuacScore
--   - Bank fees + interest for GuacScore bite penalty
--   - Business + charity receipts for the tax summary
--   - Predicted items pre-populated in shopping_list (predicted=true,
--     approved=false) for the Smashlist suggestion strip
--
-- Markers:
--   - receipts.validation_comment = '[SEED v2 SQL]'
--   - shopping_list.comments      = '[SEED v2 SQL]'
--   - bank_fees.raw_description   = '[SEED v2 SQL] …'
--   - rewards.reward_no LIKE 'SEED-%'
--
-- Idempotent: re-running the script wipes the prior [SEED v2 SQL] data for
-- THIS user before re-inserting. Other users' data is untouched.
-- =============================================================================

do $$
declare
  uid uuid := 'b1485b86-8265-4830-844f-fa4964765c67';
  today date := current_date;
  i int;
  d date;
  rcpt_id uuid;
  -- Store ids so receipts.store_id + shopping_list.store_name_id can
  -- point to real rows; without these the Store column on the Buy
  -- Again strip shows '—' even when the predictor knows the merchant.
  costco_id uuid;
  walmart_id uuid;
  target_id uuid;
begin
  if uid is null then
    raise exception 'auth.uid() is null — sign in via Supabase before running this seed';
  end if;

  -- ─── -1. STORES (find-or-create the three rotating merchants) ──────────
  -- public.stores is shared across users (no user_id column). Use existing
  -- row if one exists with the same display name; otherwise insert.
  select id into costco_id from public.stores where lower(store_name) = lower('Costco Wholesale') limit 1;
  if costco_id is null then
    insert into public.stores (store_name) values ('Costco Wholesale') returning id into costco_id;
  end if;
  select id into walmart_id from public.stores where lower(store_name) = lower('Walmart') limit 1;
  if walmart_id is null then
    insert into public.stores (store_name) values ('Walmart') returning id into walmart_id;
  end if;
  select id into target_id from public.stores where lower(store_name) = lower('Target') limit 1;
  if target_id is null then
    insert into public.stores (store_name) values ('Target') returning id into target_id;
  end if;

  -- ─── 0. WIPE prior seed rows for this user (idempotent re-run) ─────────
  delete from public.shopping_list
   where user_id = uid
     and comments = '[SEED v2 SQL]';

  delete from public.receipts
   where user_id = uid
     and validation_comment = '[SEED v2 SQL]';
  -- receipt_items cascade via FK ON DELETE CASCADE

  delete from public.bank_fees
   where user_id = uid
     and raw_description like '[SEED v2 SQL]%';

  delete from public.rewards
   where user_id = uid
     and reward_no like 'SEED-%';

  -- ─── 1. WEEKLY GROCERY RUNS (24 buys, rotating 3 stores) ───────────────
  -- Each week we generate one receipt at one of the three stores. Items
  -- vary slightly per store so the embedding-merge path has work to do.
  -- The "+6" offset on the most recent buy puts it just over the 0.80×
  -- cadence threshold (6 days vs avg 7) so the predictor surfaces it
  -- as "due now". Without this offset, daysSince=1 fails the gate and
  -- the seed produces zero suggestions.
  for i in 0..23 loop
    d := today - (i * 7 + 6);
    insert into public.receipts (
      user_id, store_name, store_id, date, total_amount, tax_paid,
      category, rating, is_return, business_purchase, validation_comment, processed
    ) values (
      uid,
      case (i % 3)
        when 0 then 'Costco Wholesale'
        when 1 then 'Walmart'
        else        'Target'
      end,
      case (i % 3)
        when 0 then costco_id
        when 1 then walmart_id
        else        target_id
      end,
      d,
      35.00 + (i % 5) * 3.50,                                -- $35–$49
      (35.00 + (i % 5) * 3.50) * 0.082,                      -- ~8.2% tax
      'grub',
      case when i < 4 then 4 else 5 end,                     -- recent rated 4★, older 5★
      false, false,
      '[SEED v2 SQL]',
      true
    )
    returning id into rcpt_id;

    -- Unified item names + purchase_date set to the parent receipt's
    -- date. The predictor (predict-smashlist.js aggregate()) skips any
    -- receipt_item with a null purchase_date — without this column,
    -- 100% of the seed items get filtered out and the Buy Again strip
    -- stays empty regardless of how many items you embed.
    insert into public.receipt_items (receipt_id, item_name, qty, price, category, purchase_date) values
      -- Pantry (category 'grub')
      (rcpt_id, 'MILK',    1, 5.49, 'grub', d),
      (rcpt_id, 'EGGS',    1, 4.99, 'grub', d),
      (rcpt_id, 'BANANAS', 1, 1.29, 'grub', d),
      (rcpt_id, 'BREAD',   1, 3.79, 'grub', d),
      -- Cravings (category 'drinks' → bucket Cravings)
      (rcpt_id, 'COFFEE',  1, 12.99, 'drinks', d),
      -- Snack Stack (category 'snacks' → bucket Snack Stack)
      (rcpt_id, 'CHIPS',   1, 3.99, 'snacks', d);
  end loop;

  -- ─── 2. BI-WEEKLY HOUSEHOLD (12 buys) ──────────────────────────────────
  -- Last buy 12 days ago, cadence 14 → 12 >= 11.2 → predictor surfaces.
  for i in 0..11 loop
    d := today - (i * 14 + 12);
    insert into public.receipts (
      user_id, store_name, store_id, date, total_amount, tax_paid,
      category, rating, validation_comment, processed
    ) values (
      uid, 'Target', target_id, d, 22.50, 22.50 * 0.082,
      'household', 4, '[SEED v2 SQL]', true
    ) returning id into rcpt_id;
    insert into public.receipt_items (receipt_id, item_name, qty, price, category, purchase_date) values
      -- Pantry (household)
      (rcpt_id, 'BOUNTY SELECT-A-SIZE 6 PK', 1, 17.84, 'household', d),
      (rcpt_id, 'DAWN ULTRA ORIGINAL', 1, 4.66, 'household', d),
      -- Cravings (tea)
      (rcpt_id, 'GREEN TEA',     1, 4.49, 'tea', d),
      -- Snack Stack (snacks)
      (rcpt_id, 'GRANOLA BARS',  1, 5.99, 'snacks', d);
  end loop;

  -- ─── 3. MONTHLY RESTOCK (6 buys) ───────────────────────────────────────
  -- Last buy 25 days ago, cadence 30 → 25 >= 24 → predictor surfaces.
  for i in 0..5 loop
    d := today - (i * 30 + 25);
    insert into public.receipts (
      user_id, store_name, store_id, date, total_amount, tax_paid,
      category, rating, validation_comment, processed
    ) values (
      uid, 'Costco Wholesale', costco_id, d, 89.99, 89.99 * 0.082,
      'household', 5, '[SEED v2 SQL]', true
    ) returning id into rcpt_id;
    insert into public.receipt_items (receipt_id, item_name, qty, price, category, purchase_date) values
      -- Pantry
      (rcpt_id, 'TIDE HE LIQUID 170 LOADS', 1, 24.99, 'household', d),
      (rcpt_id, 'KS DAILY MULTI 365CT', 1, 11.99, 'health', d),
      (rcpt_id, 'KS ADULT CHICKEN&RICE 40LB', 1, 39.99, 'pets', d),
      (rcpt_id, 'PAPER TOWELS 12 ROLL', 1, 22.99, 'household', d),
      -- Snack Stack
      (rcpt_id, 'POPCORN MULTIPACK', 1, 8.99, 'snacks', d);
  end loop;

  -- ─── 4. MONTHLY SUBSCRIPTIONS (auto-pay merchants) ─────────────────────
  -- 6 monthly Netflix charges → subscription tracker picks this up cleanly.
  -- One small price bump in the most recent charge to exercise the
  -- priceChanged flag.
  for i in 0..5 loop
    d := today - (i * 30 + 2);
    insert into public.receipts (
      user_id, store_name, date, total_amount, tax_paid,
      category, validation_comment, processed
    ) values (
      uid, 'NETFLIX.COM',
      d,
      case when i = 0 then 17.99 else 15.49 end,             -- recent bump
      0,
      'subscriptions', '[SEED v2 SQL]', true
    );
  end loop;

  for i in 0..5 loop
    d := today - (i * 30 + 5);
    insert into public.receipts (
      user_id, store_name, date, total_amount, tax_paid,
      category, validation_comment, processed
    ) values (
      uid, 'Spotify', d, 10.99, 0,
      'subscriptions', '[SEED v2 SQL]', true
    );
  end loop;

  for i in 0..5 loop
    d := today - (i * 30 + 12);
    insert into public.receipts (
      user_id, store_name, date, total_amount, tax_paid,
      category, validation_comment, processed
    ) values (
      uid, 'Apple.com/Bill', d, 19.95, 0,
      'subscriptions', '[SEED v2 SQL]', true
    );
  end loop;

  -- ─── 5. MISSING-RECURRING: Hulu paid 5× monthly, then silence ──────────
  -- Last charge ~70 days ago → anomaly card "No HULU charge in 70 days".
  for i in 1..5 loop
    d := today - (i * 30 + 70);                              -- 100, 130, ... days ago
    insert into public.receipts (
      user_id, store_name, date, total_amount, tax_paid,
      category, validation_comment, processed
    ) values (
      uid, 'Hulu', d, 12.99, 0, 'subscriptions',
      '[SEED v2 SQL]', true
    );
  end loop;

  -- ─── 6. MERCHANT SPIKE: Target current period 4× usual ─────────────────
  -- One big-ticket Target run in the last 5 days that dwarfs prior Target
  -- visits → anomaly card flag "TARGET is 4.x× your usual".
  insert into public.receipts (
    user_id, store_name, date, total_amount, tax_paid,
    category, rating, validation_comment, processed
  ) values (
    uid, 'Target', today - 3, 285.00, 285.00 * 0.082,
    'household', 3, '[SEED v2 SQL]', true
  );

  -- ─── 7. BUSINESS PURCHASES (tax summary) ───────────────────────────────
  for i in 0..3 loop
    d := today - (i * 22 + 6);
    insert into public.receipts (
      user_id, store_name, date, total_amount, tax_paid,
      category, business_purchase, rating, validation_comment, processed
    ) values (
      uid, 'Office Depot', d, 65.40, 65.40 * 0.082,
      'office', true, 5, '[SEED v2 SQL]', true
    );
  end loop;

  -- ─── 8. CHARITY DONATIONS (tax summary) ────────────────────────────────
  for i in 0..2 loop
    d := today - (i * 45 + 10);
    insert into public.receipts (
      user_id, store_name, date, total_amount, tax_paid,
      category, validation_comment, processed
    ) values (
      uid, 'Goodwill', d, 50.00, 0, 'charity',
      '[SEED v2 SQL]', true
    );
  end loop;

  -- ─── 9. ONE-OFF + QUARTERLY (negative-control for predictions) ─────────
  -- Predictor should NOT surface these as "due now".
  insert into public.receipts (user_id, store_name, date, total_amount, tax_paid, category, validation_comment, processed) values
    (uid, 'Home Depot', today - 20,  14.99, 1.20, 'household', '[SEED v2 SQL]', true),
    (uid, 'Best Buy',   today - 88,  129.99, 10.6, 'tech',     '[SEED v2 SQL]', true),
    (uid, 'Patagonia',  today - 55,  89.00,  7.30, 'apparel',  '[SEED v2 SQL]', true);

  -- ─── 10. BANK FEES + INTEREST (GuacScore bite penalty) ─────────────────
  -- Total ~$120 across the period: $80 interest, $40 fees. The bite
  -- penalty formula weighs interest 2× harder than fees, so this gives a
  -- visible -10 to -15 point hit on the score.
  for i in 0..3 loop
    insert into public.bank_fees (
      user_id, date, kind, fee_kind, merchant, amount, raw_description
    ) values
      (uid, today - (i * 30 + 5), 'interest', 'Purchase interest',
        'AMEX', 20.00, '[SEED v2 SQL] purchase interest'),
      (uid, today - (i * 30 + 9), 'fee',      'Late fee',
        'CHASE', 10.00, '[SEED v2 SQL] late fee');
  end loop;

  -- ─── 11. PREDICTED + CURATED rows in shopping_list ────────────────────
  -- One sample predicted row per Smashlist bucket so every tab has
  -- visible content right after the seed runs (without waiting for the
  -- nightly predictor cron). Grub & Grab in particular has no category
  -- in BUCKET_MAP so the predictor never routes there organically —
  -- pre-populating it here is the only way the tab gets content.
  --
  -- One row per bucket is at ratio >= 1.2 so the ⭐ Restock badge fires;
  -- the rest sit just under the reorder point so they appear as plain
  -- rows. Mix exists so the UI demo shows every tier.
  insert into public.shopping_list (
    user_id, item_name, qty, frequency, list_name, store_name_id,
    predicted, predicted_reason, predicted_avg_cadence_days, predicted_last_purchase_date,
    approved, sent_to_store, comments
  ) values
    -- Pantry — store_name_id points to a real stores row so the
    -- Store column on the Buy Again strip shows a name, not '—'.
    (uid, 'Whole Milk',     1, 'Weekly',   'Pantry', costco_id::text,
      true, 'Avg every 7d, last bought 9d ago',  7,  today - 9,  false, false, '[SEED v2 SQL]'),
    (uid, 'Paper Towels',   1, 'Biweekly', 'Pantry', target_id::text,
      true, 'Avg every 14d, last bought 13d ago', 14, today - 13, false, false, '[SEED v2 SQL]'),
    (uid, 'Dog Food',       1, 'Monthly',  'Pantry', costco_id::text,
      true, 'Avg every 30d, last bought 28d ago', 30, today - 28, false, false, '[SEED v2 SQL]'),
    -- Cravings
    (uid, 'Cold Brew Coffee', 1, 'Weekly',   'Cravings', costco_id::text,
      true, 'Avg every 7d, last bought 6d ago',  7,  today - 6,  false, false, '[SEED v2 SQL]'),
    (uid, 'Sparkling Water 12pk', 1, 'Biweekly', 'Cravings', target_id::text,
      true, 'Avg every 14d, last bought 18d ago', 14, today - 18, false, false, '[SEED v2 SQL]'),
    -- Snack Stack
    (uid, 'Tortilla Chips', 1, 'Weekly',  'Snack Stack', walmart_id::text,
      true, 'Avg every 7d, last bought 8d ago',  7,  today - 8,  false, false, '[SEED v2 SQL]'),
    (uid, 'Trail Mix',      1, 'Biweekly', 'Snack Stack', target_id::text,
      true, 'Avg every 14d, last bought 12d ago', 14, today - 12, false, false, '[SEED v2 SQL]'),
    -- Grub & Grab (no predictor route; pre-populated only)
    (uid, 'Frozen Pizza',   1, 'Biweekly', 'Grub & Grab', walmart_id::text,
      true, 'Avg every 14d, last bought 17d ago', 14, today - 17, false, false, '[SEED v2 SQL]'),
    (uid, 'Ready Meals',    1, 'Weekly',   'Grub & Grab', target_id::text,
      true, 'Avg every 7d, last bought 6d ago',  7,  today - 6,  false, false, '[SEED v2 SQL]');

  -- Curated (non-predicted) rows so each bucket also has something the
  -- user added themselves. Renders in the bucket-list section below
  -- the Buy Again strip when the user clicks the matching tab.
  insert into public.shopping_list (
    user_id, item_name, qty, frequency, list_name,
    predicted, approved, sent_to_store, comments
  ) values
    (uid, 'Coffee Beans',    1, 'Monthly', 'Cravings',     false, false, false, '[SEED v2 SQL]'),
    (uid, 'Cookies',         1, 'Monthly', 'Snack Stack',  false, false, false, '[SEED v2 SQL]'),
    (uid, 'Birthday Card',   1, 'Monthly', 'Grub & Grab',  false, false, false, '[SEED v2 SQL]');

  -- ─── 12. REWARDS rows (so /rewards isn't empty) ────────────────────────
  -- rewards.expiry_date + reward_type + reward_title are NOT NULL on the
  -- table — defaults provided here. Expiry one year out so the rows show
  -- as "active" in the /rewards UI.
  insert into public.rewards (
    user_id, store_name, reward_no, expiry_date, reward_type, reward_title
  ) values
    (uid, 'Costco Wholesale', 'SEED-COSTCO-' || substr(uid::text, 1, 8),
      today + 365, 'loyalty', 'Costco Gold Star'),
    (uid, 'Target',           'SEED-TARGET-' || substr(uid::text, 1, 8),
      today + 365, 'loyalty', 'Target Circle'),
    (uid, 'Walmart',          'SEED-WMART-'  || substr(uid::text, 1, 8),
      today + 365, 'loyalty', 'Walmart+ Member')
  on conflict do nothing;

  raise notice 'Seed complete. Tag: [SEED v2 SQL]. Re-run to refresh; the WIPE step at the top of this script removes prior seed rows for this user.';
end $$;

-- =============================================================================
-- Optional cleanup (only this user's seed)
-- =============================================================================
-- To wipe without re-seeding, run JUST this snippet (uncomment):
--
-- delete from public.shopping_list where user_id = auth.uid() and comments = '[SEED v2 SQL]';
-- delete from public.receipts      where user_id = auth.uid() and validation_comment = '[SEED v2 SQL]';
-- delete from public.bank_fees     where user_id = auth.uid() and raw_description like '[SEED v2 SQL]%';
-- delete from public.rewards       where user_id = auth.uid() and reward_no like 'SEED-%';
