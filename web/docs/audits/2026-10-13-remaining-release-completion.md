# Remaining release completion

Owner authorized completion of the remaining release tasks on October 13, superseding the Bootcamp handoff's earlier new-pages-only restriction for menu/lesson/robots integration. Existing Academy and Bootcamp designs were retained; no financial choices or owner records were rewritten.

## Acceptance and evidence

| Criterion | Status and evidence |
| --- | --- |
| Stable Bootcamp scores | Pass: old canonical keys migrate once, retaining best/latest/attempt totals, exam and unknown records; unit tests cover idempotence, malformed/blocked storage and SSR |
| Discoverability | Academy menu includes Money Bootcamp in shared React, homepage and generated standalone navigation; lessons link their matching stable test ID; actual menu checks pending final candidate |
| Crawler discovery | robots.txt advertises the separate 114-URL Bootcamp sitemap; 100 lesson tests and 13 final exams pass local and production-candidate HTTP/question/canonical/sitemap checks |
| Test journey | Pass at 1440/390: lesson-to-test, all answers, 100% score, save/reload, hub legacy-score badge, exam completion, Back and no overflow/browser exceptions |
| Feedback database | Migration 103 applied to confirmed production project qchkwojgvfhlbdtpzzig; both tables have RLS and revoked direct anon/member privileges, service-role access retained |
| Feedback privacy and persistence | Pass locally and on production candidate getguac-n4fnuv3k3-getguac.vercel.app: persistent votes, comments/reload, pending visibility only for author, API/browser admin approval/rejection, escaped markup, denied direct reads/writes at 1440/390; disposable QA users removed |
| Security advisor | Informational RLS-without-policy notices are intentional: these tables are server-only, with no direct browser access. API validates user, content, origin, rate limits and moderation authorization. Reference: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy |
| Older Bills dependency | Column existed but constraint was missing; no invalid existing types found. Migration 094 applied; synthetic production bill creation/type/12 calendar entries/reload/no-duplicate tests pass at 1440/390. QA records removed |
| Mobile performance | Removed eager optional PostHog and Sentry imports. Shared first-load JS reduced from 186 KB to 107 KB (Sentry change); final Lighthouse pending. Optional-Sentry tests cover no DSN and configured init/router transitions before/after loading |
| Git isolation | Dedicated codex/public-academy-bootcamp-20261013 worktree records the verified deployed web baseline plus these changes. Main checkout's unrelated dirty changes remain untouched; no unverified financial/receipt/mobile work is copied into this release |

## Design review scope

Read design guidelines, design memory and consolidated owner requests. This is integration/persistence/performance work, not permission for a Bootcamp or Academy redesign. Preserve existing typography, diagrams, responsive tables and actions. New lesson action belongs at the lesson end, the shared menu entry remains under Academy, and crawler settings are not user navigation. Local desktop/mobile screenshots show readable layout and restored score; test/exam interaction and Back pass. Production feedback screenshots verify existing compact forms/moderation without whole-page overflow. Existing baseline public-page competitor review remains in the October 13 public SEO audit; no new visual identity or invented product proof added.

## Still separate

Historical source gaps in genuine grocery prices and missing apparel sizes are not resolved by these release tests. Unknown sizes must not qualify as cheaper matches. No fabricated prices, purchase specifications, model training, guaranteed savings or whole-app completion is claimed.

Final deployment, live verification, Lighthouse and Git commit/push evidence will be appended after completion.

## Final results

Supabase migrations 103 and 094 are applied and verified. Production feedback enabled via NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED=1 after candidate privacy/persistence/moderation tests passed. Candidate and live Bootcamp tests pass all 113 routes, matching sitemap/canonical/question markup and both menu/lesson/test/exam/save/reload/legacy-score/Back journeys. Public checks pass at 1440/390/320; final six signed-in candidate dashboard cases and fresh local six cases pass. Guest/member report automatic close, persisted records, redaction and failure-preserved description checks pass locally. Shared/generated navigation check passes 42 static pages.

Final release dpl_God8RiqBS227JWp8rWaBVxC8UBEN / getguac-jgl19a47p-getguac.vercel.app is promoted to getguac.app. Previous fully verified feedback/Bootcamp release dpl_CHK462vHDbsgE1bJFyJAHDgA68qv passed live feedback/Bootcamp/public checks before the final homepage-only layout patch. Final homepage candidate checks include stage selection, matching media and keyboard Home navigation at all three widths. Initialization no longer forces each text/media animation layout separately; later transitions use one batched layout flush.

Shared first-load JS reduced from 186 KB to 107 KB. Lighthouse does not establish a speed-score improvement: isolated pre-layout run 63 (LCP 4.602s/TBT 882ms), final run 65 (LCP 4.794s/TBT 683ms), accessibility 97, best practices 100, SEO 100, CLS 0. Earlier public release scored 68; mobile performance is still unfinished. NO_LCP trace-engine warnings occurred despite available metrics/scores. Evidence: web/.local/lighthouse-home-completed-isolated-20261013.json and lighthouse-home-layout-completed-20261013.json. Do not claim field Core Web Vitals or a guaranteed improvement from byte reduction.

Commit e0bb871a is pushed to origin/codex/public-academy-bootcamp-20261013. It records the verified deployed web baseline that had not been committed, plus this release; 811 source files hash-match the tested bundle. No environment files, local QA records, node_modules, caches or APKs were staged. Main was not merged or changed. Final audit/test follow-up will be a second small commit. Local guarded runtime remains port 3002 with local Supabase; final cache rebuilt after configuration/HMR changes, with previous cache preserved.
