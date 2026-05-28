# Mobile ↔ Web Feature Parity Report
*Generated 2026-05-27 at v0.2.65 (commit `95ec193`)*

This file is **read-only documentation**. Fixes proposed below are described — only Fix 1 and Fix 2 have been applied to your working tree (no commits / pushes yet). All other items wait for your call.

---

## 1. Page / screen inventory

### Web has, mobile doesn't

| Web page | What it does | Should mobile have it? |
|---|---|---|
| `/admin` | Admin-only (cron triggers, user lookups) | No — desktop tool |
| `/bank` | Bank statement upload + reconcile | Maybe — Vimeo-tier feature |
| `/bites` | Restaurant dish ratings (👍/👎 + reorder) | **Yes** — heavily used surface |
| `/guacanomics` | Spending analytics | Already covered by mobile's `guacscore` (close enough) |
| `/items/[id]` | Item detail + cross-receipt history | **Yes** — taps from receipts → detail |
| `/predictions` | product_aliases admin (confirm/reject auto-merges) | Maybe — power-user feature |
| `/reports` | Period donut + category drill-down | **Yes** — dashboard companion |
| `/returns` | "What's still returnable" list | **Yes** — explicit value-prop |
| `/statements` | Bank statement archive | Lower priority |
| `/stores` + `/stores/[id]` | Per-store spend rollup | **Yes** — useful drill-down |
| `/validate` | Bulk validation tool | No — power user only |

### Mobile has, web doesn't

| Mobile screen | What it does | Web equivalent |
|---|---|---|
| `auth/app_lock_screen` | Biometric app re-lock | Web doesn't need (browser session) |
| `profile/report_problem_screen` | Bug-report submission | Web has nothing here |
| `guacscore_screen` | Spending score | Web has `/guacanomics` (similar) |

**Net gap:** Mobile is missing 6 visible features: Bites, Items detail, Reports, Returns, Stores list/detail. Building these is feature work, not in scope for a parity fix.

---

## 2. Logic divergence audit

### 🔴 Bug: dual normalizers on mobile (FIXED below)

Mobile has TWO different `normalizeStoreName` implementations:

| File | Function | Behavior |
|---|---|---|
| `mobile/lib/store_name_normalize.dart` | public `normalizeStoreName` | Mirrors web — keeps spaces, TLD/entity stripping, "the" stripping, alias-map-compatible |
| `mobile/lib/providers/receipt_provider.dart` | private `_normalizeStoreName` | Strips ALL non-alphanumeric, suffix-strips a DIFFERENT set (restaurant/grill/cafe/inc/llc/corp/co), **no TLD or "the" stripping** |

The dedup `_findExistingReceiptId` uses the PRIVATE aggressive one. Web's `findExistingReceipt` uses the SHARED normalizer + an extra alphanumeric strip (added in commit `354cd17`).

**Real-world divergence:**
- "AMAZON.COM, INC" → web: `amazon`, mobile-private: `amazoncominc`
- "The Home Depot" → web: `homedepot`, mobile-private: `thehomedepot`
- "Lowe's" → both: `lowes` ✓ (accidentally agree)

Mobile would fail to dedup "AMAZON.COM" against "Amazon" receipts. Web catches them as the same store.

**Fix 1 — applied to working tree (not pushed):** mobile's `_findExistingReceiptId` now calls the shared `normalizeStoreName` from `mobile/lib/store_name_normalize.dart` and then strip non-alphanumeric for the dedup key, mirroring web's behavior exactly.

---

### 🔴 Bug: Tier 2 learning bypasses mobile inserts (FIXED below)

Web's `useReceipts.useAddReceipt` mutation calls the `infer_user_store_category` RPC before each new-receipt insert — applying your per-store category preferences. Mobile's `addParsedReceipt` doesn't.

**Effect:** Once you correct 3 IONOS receipts to `cloud` on the web, the 4th uploaded via web auto-uses cloud. The 4th uploaded via mobile uses whatever Gemini returned (likely `tech`).

**Fix 2 — applied to working tree (not pushed):** mobile's `addParsedReceipt` calls the same RPC after store resolution and overrides `parsed['category']` if the RPC returns a slug.

---

### 🟡 Same logic, different defaults

| Behavior | Web | Mobile |
|---|---|---|
| Receipts list default period | All (no period filter on /receipts; clientside searches) | 1 month, cap 100 (after v0.2.64) |
| Dashboard initial fetch | `.limit(5000)` (post v0.2.65) | `ReceiptPeriod.all` cap 2000 (post v0.2.64) |
| Dashboard date filter | YYYY-MM-DD string compare (post v0.2.65) | YYYY-MM-DD string compare (post v0.2.65) |
| Reorder default bucket from Bites | n/a — Bites is web-only | n/a |
| Predict cron | Daily server cron | n/a (server only) |

Defaults differ but are intentional. Both should produce identical totals for the same period selection after v0.2.65.

---

### 🟡 Mobile lacks server-side helpers

| Web feature | Mobile equivalent | Impact |
|---|---|---|
| `lib/non-returnable.js` (item-level Return UI hiding) | None | Mobile Return UI doesn't exist anyway — no impact yet |
| `lib/auto-categorize.js` (keyword fallback when Gemini returns null) | None | Mobile calls `/api/parse-receipt` which runs the rules server-side, so already covered |
| `lib/perishable.js` (mark fresh produce non-returnable) | None | Same — server-side via parse, already covered |
| `lib/findExistingReceipt.js` | `_findExistingReceiptId` (now aligned via Fix 1) | After Fix 1, matched |

---

### 🟡 Mobile direct-insert skips server-side resolution

Web's email/manual path goes through `lib/email-to-receipt.js#resolveStoreAndLocation` which find-or-creates `stores` + `store_locations` rows.

Mobile's `addParsedReceipt` writes directly to `receipts` with `store_id = NULL`. The `stores` table never gets a row for mobile-only-captured merchants → `/stores` list misses them.

**Workarounds in place:**
- `setStashProductCategory` falls back to `store_name` match when `store_id` is null (fix in commit `6ededc5`).

**Real fix needed:** port `resolveStoreAndLocation` to Dart OR add a server-side `/api/receipts/[id]/resolve-store` endpoint mobile calls after insert. Not done in this audit — separate feature work.

---

## 3. Constants that could drift (kept in sync today)

Both platforms hardcode several thresholds. Future code reviews should check both files when changing any:

| Constant | Web | Mobile | In sync? |
|---|---|---|---|
| Category list | `web/src/lib/categories.js` (25 slugs) | `mobile/lib/categories.dart` (25 slugs) | ✓ as of 2026-05-27 |
| Category sub-tags | `SUB_TAGS_BY_CATEGORY` in categories.js | None on mobile | Web-only feature |
| Normalize store name | `lib/store-name-normalize.js` | `mobile/lib/store_name_normalize.dart` | ✓ port-by-port |
| Predict thresholds (CADENCE_TRIGGER, MIN_PRIORS, MERGE_THRESHOLD) | `lib/predict-smashlist.js` (web-only) | n/a | Web-only |
| Receipt period defaults | `useReceipts` hook | `ReceiptProvider` defaults | Different on purpose |
| Multi-page batch cap (`_kMaxBatchSize`) | n/a (web allows up to limit) | `dashboard_screen.dart` | n/a |

---

## 4. Data fetch architecture diff

| | Web | Mobile |
|---|---|---|
| Read patterns | TanStack Query hooks → Supabase JS client (RLS via session) | Provider classes → Supabase Flutter client (RLS via session) |
| Write patterns | Mostly through `/api/*` routes (centralizes logic) | Direct from provider → Supabase (logic in client) |
| Caching | TanStack Query (5-min stale by default) | Manual in-provider cache (60-second TTL) |
| Auth | Server middleware + RSC | Provider on app start, route guards via go_router |
| Real-time | None active | None active |

**Implication:** when business logic changes (dedup rules, normalization, category routing), web fixes route through API → easy. Mobile fixes must be reshipped in the APK. Server-side endpoints would close this gap; the assessment in `CODE_ASSESSMENT_v0_2_63.md` calls this out as a Tier 3 path.

---

## 5. Risk hotspots (prone to future drift)

| Risk | Why |
|---|---|
| Adding a new spending category | Must edit BOTH `categories.js` and `categories.dart`. Auto-categorize rules in `auto-categorize.js` only affect web manual path; mobile relies on Gemini SYSTEM_PROMPT. |
| Tightening dedup thresholds | Web `findExistingReceipt.js` (±1¢) vs mobile `_findExistingReceiptId` (post Fix 1) must change together |
| New columns on `receipts` | `_kReceiptListCols` (mobile) + `RECEIPTS_LIST_COLS` (web) + `RECEIPT_COLUMNS` (web upsert allowlist) all need updating. Already happened with `category_source` (v0.2.59) and `extra_page_urls` (v0.2.63). |
| New non-returnable category | Web `non-returnable.js#NON_RETURNABLE_ITEM_CATEGORIES` + receipts/[id] page set. No mobile equivalent — mobile Return UI doesn't exist. |
| Smashlist BUCKET_MAP | Web-only. If mobile ever shows the predictor, the routing logic must be ported or fetched. |

---

## 6. Proposed fixes (applied locally to working tree)

### ✅ Fix 1 — Mobile `_findExistingReceiptId` uses shared normalizer

`mobile/lib/providers/receipt_provider.dart` — switched the dedup key to call the shared `normalizeStoreName` from `store_name_normalize.dart` plus the same alphanumeric strip web uses. Eliminates "Amazon vs AMAZON.COM, INC" miss.

### ✅ Fix 2 — Mobile insert calls Tier 2 RPC

`mobile/lib/providers/receipt_provider.dart#addParsedReceipt` — after dedup check (which itself uses store info), calls `infer_user_store_category` RPC. If the RPC returns a slug, overrides `parsed['category']` and sets `category_source = 'inferred'`. Matches web's `useReceipts` behavior.

### 🟡 Fix 3 — NOT applied: mobile pages for Bites / Reports / Returns / Stores / Items

Substantial feature work. Each is a new Flutter screen, navigation entry, and data adapter. Recommend prioritizing **Bites** and **Stores** first (most user-visible).

### 🟡 Fix 4 — NOT applied: stores-table resolution from mobile

Either port `resolveStoreAndLocation` to Dart or add a server-side resolve endpoint. Without this, `/stores` keeps missing mobile-only merchants.

### 🟡 Fix 5 — NOT applied: remove private `_normalizeStoreName`

After Fix 1, the private `_normalizeStoreName` is unused (was only called by `findDuplicate`, deleted in v0.2.58 + `_findExistingReceiptId` which Fix 1 redirects). Recommend deleting in a follow-up commit.

---

## 7. Summary

- **2 real bugs found and fixed locally** (normalizer divergence, Tier 2 bypass on mobile).
- **6 mobile pages missing** (Bites/Items/Reports/Returns/Stores/Stash detail) — feature work, not parity bug.
- **Architecture diff** is by design — web routes API calls through server, mobile goes direct.
- **No security issues** in the parity audit.

Nothing has been committed or pushed. Run `git diff mobile/lib/providers/receipt_provider.dart` to review Fix 1 + Fix 2 before deciding to push.
