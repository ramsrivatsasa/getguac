// Public /privacy page — Privacy Policy. Linked from the register-form
// checkbox, the footer, and every PrivacyNote banner. Companion to
// /security (which covers the technical side) and /terms (which covers
// the legal contract). Plain-language stub written to be editable; have
// a lawyer review before any commercial launch.

import Link from 'next/link'
import GuacMascot from '../../components/GuacMascot'
import MarketingShell from '../../components/MarketingShell'
import { Lock, Eye, EyeOff, Database, Trash2, ShieldCheck, Mail } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy — GetGuac',
  description: 'What GetGuac collects, what it can see, who else can see it, and how to delete it. Plain language.',
}

const LAST_UPDATED = 'June 3, 2026'

export default function PrivacyPage() {
  return (
    <MarketingShell subtitle="privacy policy">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <section className="flex items-start gap-4 flex-wrap">
          <GuacMascot expression="angel" size={84} />
          <div className="flex-1 min-w-[240px]">
            <h1 className="text-3xl font-black text-emerald-900 tracking-tight">Privacy Policy</h1>
            <p className="text-sm text-gray-500 mt-1">Last updated: {LAST_UPDATED}</p>
            <p className="text-sm text-gray-700 mt-3">
              GetGuac is built so your receipts and spending stay private to you.
              Below is exactly what we collect, who else can see it, and how
              to take it back.
            </p>
          </div>
        </section>

        <Section icon={Database} title="1. What We Collect">
          <ul className="list-disc ml-5 space-y-1.5">
            <li><strong>Account basics</strong> — username, email, hashed password (never the plain password), birth date, and optional fields like phone number you choose to add.</li>
            <li><strong>Receipts you give us</strong> — the photo or email, the parsed items, totals, dates, store names, and any tags / categories you assign.</li>
            <li><strong>Rewards & memberships</strong> — only what's printed on receipts you upload, plus loyalty numbers you enter yourself.</li>
            <li><strong>Household + chat</strong> — when you create or join a household, the membership record + chat messages you send.</li>
            <li><strong>Usage data</strong> — basic logs (which API endpoint, response time, error counts) tied to your account, kept 30 days for debugging and abuse prevention.</li>
          </ul>
          <p className="mt-2 text-xs text-gray-500">We do NOT collect: bank credentials, social-security numbers, biometrics, your contacts, your location (beyond a receipt's store address), or your browsing history outside GetGuac.</p>
        </Section>

        <Section icon={Eye} title="2. Who Can See What">
          <ul className="list-disc ml-5 space-y-1.5">
            <li><strong>You</strong> see all of it.</li>
            <li><strong>Your household members</strong> see only: the shared shopping list rows you mark as shared, the household chat messages, and other members' display names. They do <strong>not</strong> see your receipts, rewards, totals, categories, or any analytics.</li>
            <li><strong>Other GetGuac users</strong> can find you by email to start a 1:1 chat — same disclosure surface as a password reset. They cannot see any of your data unless you send them a message.</li>
            <li><strong>GetGuac employees</strong> — only on-call engineers, only when investigating a specific issue you reported, only the minimum needed to fix it. Every read is logged.</li>
            <li><strong>Nobody else.</strong> We don't sell data. We don't share it with advertisers. We don't train external AI models on your receipts.</li>
          </ul>
        </Section>

        <Section icon={Lock} title="3. How It's Protected">
          <p>Database rows are protected by per-user Row Level Security — even a bug in our application code can't return one user's receipts to another. Connections are HTTPS-only. Passwords are hashed with bcrypt. Storage URLs (the actual receipt photos) are time-limited and signed.</p>
          <p>The <Link href="/security" className="text-emerald-700 font-semibold hover:underline">Security page</Link> has the technical breakdown — what's encrypted, what RLS policies exist, what we audit-log.</p>
        </Section>

        <Section icon={Mail} title="4. Email & Notifications">
          <p>We email you for: account confirmation, password reset, security alerts (e.g. new sign-in from a new device), and household invites. Marketing emails are off by default. You can disable everything except security alerts from your profile page.</p>
          <p>The free <span className="font-mono">@getguac.app</span> address that comes with your username is for receiving merchant receipts. We parse incoming messages to extract receipts; we do not read message bodies for any other purpose, and we don't send anything from your address without your explicit action.</p>
        </Section>

        <Section icon={ShieldCheck} title="5. Retailer Connections (Beta)">
          <p>If you choose to <strong>link a retailer account</strong> (Connections page → "Link account"), you sign into that retailer's own website inside an isolated browser session on your device. <strong>We never see your credentials.</strong> Username and password are typed into the retailer's own HTML form, on the retailer's own origin.</p>
          <p>What we do see, only after you've signed in and only on the retailer's order-history page: the order metadata our extractor reads (store name, date, total, line items). We store these as receipts in your account, the same way email-forwarded receipts are stored.</p>
          <p>The browser session — including any auth cookies the retailer set — is <strong>discarded when you close the linking screen</strong>. We don't store passwords, tokens, or any persistent credential. To pull receipts again later, you sign in again.</p>
          <p>This feature is <strong>in beta</strong> and may break without notice. Some retailers' Terms of Service prohibit automated access to their sites; by using this feature you accept that risk. If a retailer requests that we disable a linker, we will do so promptly.</p>
        </Section>

        <Section icon={Trash2} title="6. Deleting Your Data">
          <p>You can delete your entire account from your <Link href="/profile" className="text-emerald-700 font-semibold hover:underline">profile page</Link>. One click. Hard delete in 24 hours. Backups age out within 30 days.</p>
          <p>You can also delete individual receipts, rewards, household memberships, and chat messages at any time — those deletes are immediate.</p>
        </Section>

        <Section icon={ShieldCheck} title="7. Your Rights">
          <p>If you're in the EU/UK/California or another jurisdiction with data-protection laws, you can request: a copy of your data, correction of inaccurate data, deletion, or a portable export. Most of this is already self-serve in the app (profile → export / delete). For anything else, email us.</p>
          <p>We respond within 30 days. We don't charge for these requests.</p>
        </Section>

        <Section icon={Database} title="8. Cookies & Tracking">
          <p>We use exactly one cookie: your sign-in session. No analytics cookies, no advertising pixels, no cross-site trackers. The few server-side analytics we collect (page-view counts, error rates) are aggregated and not tied to your identity in the dashboards we look at.</p>
        </Section>

        <Section icon={ShieldCheck} title="9. Third Parties We Use">
          <ul className="list-disc ml-5 space-y-1.5">
            <li><strong>Supabase</strong> — our database + auth + storage host. They cannot read your row-level-security-protected data; they hold the encrypted-at-rest copy.</li>
            <li><strong>Google Gemini / Groq</strong> — receipt parsing. Only the receipt photo + text is sent, no account identifiers, and Anthropic's <em>and</em> Google's terms forbid them from training on this data.</li>
            <li><strong>Vercel</strong> — runtime hosting + CDN. They see request metadata, not response bodies.</li>
            <li><strong>Sentry</strong> — crash + error reporting. We send the error stack and a coarse user identifier (so a single user's repeated crashes group together). No receipt content, no balances.</li>
            <li><strong>PostHog</strong> — behavioral analytics. We send screen-view events and product-action events (e.g. "smashed a list item"). No receipt content, no PII beyond the user ID.</li>
          </ul>
        </Section>

        <Section icon={Mail} title="10. Children">
          <p>GetGuac is not directed at children under 13. If we learn we have a sub-13 account, we delete it.</p>
        </Section>

        <Section icon={ShieldCheck} title="11. Changes to This Policy">
          <p>If we change what we collect, who can see it, or how it's protected, we'll post the new policy here with a new "last updated" date and email you before the change takes effect for any data we already hold.</p>
        </Section>

        <Section icon={Mail} title="12. Contact">
          <p>Privacy questions go to <a href="mailto:privacy@getguac.app" className="text-emerald-700 font-semibold hover:underline">privacy@getguac.app</a>. Security reports (please) to <a href="mailto:security@getguac.app" className="text-emerald-700 font-semibold hover:underline">security@getguac.app</a>.</p>
        </Section>

        <div className="border-t border-emerald-100 pt-6 text-xs text-gray-500 text-center">
          <p>
            <Link href="/terms" className="hover:text-emerald-700 font-semibold">Terms of Service</Link>
            {' · '}
            <Link href="/security" className="hover:text-emerald-700 font-semibold">Security</Link>
            {' · '}
            <Link href="/" className="hover:text-emerald-700 font-semibold">Home</Link>
          </p>
        </div>
      </div>
    </MarketingShell>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold text-emerald-900 mb-2">
        <Icon size={18} className="text-emerald-600" />
        {title}
      </h2>
      <div className="text-sm text-gray-700 leading-relaxed space-y-2">{children}</div>
    </section>
  )
}
