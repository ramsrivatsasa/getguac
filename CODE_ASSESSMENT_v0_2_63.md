# GetGuac Code & DB Assessment — v0.2.63
*Generated 2026-05-27 against commit `8a24a18`*

This is a structured review of the codebase, database schema, and AI/self-learning posture, with deletion candidates classified by confidence and risk. **Nothing has been deleted yet except clearly-dead files** (called out at the bottom).

---

## 1. Inventory snapshot

| Surface | Count |
|---|---|
| Migrations | **45** SQL files (001–042 + `schema.sql`, `complete_schema.sql`, `one_shot_link_inbox.sql`) |
| API routes | **40** route handlers |
| Dashboard pages | **24** Next.js pages |
| Components | **14** (+ `ui/` subfolder) |
| Lib modules | **29** |
| Hooks | **6** |
| Database tables | **27** in `public.` namespace |

---

## 2. Dead-code candidates (web)

### 🔴 Confirmed dead — safe to delete

| File | Evidence |
|---|---|
| `src/lib/rewards-balance-extractor.js` | Zero imports across the codebase. Only "references" are its own internal `console.warn` strings. **Deleted in this session.** |

### 🟡 Probably dead — surface only via direct URL, not from frontend code

These routes have ZERO frontend references and aren't in `vercel.json` crons or GitHub Actions workflows. They might be admin utilities you'd call by curl, or genuinely orphaned. Flagging — recommend you confirm before deletion:

| Route | Notes |
|---|---|
| `/api/similar-items` | Zero callers. Built when embeddings shipped but never wired into any UI. The /predictions page doesn't use it. Likely dead. |
| `/api/receipts/normalize-names` | Zero callers. Sounds like a one-time cleanup utility. Check git log for context before deleting. |
| `/api/receipts/reparse-images` | Zero callers. Possibly superseded by `/api/receipts/[id]/reparse`. |
| `/api/admin/orphan-mailbox-sweep` | Zero callers — but in a folder named "admin" which suggests intentional. Might be curl-only. |

### 🟢 Looks unused but is actually live

False positives my grep can't see — verified used:

| Route | How it's reached |
|---|---|
| `/api/embeddings/refresh` | Vercel daily cron (in `vercel.json`) |
| `/api/smashlist/predict` | Vercel daily cron (in `vercel.json`) |
| `/api/email/poll` | GitHub Actions every 10 min (in `.github/workflows/email-poll.yml`) |

### 🟡 Low-import lib modules — worth a closer look later

These have only 1 importer. Often legit (single-use utility) but sometimes a sign of merge debris:

```
1 import:  auto-categorize, categorizeRules, client-debug-log, emoji-catalog,
           findExistingReceipt, guacSearch, guacky-responses, guacoscore,
           passwordStrength, perishable
```

`categorizeRules` is suspicious — we have a newer `auto-categorize.js`. The two might overlap. Recommend manual diff.

### 🟡 Low-import components

```
1 import:  AddressInput, EmailAliasPicker, EmojiCatalog, PrivacyNote,
           PrivacyPanel, QuickAddReceipt, ScreenshotCapture, Sidebar, TopBar
2 import:  BestPricesModal, CameraCapture, GuacoScoreCard
```

All legitimate — each maps to a specific page (Sidebar is layout, etc.). No deletions.

### 🟡 Low-import hooks

`useAliases`, `useCategories`, `useTrips` each have 1 importer. Each maps to a specific page. Keep.

---

## 3. Database schema review

### 27 tables in `public.`

```
audit_log                  receipt_items                stores
bank_fees                  receipt_refund_policies      user_categories
bank_statements            receipts                     user_privacy_settings
bank_transactions          reserved_email_aliases
car_trips                  rewards
client_logs                rewards_balances
data_purge_log             shopping_list
email_messages             smashlist_predict_dismissed
guac_savings               store_items
jobs                       store_locations
payment_options            store_return_policies
product_aliases
profiles
```

### Tables with 0 `.from('<table>')` references in app code

Found via `grep "from('<table>')` in `src/`:

| Table | Verdict | Notes |
|---|---|---|
| `client_logs` | Used via API only | `/api/client-logs/route.js` writes here. Keep. |
| `guac_savings` | **Likely orphan** | Migration 012 created it. No code reads or writes. Flagged for review. |
| `jobs` | Intentional seam | Migration 036 added as Tier 2 scaling lever. Unused today; production lever later. Keep. |

### Migrations review (042 total)

| Bucket | Migrations | Status |
|---|---|---|
| Schema-changing (DDL) | 001-033, 035, 036, 041, 042 | Required |
| Pure backfill (UPDATE only) | 034, 037, 038, 039, 040 | Idempotent, safe to re-run |
| Auxiliary (RPC defs only) | 014, 016, 022, 036, 041 | Required for app function |

**No migrations are obviously dead** — every one defines schema, indexes, RPCs, or data backfills that the current code uses. The numerical gap is just sequential growth.

### RLS posture

Verified policies on key tables:
- `receipts` → "own rows" via `auth.uid() = user_id` OR `is_admin`
- `receipt_items` → via parent receipt's user_id
- `product_aliases`, `smashlist_predict_dismissed`, `user_categories`, `user_privacy_settings` → own rows
- `jobs` → no public policy (service_role only, intentional)

**No security gaps found** in the policies I reviewed. The admin escape hatch (`is_admin = true` in profiles) is intentional but means any admin can read every user's receipts — worth a privacy callout in your terms.

### Relationships (FK graph, simplified)

```
auth.users (Supabase auth)
    ↓
profiles, user_privacy_settings, user_categories, audit_log, data_purge_log
    ↓
receipts ─────────────────────────────────────┐
    │                                         │
    ├→ receipt_items ─→ store_items           │
    ├→ receipt_refund_policies                │
    ├→ reconciled_with (self-FK)              │
    │                                         │
stores ←──┘                                   │
    ↓                                         │
store_locations ←─────────────────────────────┘
store_return_policies (no FK — name-keyed lookup)

bank_statements (statement_import_id)
    ↓
bank_transactions, bank_fees

shopping_list ─→ smashlist_predict_dismissed
product_aliases (user_id, alias_key) → canonical_key (text, no FK)

email_messages → receipt_id (FK to receipts)
rewards, rewards_balances → user, store
```

### No broken relationships found

Every FK in migrations points at an existing table. Nothing references a dropped column. The `store_return_policies` is intentionally name-keyed (not store-id-keyed) so curated rules can cover both `stores` rows and orphan store_name strings.

---

## 4. AI / Self-learning assessment

### What's AI today

| Where | Tech | Stateless / Stateful |
|---|---|---|
| `/api/parse-receipt` | Gemini 2.5-flash (image+PDF) | Stateless — no user context in prompt |
| `/api/parse-statement` | Gemini parse | Stateless |
| `/api/embeddings/refresh` | Gemini text-embedding-004 (768-dim) | Stateless model, results persisted in pgvector |
| `lib/auto-categorize.js` | Hand-rolled regex rules | Stateless — rules are hardcoded |
| `lib/predict-smashlist.js` | Cadence math + cosine similarity merge | Stateless math; embeddings come from persisted vectors |
| Groq Llama fallback | Llama-3.3 70B / Llama-4 Scout 17B | Stateless |

### What's self-learning today

| Layer | Mechanism | Triggers improvement |
|---|---|---|
| **Tier 2 per-store category** (migration 041) | `infer_user_store_category` RPC counts user-confirmed categorizations per store. After ≥3 same-category corrections, future receipts auto-use the user's slug. | Every user category correction |
| **product_aliases** (migration 035) | Predictor's cosine-merge decisions persisted with status `auto`/`confirmed`/`rejected`. Subsequent runs honor confirmed/rejected forever. | Each predict cron + user confirm/reject |
| **Smashlist embedding centroids** | Each predict run recomputes centroids from latest embedded items, catching new product variants automatically. | Every receipt insert + embedding refresh |

### What is NOT self-learning

- **Gemini SYSTEM_PROMPT** is fixed at build time. Your past corrections never reach the model as examples.
- **`auto-categorize.js` regex rules** are hardcoded. Adding a new merchant means editing the file.
- **Smashlist thresholds** (`CADENCE_TRIGGER = 0.80`, `MERGE_THRESHOLD = 0.88`, `MIN_PRIORS = 3`) are fixed constants, not adaptive.
- **No anomaly detection** — system doesn't notice "your usual milk is $2 and this receipt shows $25".
- **No cross-user learning** — by design (privacy). Each user starts cold.

### Verdict

**"AI-using, with light per-user self-learning, and clean seams to add more."**

The foundation is there — embeddings stored, user-correction history tracked, RPC plumbing for inference. Adding the next learning layers is incremental, not architectural.

### Concrete upgrade paths (ranked by ROI)

| Tier | Layer | Effort | Impact |
|---|---|---|---|
| 1 | Few-shot Gemini: include user's last ~20 confirmed (store, item, category) tuples in the prompt | ~30 lines, +200 tokens/call | Per-user accuracy boost on parse |
| 2 | Adaptive `auto-categorize.js` rules: when a user keyword overlap exceeds N, propose a rule | ~50 lines + admin UI | Long-tail merchants without hand edits |
| 3 | Price-anomaly flag per receipt_item | Item history + z-score | "Heads up — this milk is 3× your usual" |
| 4 | Smashlist cadence forecasting (Poisson / survival) replacing the heuristic | Medium | Better predictions, harder to explain |
| 5 | Tier 3 per-store policy learning (mirror of Tier 2 for return-policy preferences) | Medium | Auto-confirm return windows after pattern emerges |
| 6 | Embedding-NN bulk-recategorize ("apply this category to 5 similar items") | Small + UX work | One tap propagation |

---

## 5. Recommended deletions

### To delete now (zero risk)

- ✅ `src/lib/rewards-balance-extractor.js` — confirmed zero imports. **Deleting in this session.**

### To delete after your confirmation (low-to-medium risk)

Move these to a `_deprecated/` folder or just delete after you verify they're truly unused:

| File | Why I'm not deleting unilaterally |
|---|---|
| `src/app/api/similar-items/route.js` | Might be called by an admin script or external tool I can't see |
| `src/app/api/receipts/normalize-names/route.js` | One-time cleanup tool — keep if you might re-run on data |
| `src/app/api/receipts/reparse-images/route.js` | Probably superseded by `[id]/reparse` but verify |
| `src/app/api/admin/orphan-mailbox-sweep/route.js` | "admin" name suggests intentional — confirm before delete |
| `src/lib/categorizeRules.js` | Verify it's not a dependency of `auto-categorize.js` first |
| `public.guac_savings` table | Migration 012 created it; no code uses it. Drop after confirming you haven't planned a feature for it. |

### Untracked workdir (separate from above)

`git status` shows three untracked directories that aren't mine:
- `scripts/load-test/`
- `web/src/app/api/account/` (looks like another session's account-delete work — check if you want to commit or wipe)
- `web/src/app/api/admin/`

I've left these alone since they may be your in-progress work.

---

## 6. What I did NOT touch and why

- **Database tables** — dropping a table is irreversible and risks losing data. Even orphan-looking tables might have rows worth keeping (especially `guac_savings` if it was populated at some point).
- **Migration files** — they're historical record. Even "obsolete" ones document what shipped.
- **The untracked dirs** above — not mine, may be in-flight.
- **Any test data / receipts** — your test data is intentional even if it looks dupe-y.

---

## 7. Summary recommendations

1. **Run** [migration_042_receipt_pages.sql](web/supabase/migration_042_receipt_pages.sql) in Supabase (still pending).
2. **Confirm** the 🟡 deletion candidates in §5, then I'll commit removals.
3. **Decide** on the 6-tier self-learning upgrade path (§4). Tier 1 (few-shot Gemini) is the highest-ROI next step.
4. **Drop** `guac_savings` table only after you confirm no plan uses it. Add to migration 043 if you want to do it.
5. **Audit** the three untracked directories — either commit them or delete them so `git status` is clean.

---

*This report was generated by an AI agent (Claude) reading the repo. Cross-reference against git log and your own knowledge before acting on deletion candidates.*
