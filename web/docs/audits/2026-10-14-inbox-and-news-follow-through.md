# Inbox recovery and News requirements — October 14, 2026

## Inbox incident

GitHub health run 38625282600 returned HTTP 503. All 12 provisioned mailboxes had a last successful poll approximately 202 minutes earlier, with zero consecutive authentication failures. GitHub's poll runs were roughly four to five hours apart despite the ten-minute cron expression. The endpoint also reported missing ALERT_SMTP_PASS. Repository secret-name inventory confirms only APP_URL and CRON_SECRET are configured.

Manual poll run 38633347660 succeeded. Subsequent health run 38633558821 succeeded. This is recovery evidence, not proof of a repaired automatic cadence.

The focused code change enables the existing poll and health endpoints to accept Vercel bearer cron authentication as well as the existing GitHub header; both refuse missing or incorrect secrets. GET delegates to the same pipeline as POST. Existing message claims, receipt decisions, original mail polling and health jobs are retained. Vercel scheduling invokes these existing endpoints; no separate Inbox agent is added. The health endpoint continues to report unhealthy state rather than concealing missing alert credentials.

Acceptance: production build; unauthorized GET/POST rejection; valid existing GitHub calls; independent Vercel automatic poll observed after promotion; fresh per-mailbox heartbeat; backup SMTP configured in both locations and verified without exposing credentials. No routine-user UI redesign is part of this fix.

Missing dependency: the dedicated alert-mailbox password. The owner was asked to configure ALERT_SMTP_PASS in GitHub and Vercel securely, rather than paste it into chat. Creating or rotating credentials is not inferred authorization.

## Deployed verification

Deployment dpl_766R33E5QzCoiRAK4hN7zcPTqpeU / getguac-fqwmsgxyb-getguac.vercel.app built successfully from the existing verified release checkout and was promoted to getguac.app. The homepage serves this deployment ID and returns HTTP 200. Candidate app/database health returns HTTP 200 with Supabase ok. Candidate and live anonymous poll/health GETs return HTTP 401. GitHub poll run 38634064968 succeeds against the promoted deployment; Vercel request records show its POST returning HTTP 200.

Focused lint passes without warnings/errors. Cron authentication tests pass for Vercel bearer and GitHub custom headers, rejecting missing/incorrect credentials. Four message-claim tests, eighteen background Inbox tests, Inbox presentation, email classification and promotional-import regression checks pass. Existing receipt processing remains protected by durable user-scoped claims. Only the two endpoints, shared authentication helper, Vercel schedule and test were included in this release; no unrelated dirty files were deployed.

Automatic Vercel cadence is awaiting observation. SMTP is absent in both the production environment inventory and GitHub secret-name list. CLI environment pulls redact sensitive values, so they were not treated as usable credentials or disclosed. This release does not establish email-alert delivery, News feature completion, native app release, or all-project completion.

## Later operational verification

Vercel request records confirm automatic GET /api/email/poll calls with user agent vercel-cron/1.0 returning HTTP 200 at 21:00:25 and 21:10:25 UTC (5:00 and 5:10 p.m. Eastern). This supersedes the pending automatic-cadence note above: the ten-minute automatic schedule was independently observed.

The owner supplied a mailbox password and confirmed it belongs to noreply@getguac.app. Two SMTP verification attempts returned EAUTH / 454 with the provider response “temporary authentication failure: please try again later.” No email was sent and no secret was installed. This does not prove the password is incorrect. Credentials were held in process memory, not written into the audit, scripts or command arguments. Backup-alert readiness remains blocked by SMTP authentication.

The owner also reported no subscribers and supplied advertising metrics: 903 link clicks and 434 landing-page views (approximately 48%). These show traffic, not account creation or payment conversion. Clarification requested on whether “subscribers” means new accounts or paying subscribers. Billing implementation remains deferred; no advertising spend, campaign status or account credentials were changed.

## News scope confirmed by owner in this chat

- Public visitors can browse News without login. Preserve signed-in navigation and private records. Public navigation needs a News entry.
- News alerts belong in notifications. No every-minute notifications.
- Provide Off, Daily digest, Weekly digest and Important updates only frequency options. Separate important recall/safety behavior and opt-in push.
- Add major-company earnings and related company news; personalize the company scope using saved watchlists only when signed in.
- Show sourced, dated expected EPS and revenue, reporting quarter/date and reported results versus estimates. Consensus estimates are not price targets or promises. Missing values remain missing.
- Retain factual stock/ETF reporting and the existing prohibition on investment recommendations.

Current inspection: /news lives under the authenticated dashboard layout, although /api/economic-news supports anonymous access. Notification preferences exist in profiles.notification_prefs; frequency strings are not currently accepted by that API. Notifications currently cover purchase alerts and other established categories. Earnings consensus data integration and its production credentials are not yet verified. These requirements are not implemented or deployed by the Inbox patch.

Design acceptance: reuse existing News, public navigation and notification settings; review control scope first; keep compact tables/cards, readable wrapping and direct dated sources. Check guest access, signed-in watchlist isolation, back navigation, notification deduplication and actual desktop/mobile rendering before declaring complete. No invented earnings, rankings, savings or “all fixes complete” claim.

## Marketing scope

Requested Gemini/Grok/OpenAI wording is saved in marketing-assets/AI_DESCRIPTION_COPY_2026-10-14.md. Owner subsequently deferred implementation. No unsupported provider claim has been published. Store/ad sessions are signed in; subscriptions remain deferred. This remains separate from the Inbox recovery.
