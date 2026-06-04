// One-shot: email rdasaradi@gmail.com a tour of the new /preview page
// + everything that's wired today. Run from c:\Money\getguac\web so the
// project's nodemailer install resolves.
//
// === USAGE ===
//   SMTP_HOST=smtp.migadu.com \
//   SMTP_PORT=465 \
//   SMTP_USER=you@getguac.app \
//   SMTP_PASS=<app-password> \
//   FROM_NAME="GetGuac" \
//   node ../scripts/send-preview-email.mjs
//
// For Gmail SMTP instead (if you have 2FA + an app-password):
//   SMTP_HOST=smtp.gmail.com SMTP_PORT=465 SMTP_USER=you@gmail.com SMTP_PASS=<gmail-app-password> ...
//
// The script exits cleanly with `OK <messageId>` on send, or prints
// the SMTP error and exits 1 on failure.

import nodemailer from 'nodemailer'

const HOST = process.env.SMTP_HOST
const PORT = parseInt(process.env.SMTP_PORT || '465', 10)
const USER = process.env.SMTP_USER
const PASS = process.env.SMTP_PASS
const FROM_NAME = process.env.FROM_NAME || 'GetGuac'
const TO = process.env.TO || 'rdasaradi@gmail.com'

if (!HOST || !USER || !PASS) {
  console.error('Set SMTP_HOST + SMTP_USER + SMTP_PASS env vars before running.')
  console.error('See the comment header for examples.')
  process.exit(1)
}

const PREVIEW_URL = 'https://getguac.app/preview'
const DASHBOARD_URL = 'https://getguac.app/dashboard'
const HANDOFF_URL = 'https://github.com/ramsrivatsasa/getguac/blob/main/HANDOFF-2026-06-03.md'

const subject = '🥑 GetGuac preview — new animations + Guac-AI parsing en route'

const html = `
<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; padding: 32px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; width: 72px; height: 72px; border-radius: 22px; background: linear-gradient(135deg, #84cc16, #15803d); line-height: 72px; font-size: 36px;">🥑</div>
        <h1 style="font-size: 28px; font-weight: 900; color: #064e3b; margin: 16px 0 4px;">GetGuac preview</h1>
        <p style="color: #6b7280; font-size: 14px; margin: 0;">2026-06-03 · post autonomous session</p>
      </div>

      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; margin-bottom: 16px;">
        <h2 style="font-size: 16px; font-weight: 800; color: #111827; margin: 0 0 12px;">▶︎ Live preview page</h2>
        <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 12px;">
          A new page at <strong>${PREVIEW_URL}</strong> shows the avocado mascot front-and-center with four trigger buttons. Tap any button to fire the matching animation: <strong>bounce</strong>, <strong>wiggle</strong>, <strong>pulse</strong>, or <strong>celebrate</strong> (with 12-particle confetti). Recent-events log on the page so you can confirm each fired.
        </p>
        <a href="${PREVIEW_URL}" style="display: inline-block; background: linear-gradient(135deg, #10b981, #15803d); color: white; padding: 12px 20px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px;">Open /preview →</a>
      </div>

      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; margin-bottom: 16px;">
        <h2 style="font-size: 16px; font-weight: 800; color: #111827; margin: 0 0 12px;">Wired today</h2>
        <ul style="color: #374151; font-size: 14px; line-height: 1.7; padding-left: 18px; margin: 0;">
          <li><strong>bounce</strong> — receipt save · retailer marked active</li>
          <li><strong>wiggle</strong> — Smashlist mark-as-bought</li>
          <li><strong>celebrate</strong> — Worth-It rating · referral applied · every 7-day Smash days milestone</li>
          <li><strong>idle breathe</strong> — Profile page mascot</li>
        </ul>
      </div>

      <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 16px; padding: 20px; margin-bottom: 16px;">
        <h2 style="font-size: 14px; font-weight: 800; color: #92400e; margin: 0 0 10px;">⏳ Running in the background</h2>
        <p style="color: #78350f; font-size: 13px; line-height: 1.6; margin: 0;">
          A bigger workflow is fanning out across both stacks: full animation system (FadeUpStagger, CountUp, TapScale, ShimmerBox, SlideUp, SuccessPop, ShakeOnError) applied across every screen, plus four Guac-AI parsing extensions — voice-to-receipt, screenshot/online-order parsing, PDF invoice parsing, and an enrichment backfill (smart categorization + anomaly narratives + item tagging). Will land in v0.3.40 when verified.
        </p>
      </div>

      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; margin-bottom: 16px;">
        <h2 style="font-size: 16px; font-weight: 800; color: #111827; margin: 0 0 12px;">Blocked on you</h2>
        <ol style="color: #374151; font-size: 14px; line-height: 1.7; padding-left: 18px; margin: 0;">
          <li>Apply <strong>migration_066</strong> in Supabase (closes the read_usage data-leak)</li>
          <li>Set <strong>CRON_SECRET</strong> on Vercel (matches /api/cron/normalize-stores)</li>
          <li>Sign up for Sentry + PostHog → drop keys into Vercel env</li>
          <li>Order the Mac + Apple Developer account ($99/yr)</li>
          <li>Amazon Associates account → <code>NEXT_PUBLIC_AMAZON_ASSOC_TAG</code></li>
        </ol>
        <p style="margin: 16px 0 0;">
          <a href="${HANDOFF_URL}" style="color: #047857; font-weight: 700; text-decoration: none;">Full punch list → HANDOFF-2026-06-03.md</a>
        </p>
      </div>

      <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px;">
        <a href="${DASHBOARD_URL}" style="color: #6b7280; text-decoration: none;">Dashboard</a>
        &nbsp;·&nbsp;
        <a href="${PREVIEW_URL}" style="color: #6b7280; text-decoration: none;">Preview</a>
        &nbsp;·&nbsp;
        <a href="https://getguac.app/download" style="color: #6b7280; text-decoration: none;">Download v0.3.39 APK</a>
      </p>
    </div>
  </body>
</html>
`

const text = `
GetGuac preview — new animations + Guac-AI parsing en route
2026-06-03

▶︎ Live preview page: ${PREVIEW_URL}

Wired today:
  - bounce   — receipt save · retailer marked active
  - wiggle   — Smashlist mark-as-bought
  - celebrate — Worth-It rate · referral applied · every 7-day Smash days milestone
  - idle breathe — Profile page mascot

Running in the background (lands in v0.3.40):
  - Full animation system (FadeUpStagger, CountUp, TapScale,
    ShimmerBox, SlideUp, SuccessPop, ShakeOnError) across every screen
  - Voice-to-receipt
  - Screenshot / online-order parsing
  - PDF invoice parsing
  - Smart auto-categorization + anomaly narratives + item tagging

Blocked on you:
  1. Apply migration_066 in Supabase
  2. Set CRON_SECRET on Vercel
  3. Sign up for Sentry + PostHog → keys into Vercel env
  4. Order the Mac + Apple Developer account
  5. Amazon Associates → NEXT_PUBLIC_AMAZON_ASSOC_TAG

Full punch list: ${HANDOFF_URL}
`

const transport = nodemailer.createTransport({
  host: HOST,
  port: PORT,
  secure: PORT === 465,
  auth: { user: USER, pass: PASS },
})

try {
  const info = await transport.sendMail({
    from: `"${FROM_NAME}" <${USER}>`,
    to: TO,
    subject,
    text,
    html,
  })
  console.log(`OK ${info.messageId}`)
} catch (e) {
  console.error('Send failed:', e.message)
  process.exit(1)
}
