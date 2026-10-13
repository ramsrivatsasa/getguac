# Claude changes, 12-Oct-2026: Money Bootcamp (free budgeting test for every Academy lesson)

**Repo:** `C:/Money/getguac-upgrade`, runtime port **3002**, local Supabase only.
**Status:** built and verified locally. **Not committed, not deployed, and not linked from anywhere yet.**
**Owner constraints for this work:** create new pages only and **do not edit existing pages**. Model the structure on
Goodbudget GB 101 Budget Bootcamp (https://goodbudget.com/the-goodbudget-way/courses/101/), but do not copy its copy or name.
Every lesson gets a test and a score, and every page is fully indexable with SEO metadata and keywords.

## What a test contains
Each test has 9 questions, built **only from the lesson it tests** (`academyLessons()` in `src/lib/academy.js`), with no new financial content:
- the lesson's 3 existing practice-check questions
- 3 key-idea matches (wrong options are drawn from other lessons in the same track)
- 1 question on which action-plan step comes first
- 2 spot-the-mistake questions (one of the lesson's mistakes listed against its own objectives and plan steps)

The lesson puzzle is shown as an unscored bonus. Options are shuffled with a fixed seed, so the server and browser render the same order.
The pass mark is 70%. Grades are Expert (90%+), Passed, Almost there (50%+) and Start with the lesson.
Scores are kept in the browser only, under localStorage key `gg_bootcamp_scores_v1` (best score, last score, attempts). No account is needed.

## Files added (all new; no existing file was edited)
| File | Purpose |
|---|---|
| `web/src/lib/bootcamp.js` | Builds the tests and exams from Academy lessons. Also provides the grade bands, Quiz and Breadcrumb JSON-LD helpers, and keywords. |
| `web/src/app/money-bootcamp/page.jsx` | Hub `/money-bootcamp`. Has the overall score card, 3 how-it-works steps, a compact table per track (test, questions, best score, Start), a final-exam link per track, and a FAQ. JSON-LD: Course, ItemList, FAQPage, Breadcrumb. |
| `web/src/app/money-bootcamp/[slug]/page.jsx` | One test per lesson. Includes the lesson objectives, a "Read the lesson first" link, the test, the bonus problem, a "Put it into practice" exercise, and the other tests in the track. JSON-LD: Quiz, Breadcrumb. |
| `web/src/app/money-bootcamp/exam/[track]/page.jsx` | 13 track final exams, 2 practice questions per lesson. Each explanation links to its source lesson. |
| `web/src/app/money-bootcamp/sitemap.js` | Serves `/money-bootcamp/sitemap.xml`: hub, 13 exams and 100 tests (114 URLs). |
| `web/src/app/money-bootcamp/BootcampClient.jsx` | Client components: `BootcampTest`, `ScoreBadge`, `OverallScore`, `useScores`. |
| `web/src/app/money-bootcamp/scores.js` | localStorage reads and writes, all wrapped in try/catch. |
| `web/src/app/money-bootcamp/bootcamp-css.js` | `bc-*` styles layered on `ACADEMY_CSS`, which is imported read-only. ASCII only, flat selectors, no comments inside the string. |
| `web/docs/MONEY_BOOTCAMP_REVIEW_2026-10-12.md` | Review notes and evidence. |

## URL slugs (changed by another session at 18:40, keep it)
`bootcampTests()` now keys tests by the lesson's **source slug**, e.g. `/money-bootcamp/zero-based-budgeting` and `/money-bootcamp/where-you-stand`,
not the long Academy URL slug. The reason given is that test IDs, saved scores and question seeds stay stable if Academy URLs change.
"Read the lesson" links go to `/academy/<sourceSlug>`, which the Academy page already permanently redirects to its canonical URL.

## SEO on every page
- Unique `<title>`. Lesson tests use `<Lesson title>: Free Quiz & Test | GetGuac`; exams use `<Track> Bootcamp: Free N-Question Exam`.
- Unique description, a `keywords` list (e.g. "<topic> quiz", "free budgeting test", "budget bootcamp", "personal finance quiz"), canonical URL, `index, follow`.
- Questions, answers and explanations are server-rendered in the HTML.

## Verification done (port 3002)
- All **100/100** lesson tests render 9 questions plus Quiz schema. All **13/13** exams render. The hub links all 100 tests. There are no not-found errors.
- Playwright at 1366×900 and 390×844: answered a full test, the score saved (56%, "Almost there"), and the hub shows "Best 56%" and the overall score.
  There is no horizontal overflow and no page errors. ESLint on the new files is clean.
- The only console warning was a `caret-color` hydration diff injected by Playwright screenshots. It appears 0 times without screenshots.

## Remaining work for the next session (each edits an EXISTING file, so get owner approval first)
1. **Make it discoverable.** Nothing links to `/money-bootcamp` yet. Options:
   - a nav entry (nav is defined once in `lib/gg-nav-def.js`; static pages need `npm run nav`, which has a regeneration trap)
   - a "Take the test" link at the end of each Academy lesson (`src/app/academy/[slug]/page.jsx`, next to `LessonCheck`) and/or on articles
   - an Academy hub link
2. **Sitemap.** Add `${SITE_URL}/money-bootcamp/sitemap.xml` to `robots.js`, merge the URLs into `src/app/sitemap.js`, or submit the sitemap in Search Console.
3. **Ship together.** `/money-bootcamp` imports `/academy` (`src/lib/academy.js`, `src/app/academy/*`), which is **also uncommitted**. Commit and deploy them together, or the build breaks.
   Never use `git add -A`; stage the files explicitly.
4. Optional: rerun the desktop/mobile review after any linking change, per AGENTS.md design-review rules.

## October 13 completion (supersedes the remaining-work list above)

The owner authorized completion. Money Bootcamp is now in the shared Academy menu, each lesson links its matching test, and robots.txt advertises the separate Bootcamp sitemap. Old canonical-address score keys migrate to stable source IDs while preserving best/latest/attempt history; old test URLs redirect to their stable IDs. All 100 tests and 13 exams passed local and live route/question/canonical/sitemap checks, plus desktop/mobile menu, lesson/test, score-save/reload, legacy-score, exam and Back journeys.

Academy and Bootcamp dependencies are committed together on origin/codex/public-academy-bootcamp-20261013, along with the previously deployed web baseline. Main and unrelated dirty changes were not modified. Bootcamp requires its Academy import closure, but Academy can build/deploy independently; the earlier claim that either direction necessarily breaks the build was too broad.

Final current website release is dpl_AxfWRR2EmvkktarxvsJicptqebWY / getguac-blyzn9r9g-getguac.vercel.app, promoted to getguac.app. Article-feedback migration 103 is applied and enabled after real production privacy/persistence/moderation checks. Bills migration 094 is completed and synthetic saved-state checks pass. Report popups auto-close only after successful saving. Website performance follow-up scores 80 mobile, 97 accessibility and 100 SEO/best practices in the latest lab run; field Core Web Vitals are not verified. Full live page checks pass at 1440/390/320, including lazy section rendering and print/screen height stability. See web/docs/audits/2026-10-13-remaining-release-completion.md for evidence and residual warnings; older grocery-price/apparel-size evidence gaps remain separate.
