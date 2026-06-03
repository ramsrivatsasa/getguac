# GetGuac — Pre-launch handoff

Snapshot of where the project stands on **2026-06-03** vs the checklist
discussed for "ready to market." Every checkbox is paired with a clear
status: **DONE / IN-CODE / BLOCKED-ON-YOU / NOT-STARTED**.

---

## 1. Credential-linking story  →  **DONE (Phase 1 PoC, beta-gated)**

| Surface | State |
|---|---|
| Mobile WebView linker (`/connections/link/:id`) | Built, Amazon extractor only. Amber **BETA** badge in app bar + amber warning strip "may break without notice" at top of screen. |
| Web Connections modal | Amber **Beta** chip next to "Link account directly" callout + "Open in mobile app" CTA (web browsers can't run cross-origin extraction). |
| Privacy Policy | Section 5 covers Retailer Connections (Beta) — what we read, what we don't store, retention rules, retailer-ToS disclaimer. |
| Terms of Service | Section 5 explicitly puts ToS risk on the user, allows us to disable any linker, calls out beta status. |
| Apple/Google review | **NOT-STARTED** — the beta gating + disclosures are the defense, but reviewers may still flag. Be ready to remove from store listing if they push back. |

## 2. Beta cohort  →  **BLOCKED-ON-YOU**

| Step | Who |
|---|---|
| Sign up for Apple Developer Program ($99/yr) | You |
| Sign up for Google Play Console ($25 one-time) | You |
| Buy the Mac (15" M4 Air 16/512 from Costco, the link you sent) | You |
| Build iOS .ipa, upload to TestFlight | Me, once Mac arrives |
| Set up Play internal testing track | Me, once you create the Play account |
| Recruit 10–20 testers from your network | You |
| Watch Sentry + PostHog for 2-4 weeks before opening up | Both |

Sideload distribution via [getguac.app/download](https://getguac.app/download) keeps
working for power users in the meantime.

## 3. Crash + analytics  →  **DONE (env-var gated)**

| Service | Web | Mobile |
|---|---|---|
| Sentry — error reporting | `sentry.{client,server,edge}.config.js` + `next.config.mjs` wrapped with `withSentryConfig` | `sentry_flutter` in pubspec, init gated on `--dart-define=SENTRY_DSN=`, `DebugLog` forwards error-level events to `Sentry.captureMessage` |
| PostHog — behavioral analytics | `PosthogProvider` in `layout.jsx`, identifies on Supabase auth, manual pageview capture | `posthog_flutter` in pubspec, `AnalyticsService.init()`, identifies on auth change |
| **BLOCKED-ON-YOU** | Create Sentry account → grab DSN. Create PostHog account → grab key. Drop into Vercel env + into `--dart-define` for mobile release build. Until set, both no-op cleanly. |

`.env.example` in `web/` lists every required var.

## 4. Store listings + ASO  →  **NOT-STARTED**

Needs ~1–2 weeks of polish work. None of this exists yet:

- App name (locked: GetGuac), subtitle (~30 char), 4-line description, long description (~4K char)
- Screenshots: 6–10 per platform per device class. Tools: `flutter screenshot` or manual + Figma frames.
- App preview video (optional but ASO-positive)
- App Store privacy nutrition label (Apple) + Data Safety form (Google)
- Marketing URL (getguac.app ✓), support URL (TODO: stand up support@getguac.app or a help page)
- App icon: shipped v0.3.36 (Twemoji avocado on emerald squircle)
- ASO keywords list

I can draft copy and assemble screenshot frames from real device captures once we have a beta build going.

## 5. Legal review  →  **DIY DONE / LAWYER NOT-STARTED**

| Status | Item |
|---|---|
| DIY pass DONE | Privacy + Terms updated this session to cover `user_connections`, retailer scraping, Sentry/PostHog, retention. |
| Recommended | Pay TermsFeed / Termly ~$500 for a templated review — covers 90% of risk. |
| Optional | $1–2K for a real lawyer if you want to be bulletproof. Worth it if the credential-linking feature stays. |

## 6. Cost monitoring  →  **DONE (needs migration applied)**

| Piece | State |
|---|---|
| `usage_metrics` table + RLS + `record_usage` + `read_usage` RPCs | `web/supabase/migration_065_usage_metrics.sql` — **needs you to apply in Supabase**. Also adds `profiles.is_admin`. |
| Daily cron `/api/cron/usage-snapshot` | Wired in `vercel.json` (08:00 UTC daily). Reads cheap `count(*)` from receipts / items / profiles / user_connections / referrals tables. |
| Admin dashboard `/admin/cost` | Bars vs free-tier ceilings (Supabase row caps hard-coded; bump when you upgrade plans), external dashboard links (Vercel / Supabase / Google CSE / Sentry / PostHog), 14-day raw metric history. |
| Access | `profiles.is_admin = true`. No UI to promote — flip the bit manually in Supabase. Page double-gates client + RLS-enforced server-side. |

## 7. Referral feature (bonus, not on original list)  →  **DONE (needs migration applied)**

| Piece | State |
|---|---|
| `referral_codes` + `referrals` tables + RPCs | `web/supabase/migration_064_referrals.sql` — **needs you to apply** |
| Web `/invite` page + Profile tile + `?ref=` capture | Built |
| Mobile `/invite` screen + Profile tile + share sheet | Built |
| Reward | +3 Smash days each to referrer + referee (via `profiles.smash_days_bonus`) |
| Smash-days display | `computeSmashDays(receipts, bonus)` in both web + mobile now adds the bonus to the streak count. Callers must pass `profile.smash_days_bonus` for the bonus to show — most surfaces still default to 0; wire the bonus into individual surfaces as we ship them. |

## 8. Smash-days bonus surfacing  →  **PARTIAL**

`computeSmashDays` accepts a `bonus` arg in both stacks. Callers haven't all been updated yet — surfaces that show the streak count still default to 0 bonus. Wire as you encounter them; minimal blast radius.

---

## Apply checklist for you (sorted by priority)

1. **Apply migrations** in Supabase (in order):
   - [migration_064_referrals.sql](web/supabase/migration_064_referrals.sql)
   - [migration_065_usage_metrics.sql](web/supabase/migration_065_usage_metrics.sql)
2. **Promote yourself to admin** in Supabase: `update profiles set is_admin = true where id = '<your auth.users id>';`
3. **Create Sentry account** → copy DSN → drop into Vercel env as `NEXT_PUBLIC_SENTRY_DSN` + Mac/release build as `--dart-define=SENTRY_DSN=...`
4. **Create PostHog account** → copy key → drop into Vercel env as `NEXT_PUBLIC_POSTHOG_KEY` + Mac/release build as `--dart-define=POSTHOG_KEY=...`
5. **Order the Mac** (M4 Air 16/512 — the Costco link)
6. **Apple Developer account** ($99/yr) once Mac arrives
7. **Google Play Console** ($25 one-time) any time
8. (Optional) **Legal review** — TermsFeed/Termly templated pass for ~$500

---

## What I'll do next when you have the Mac

1. iOS build pipeline — `flutter build ios --release`, manage signing, first TestFlight submission
2. Generate App Store + Play Store screenshots from the same set of real-device captures
3. Draft store listing copy
4. Build the support / help-center page

## What I'll do as you create accounts

- Drop Sentry source-map upload into the Vercel build (needs `SENTRY_AUTH_TOKEN`)
- Wire `track()` calls to a few more high-signal product events (receipt save success/failure, signup conversion, paywall view if/when added)
- Add Supabase quota alerts via the cost-monitoring cron once we know what the actual numbers look like

---

Last updated 2026-06-03 — kept in repo root so you can spot-check the punch list any time. Delete or move to `docs/` once we're past launch.
