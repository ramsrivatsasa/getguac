# Pending production updates

## October 16 completion reconciliation — current status

- Owner resumed the pending work with “complete every thing”. Web release dpl_G1LCqrd9RXTu5F9DhohyLEo5GaLt is promoted and freshly verified on getguac.app. Includes Statistics/public News/notifications, October15 SEO and signup tracking, permanent retailer-order identity and category-aware apparel-size guards. Live crawl321 URLs/460 internal destinations has zero failures/broken links;1440/390/320 rendering and production disposable-account persistence/privacy checks pass. Isolated release source pushed as6f8175af; main dirty checkout preserved.
- Both new ad images are saved:9 images/3 videos in the existing group, pending Google review. GetGuac location assets are disabled at campaign scope. Campaign phone asset is paused; account-level call inheritance/preview still needs resolution without changing unrelated chess settings. Budget remains3USD/day.
- GitHub SMTP authentication and test-message acceptance pass (run38935299297); actual admin inbox receipt remains unverified. Masked exported secrets are not usable credentials.
- Android0.4.25/code265 built, manifest/hash verified and archived at C:/Money/release-builds/2026-10-16.245 tests pass, one fixture-dependent skip; analyzer has93 existing warning/info issues and no errors. No connected device; physical/push gates, iOS archive and store submission remain open. Do not falsely attest device tests.
- Genuine store-specific grocery prices, missing historical apparel sizes and original phone full-year import reconciliation remain evidence/access gaps. Earnings requires a permitted provider key. Previously explicit Grok/OpenAI/subscription deferrals remain; no purchase or unsupported provider claim is inferred.
- Full evidence/limits: web/docs/audits/2026-10-16-pending-completion.md. This entry supersedes older release holds and completed-item blockers below. Port3002/local Supabase remains healthy. Automatic approval review rejected the requested local-server restart as blocked by policy; the updated credential-clearing guard takes effect on the next permitted restart.

Owner direction, 2026-10-04: complete all remaining pending tasks after the account-save popup. This supersedes the older hold/deployment instructions below. Reconcile each older entry against current code and production evidence; withdrawn reports are not revived. Completed items require actual verification, not just a prior implementation note.

## Groceries submenu and basket savings — 2026-10-04

- Owner initially deferred Groceries; the October 4 instruction to complete all pending tasks authorizes its implementation. Keep it as a submenu under Shopping List with a dedicated basket page.
- Present monthly budget, recorded grocery spending, estimated net savings and receipt-supported verified savings separately. Owner mentioned up to $600/month; do not persist this as confirmed spending or invent savings.
- Compare the next shopping basket across relevant nearby stores, including repeated purchases at any amount. Avocado, milk and other produce belong in basket details rather than separate restock/savings tasks. Match quantities, units, variety and dietary requirements; show substitutions explicitly.
- Recommend a single practical store first; offer split trips only when savings justify known travel/delivery/membership costs. Missing prices must not count as zero.
- Reuse prices by product/store/location and refresh stale data in bounded batches after receipt parsing, relevant profile/list changes, scheduled checks and page opening. Preserve saved choices and avoid duplicate research or double-counted savings.
- Status: submenu, dedicated page, shared Grub & Grab records, saved budget/basket/store choice, main-plan entry and bounded opt-in Shopping agent refresh are deployed. Desktop/mobile production pages and authenticated APIs verified. Synthetic local selection tests reject missing local evidence/extra costs, preserve profile/previous decisions and show the save popup. Real Target milk/Hass avocado research returned unavailable prices; no live grocery savings result is claimed. Current store-specific price coverage remains an upstream data limitation.

## Buy Again: transaction charges incorrectly due for restock — 2026-10-04

- Owner screenshot shows **Tip**, $3.90 at Glory Days, marked **DUE NOW**, with an inferred four-week purchase frequency and Add/Snooze controls. A tip is a transaction charge, not a replenishable product.
- Pending: trace receipt line-item classification and Buy Again eligibility/frequency inference; exclude tips/gratuities, tax, fees, service charges, discounts and receipt totals from restock candidates, including previously cached/generated suggestions.
- Preserve receipt amounts and spending records; suppress the invalid restock recommendation rather than deleting the charge.
- Verify with the reported real receipt and a genuine repeated product that charges never receive restock timing or shopping-list actions, while eligible products continue to work. Review the adjacent **PHARM RX** candidate for sufficient product identity and supported repeat timing; do not infer a medication refill schedule from a generic charge.
- Evidence: owner attachment `C:/Users/Narasimha/AppData/Local/Temp/codex-clipboard-c9065f3f-13f2-43a3-9ed0-0243be69da1a.png`.
- Status: exclusion implemented locally in the predictor, cached shopping-list reads and agent-suggestion display; unidentified PHARM RX is also excluded. Twelve predictor/eligibility regressions passed. Local rendered tests at 1440px/390px retain a genuine repeated product and hide cached charges; live price lookup was isolated with an unavailable response because the guarded local runtime has no live provider keys. Deployed to getguac-ln366e9gq-getguac.vercel.app / getguac.app and verified on the actual account at 1440px/390px: both unapproved charge candidates hidden; saved financial decisions unchanged.

## Additional audit finding: optional shopping-price lookup failures

- Guarded local runtime has no live price-provider keys, causing /api/best-price to return HTTP 500 and open the global error dialog during automatic background lookup. Restock suggestions should remain usable with a clear unavailable-price status. Verify genuine provider failures separately from no matches; never manufacture current prices or present model-generated prices as verified listings.
- Status: fixed and deployed in getguac-ejv8ic9xf-getguac.vercel.app / getguac.app. Missing/failed optional providers return 200 with unavailable status and null price. Model-generated amounts are no longer displayed as verified listing prices; legacy Gemini cache entries are rejected. Guarded local HTTP check passed.

Recorded on 2026-09-14; the older deployment hold is superseded by the owner’s repeated deployment authorization and October 4 complete-all instruction.

## Steals — verified complete October 4

- Make the dashboard **Steals for you** module a proper accordion.
- Default the accordion to collapsed.
- Hide all supporting text and deal rows while collapsed.
- Keep the **All steals** link available in the accordion header.

## Sidebar alignment — verified complete October 4

- Keep the desktop sidebar aligned to the top of the viewport.
- Prevent long dashboard content, including Steals, from stretching the sidebar.
- Keep **Dashboard presets**, **Sign Out**, and **Collapse** visible within the viewport instead of pushing them down with page content.

## Bill types — local fix complete; production migration required

- Add a persisted `bill_type` field to recurring bill series.
- Initial types: Mortgage, Car payment, Utilities, Rent, Insurance, Subscription, Loan, Credit card, Taxes, and Other.
- Add a bill-type selector to the Add Bill form.
- Display the bill type on calendar and upcoming-bill rows.
- Apply `migration_094_bill_type.sql` before deploying the corresponding UI. October 4 probe: local column exists, production column missing. Supabase administration is signed out; owner sign-in requested. Local type selector/persistence and calendar/upcoming labels are implemented. Mortgage/manual, car payment/autopay and utilities/manual saved-state tests pass at desktop/mobile widths.

## Bill creation visibility — local fix verified; production pending

- After a user saves a bill, it must appear immediately in the Bills calendar and **Upcoming bills** list without a manual page refresh.
- The UI must select or navigate to the saved bill's next due date when that makes the new bill easier to see.
- A successful save must not close the form unless both the bill series and its generated bill cycles are readable by the signed-in user.
- Show a clear success confirmation after the calendar has refreshed.
- Show an actionable error if the bill saved but its generated cycles could not be loaded.
- Cover manual and autopay bills, including Mortgage, Car payment, and Utilities. October 4 local regression passes all three. Save verifies readable series/cycles, updates the query cache and navigates to the due date; injected read failure keeps the form open and retry does not duplicate the bill. Month-end/leap-year schedules are corrected without altering existing cycles.
- Production diagnosis on 2026-09-14 found 2 recent bill series and 24 matching cycles with no orphaned series, confirming that the reported defect is display/refresh behavior rather than missing database records.

## Stores list alignment and space usage — deployed, responsive verification passed

- Realign every store row to a shared responsive column grid so checkboxes, logos, store names, contact details, policy badges, and actions line up vertically across the list.
- Keep the store identity column stable instead of allowing variable-length addresses and phone numbers to shift later columns.
- Use explicit desktop columns for: selection, store identity, contact/location, purchase activity, return policy, and row actions.
- Use the large empty center/right area for useful customer context:
  - receipt or purchase count;
  - total or recent spend;
  - most recent purchase date;
  - return-policy status/window;
  - a compact **View store** or overflow action.
- Do not display raw identifiers or phone-like numeric values as unlabeled badges; label or move them into an appropriate detail/action field.
- Keep missing values visually quiet with a consistent placeholder instead of collapsing the column and breaking alignment.
- Add a compact header row on desktop so each value's meaning is clear.
- On smaller screens, collapse the grid into a two-line card: store identity first, then the most useful metadata and policy/action chips.
- Preserve checkbox multi-select behavior and ensure the full row remains keyboard accessible.
- Validate the layout with short and long store names, missing addresses, multiple contact fields, and every return-policy badge state.

### Promotions and offers workspace — deployed, responsive verification passed

- Use the available center/right space for a contextual **Promotions & offers** panel instead of leaving it empty.
- Show offers associated with the selected or focused store first, followed by other relevant nearby or frequently used merchants.
- Combine eligible offers parsed from connected email with offers discovered through a user-initiated web search.
- Provide one search field for merchant, product, category, or offer terms, with filters for source, expiration, discount type, and relevance.
- Label every result by source (**Email** or **Web**) and show merchant, benefit, expiration, eligibility, promo code when present, and a safe redemption link.
- Visually distinguish verified merchant offers from third-party or unverified web results; do not imply that a web result is guaranteed or endorsed.
- Rank results using store match, user relevance, offer value, freshness, and confidence while keeping sponsored placement out unless it is explicitly identified.
- Deduplicate the same promotion found in both email and web sources, retaining both source references where useful.
- Exclude expired, suspicious, inaccessible, or insufficiently detailed offers and provide a report/dismiss action.
- Keep the panel compact and responsive: a side panel or additional columns on wide screens and a collapsible section below each store on small screens.
- Never run broad web searches or open tracking/redemption links without an explicit user action; cache only the minimum offer metadata needed for the feature.

### AI-curated major promotions — controls deployed; scheduled scan defaults disabled

- Allow the GetGuac AI agent to periodically scan approved public sources for major promotions from well-known merchants and brands.
- Prefer official merchant offer pages, loyalty-program pages, and other reputable sources; avoid scraping sources that prohibit automated access.
- Consider an offer **major** based on meaningful customer value, broad availability, merchant relevance, freshness, and confidence—not merely promotional wording.
- Extract and validate the merchant, offer value, eligible products or customers, promo code, redemption URL, geographic restrictions, start date, and expiration date before displaying it.
- Match validated promotions to existing stores and categories so they appear in the Stores **Promotions & offers** workspace and relevant Rewards views.
- Automatically publish only high-confidence offers from trusted sources; send uncertain, account-specific, or incomplete offers to an admin review queue.
- Label these entries **AI discovered**, display the original source and last-checked time, and never present an offer as guaranteed.
- Recheck active offers periodically, remove or archive expired offers, and suppress offers whose source no longer confirms the promotion.
- Deduplicate AI-discovered promotions against email offers, manually entered rewards, and existing web-search results.
- Keep an audit record of discovery, validation, updates, rejection reason, and removal without storing unnecessary personal information.
- Provide controls for scan frequency, approved merchants/sources, categories, geographic area, minimum offer value, automatic publishing, and immediate disablement.

## Deal-email parsing and Rewards ingestion — implemented; final production verification in progress

- With the user's explicit mailbox connection and consent, identify incoming emails that contain genuine deals, rewards, coupons, cash-back offers, or member benefits.
- Parse the merchant, offer title, description, promo code or redemption link, discount/value, eligibility rules, start date, expiration date, exclusions, and email source when available.
- Add an offer to **Rewards** only when it is relevant and actionable: it comes from a recognizable sender or merchant, contains a concrete benefit, has enough redemption information, and is not already expired.
- Match parsed offers to an existing store or reward when possible; retain the original merchant name when no confident match exists.
- Prevent duplicates using sender/message identity plus normalized merchant, promo code, offer value, and validity dates.
- Do not add newsletters, general advertising, order confirmations, shipping messages, receipts without an offer, suspicious links, or vague promotions with no usable benefit.
- Route low-confidence or ambiguous offers to a review queue instead of publishing them automatically.
- Mark imported rewards with an **Email offer** source and keep a reference to the originating message for traceability without exposing private email content in the Rewards list.
- Automatically hide or archive expired offers and allow users to dismiss, edit, or report an incorrectly parsed reward.
- Show a concise import result: offers added, duplicates skipped, expired or irrelevant messages ignored, and items requiring review.
- Ensure mailbox tokens and message contents remain server-side and are never exposed in browser code, logs, or public database fields.
- Test forwarded emails, multiple offers in one email, changed expiration dates, repeated campaign messages, missing promo codes, and offers targeted to a specific account or membership.

### Prevent promotional emails from becoming receipts

- Change the email-ingestion pipeline to classify each message before creating any receipt record.
- Supported classifications must include at least: purchase receipt, promotion/offer, order or shipping update, account/loyalty notice, and unrelated/unknown.
- Create a receipt only when the message contains credible purchase evidence such as a transaction/order identifier, purchased line item, paid total, merchant, and transaction date. A subject containing words such as `receipt` must not be sufficient by itself.
- Route promotions and coupons to the **Promotions & offers** review/ingestion flow rather than the Receipts table.
- Do not create `$0.00` placeholder receipts for offer emails, newsletters, welcome messages, loyalty notices, or ambiguous messages.
- Where an email contains both a purchase receipt and a post-purchase promotion, create the receipt from the transaction section and separately extract the promotion without duplicating either item.
- Record the classifier result, confidence, and reason so incorrect routing can be diagnosed and corrected.
- Send low-confidence classifications to a review queue instead of automatically creating a receipt or reward.
- Add idempotency so reprocessing the same email cannot create duplicate receipts or promotions.
- Provide a safe cleanup workflow to find existing `$0.00` email-imported receipt records, review their source messages, move genuine offers to Promotions/Rewards, and remove only confirmed false receipts.
- Include regression tests using examples such as **RECEIPT BY EMAIL** and **YPB BY ABERCROMBIE**, along with real purchase receipts, shipment updates, newsletters, and mixed receipt-plus-offer emails.

### Confirmed Inbox / re-parse defects — fixed and production verified October 4

- Verified production example: “Layer up: 50% off sweatshirts” is a promotion with no transaction evidence. Its email is stored as unknown/processed and linked to an unfinished $0 receipt with no items. Read-only parser research returned an empty purchase result; production re-parse returned 502.
- Reconcile existing ad/rewards email classifications and false receipt links using source evidence. Preserve original email, legitimate purchases, usable offers and saved decisions. Do not indiscriminately delete all $0 receipts; valid zero-net returns/exchanges may exist.
- Inbox currently labels every unfinished linked receipt “Parsing…” without checking an active processing lease. Show Parsing only while processing is active; distinguish failed/review, promotion, and account/loyalty states.
- Replace the unconditional “Guac-AI parsed this into a receipt” banner based on email processed + receipt_id with evidence of a successfully parsed purchase receipt.
- Re-parse must classify the source before calling a purchase parser. Ads/loyalty notices should receive an accurate non-receipt explanation, rather than misleading 502 or another placeholder receipt.
- Regression examples: “Layer up: 50% off sweatshirts”, Lowe’s “Fire up your weekend with up to 30% OFF”, and rewards notices. Verify desktop/mobile Inbox labels, actual active/failed parsing, receipt-link cleanup, re-parse behavior, mixed transaction/offer mail and preserved genuine receipts.
- Also fix recipient rendering that displays “Delivered to: [object object]”.
- Status: Inbox status, recipient formatting and reparse guards deployed October 4 in getguac-ejv8ic9xf-getguac.vercel.app / getguac.app. Real-account desktop/mobile verification passed, including the formerly failing promotional reparse returning 200/skipped without changing receipt amounts or saved decisions. Latest October 4 reconciliation: twelve non-purchase messages across eleven empty receipt records, with nine promotion leads routed to review and three account/security notices. Confirmed placeholders are excluded from receipt/dashboard/plan lists only when all linked sources are non-purchases, with original emails/receipt records retained. Production receipt-API and Inbox checks passed at both widths; genuine zero-net returns/exchanges are preserved. Latest release: getguac-5vf9zsmvh-getguac.vercel.app. Local regressions cover active/expired leases, zero-net returns, promotion extraction and existing offer decisions.

### Production plan still has no choices — 2026-10-03 (unresolved)

- Owner screenshot at /my-plan still shows zero purchase opportunities/bills and no selectable plan. Region/provider configuration corrections do not establish restored plan behavior. Do not mark this complete.
- Date defect: recordedExpenses independently fell back for total-only receipts, mixing recent itemized records with July/August totals. Corrected with one shared recent-first 30-day window and deployed October 3 to getguac-ooj549jth-getguac.vercel.app / getguac.app. Regression checks passed; owner's production page verified at 1440px/390px: nine records all within latest 30 days, accordion works, no page overflow/runtime errors. This corrects date scope only; qualifying choices remain unresolved.
- Purchase extraction/matching: recent production apparel titles have no unambiguous size. Parser schema/prompt has no explicit size/specification requirement. Inspect original source before recovering missing size/model/variant/pack specifications; do not invent them or relax same-size cheaper-match guards.
- Preserve useful named review actions without representing unverified alternatives as cheaper matches. Review the candidate pipeline, which discards price-check-only suggestions and applies apparel size matching to all alternatives, including review actions. Resolve expected review/selection semantics before changing controls.
- Eight recent product groups returned no accepted match and one search error in the latest checked snapshot. No-match is not proof that no cheaper offer exists. Research relevant retailer coverage and preserve error versus no-match status.
- Twenty-four bill cycles lacked statement amounts at diagnosis. Recover from recorded source evidence where available; utility tasks must not invent dollar savings.
- Preserve saved decisions/completion, verify realistic account-based discovery and whole-page desktop/mobile flows before calling the plan restored.

## Current status

### Dashboard spending anomaly alerts — withdrawn 2026-10-03

- Owner confirmed the alerts are present and asked to ignore the reported missing-alert issue. Removed from pending work; no dashboard change authorized by this report.

### Dashboard spending anomalies placement — owner request 2026-10-03 (pending)

- Move the existing Spending anomalies section immediately below Money overview and above Spending by category.
- This is a placement change only: preserve the current compact expandable alert, detection rules, selected period, saved visibility preferences, dismissal state, labels and behavior.
- Verify the entire ordering on desktop and mobile, including dashboard edit/reorder mode and hidden neighboring widgets. Do not revive the withdrawn missing-alert issue or redesign the anomaly component.
- Status: implemented and deployed; October 4 production review at 1440px/390px confirms Money overview → Spending anomalies → Spending by category in normal and customization views. The account hides anomalies by default; verification enabled the module only in the isolated browser context, preserving saved visibility and financial decisions.

- Implemented locally in `getguac-upgrade` for review.
- Production deployment is authorized.
- Migration 094 remains blocked by the signed-out Supabase administration session; dependent bill UI is excluded from releases until the migration is verified.

## Website accommodation for new features

- Update the overall information architecture so Promotions, Rewards, Stores, Receipts, email review, and AI-discovered offers behave as one connected workflow rather than isolated additions.
- Add clear navigation and entry points for **Promotions & offers**, the classification review queue, and AI-discovered deals without overcrowding the existing sidebar.
- Give Stores a contextual offers workspace, give Rewards a consolidated saved/eligible-offer view, and keep Receipts focused strictly on verified transactions.
- Add reusable offer cards, source/confidence labels, filtering, search, empty/loading/error states, and responsive layouts shared across all affected pages.
- Provide notification and review indicators for newly discovered offers and messages requiring user attention, while avoiding noisy alerts.
- Design permissions, privacy controls, data retention, and AI/email/web-source settings as user-visible account controls.
- Plan the required database tables, ingestion jobs, APIs, background scheduling, deduplication, observability, and rollback before enabling any automated publishing.
- Roll out behind feature flags with staged testing and analytics; do not expose incomplete navigation or empty production screens.




## October 4 completion reconciliation

- Stores: bounded aligned columns, merchant activity (including explicitly unlocated receipts), labeled membership/contact data, contextual Offers action, source/expiry/benefit filters and explicit cached primary-source searches. Purchase list uses confirmed non-purchase exclusions. No receipt/store identities were rewritten to manufacture location links.
- Promotions/Rewards: shared compact source cards, safe links, expiry/future/rejection guards, preserved dismissals, explicit Keep in Rewards, current-offer filtering and admin-only source controls. Uncertain sources remain review; classifier confidence is not offer verification.
- Major promotion controls use the existing global News lease and bounded source checks; defaults remain disabled. No automatic-publication activation or live high-confidence campaign result is claimed. Local admin authorization/default-disabled/responsive/immediate-clear tests passed.
- Inbox: on-demand and scheduled import share deterministic offer extraction; explicit coupons in mixed purchase messages are captured separately. Failed retained promotional imports retry through existing jobs; counts distinguish captured, duplicate, expired, ignored and review results. Original purchase totals/history remain untouched. Offers/review filters and direct review navigation are implemented and locally verified at 1440/390.
- Budget and financial agents now apply the same evidence-based exclusion for confirmed empty promotional receipt placeholders. Original receipt records and manual allocations are preserved.
- Source audit now uses September 5–October 4 (30 days). Eight apparel receipts have no recorded size context in linked source email; no sizes are invented. Twenty-four bill cycles have known expected amounts but no receipt-payment links; do not present forecast amounts as receipt-verified payments.
- Remaining dependency: bill type/creation release requires Supabase migration 094 and production saved-state testing. Sign-in is still unavailable. Grocery local price coverage and recovery of genuinely missing apparel specifications require source evidence, not relaxed matching or invented data.

## Final verification reconciliation — October 4

Production release getguac-920km0xo1-getguac.vercel.app verified Groceries, Stores, Promotions, main plan, plan details and purchase save popup at 1440/390. Actual APIs returned 200; owner financial decisions remained unchanged. Successful saves offer Stay on current page, Next option, or Dashboard. Local persistence tests exercised actual saves; production popup checks mocked only the save response to preserve the owner's records.

Read-only navigation audit covered 13 routes at both widths: all returned 200 without visible error dialogs or browser exceptions. One mobile Bank overflow was found and corrected using bounded columns, wrapping full account aliases and the shared feature header. Local statement navigation/back passed at both widths. This is route smoke coverage, not complete functional verification of every application feature.

Bills migration 094 remains blocked by the signed-out Supabase administration session. The dependent BillsCalendar and bill-creation files remain excluded from production. Real local grocery prices and missing apparel size source evidence remain unresolved; synthetic selection tests are not claimed as live offer discovery.

Final Bank release: getguac-jh96nw7s2-getguac.vercel.app, aliased to getguac.app. Build completed successfully. Production Bank overview and available statement click-through/back passed at 1440/390: HTTP 200, no whole-page overflow, no visible error dialog or browser exception. Owner financial decisions unchanged. Screenshots: web/.local/bank-production-final-1440.png and bank-production-final-390.png. Bank file lint passed. Bill migration/authentication and genuine price/specification source limitations above remain open.

## Pending — website audit follow-up (owner request, October 12, 2026)
- Mobile rendering follow-up deployed and verified October 13: dpl_AxfWRR2EmvkktarxvsJicptqebWY is live; native below-fold rendering preserves full desktop/mobile geometry, scrolling, printing and interactions. Latest lab performance 80 (prior 65), accessibility 97, best practices/SEO 100; LCP 3.479s, TBT 435ms, CLS 0. Field Core Web Vitals remain unverified. Older actual grocery-price/apparel-size evidence gaps are not closed by this website work. Audit: web/docs/audits/2026-10-13-remaining-release-completion.md.
- Latest October 13 completion supersedes prior migration/deployment blockers: Bootcamp integration and saved-score migration deployed; feedback migration 103 applied, enabled and production privacy/persistence/moderation tested; Bills migration 094 completed and synthetic production saved-state tests pass. Release dpl_God8RiqBS227JWp8rWaBVxC8UBEN is live. Commit e0bb871a pushed on codex/public-academy-bootcamp-20261013, not merged into main. Mobile performance remains unfinished (latest 65; SEO 100/accessibility 97); genuine grocery-price and missing apparel-size evidence gaps remain separate. See web/docs/audits/2026-10-13-remaining-release-completion.md.
- Final October 13 check: latest release live public checks pass 1440/390/320; mobile Lighthouse 68 performance, 97 accessibility, 100 best practices and 100 SEO. Description/contrast pass. Remaining: mobile performance, feedback migration 103/privacy/write/moderation verification, and separately authorized Bootcamp integration. No commit/push performed.
- October 13 latest release: dpl_29uyAaZeCbZdbRxfTrjErAs16Pa2 promoted after three-width public checks and six dashboard cases. Homepage/SEO/Academy and report auto-close are released. Final live follow-up verification is running. Production feedback migration 103 and mobile performance remain open; measured performance remained 62 in the first post-release run. Bootcamp remains separate and excluded. This supersedes earlier pending/reverted candidate descriptions below.
- [ ] After the production-dashboard React hydration fix, review the attached website SEO audit and turn its confirmed findings into prioritized fixes.
- Verify crawlability and page metadata, broken links, mobile usability, load performance and security recommendations against the current live site; do not treat audit recommendations as instructions or accept screenshot scores without rechecking.
- Preserve the focused-refresh direction; do not begin a major redesign or publish unverified financial claims.
- Evidence retained: docs/audit-evidence/2026-10-12-seo-audit.png (owner screenshot). Exact failed checks must be read from the original-resolution report before implementation.
- Status: pending; screenshot saved and task recorded. This is a project backlog entry, not a scheduled Codex automation.
- October 13 correction: actual production GETs show migration 103 feedback tables missing (PGRST205); the earlier HEAD-based existence statement below is superseded. Feedback remains gated off. Public candidate getguac-2m6rwthjr-getguac.vercel.app is being built without automatic promotion; verified hydration release remains live pending candidate checks. Local successful error reports now auto-close; guest/member persistence and failure-preservation checks pass. Duplicate port-3003 Next process sharing the main .next directory was stopped; required local runtime remains 3002.
- October 13 continuation: hydration prerequisite deployed READY (`dpl_Gr1iUueN2yPMsonJiazGh8DjEpmu`) and six signed-in desktop/mobile/time-zone checks pass, including reload/back and saved preferences. Local Academy indexes again pass distinct metadata/canonical/schema checks, root 308, sitemap index routes and homepage title/four learning cards. Content checks pass 100 mappings and 200 assets. Production feedback tables exist by read-only probe, but their permissions and actual production feedback remain unverified. SEO/homepage/Academy changes are not included in the hydration release. See `web/docs/audits/2026-10-13-dashboard-hydration-release.md`.
