// Public /terms page — Terms of Service for GetGuac.
// Linked from the register-form checkbox and the footer. Plain-language
// stub written to be editable; treat as the legal baseline, NOT the
// final word — have a lawyer review before any commercial launch.

import Link from 'next/link'
import GuacMascot from '../../components/GuacMascot'
import { FileText, ShieldCheck } from 'lucide-react'

export const metadata = {
  title: 'Terms of Service — GetGuac',
  description: 'The rules of using GetGuac. Plain language; no surprise fees, no buried clauses.',
}

const LAST_UPDATED = 'May 28, 2026'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-lime-50 text-gray-800 font-sans">
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-emerald-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-lime-300 via-emerald-400 to-emerald-700 shadow-md ring-2 ring-white flex items-center justify-center text-lg">🥑</div>
            <div className="leading-none">
              <div className="text-base font-black tracking-tight text-emerald-900">GetGuac</div>
              <div className="text-[9px] text-emerald-600 font-semibold uppercase tracking-wider mt-0.5">Terms of Service</div>
            </div>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/privacy" className="font-semibold text-gray-600 hover:text-emerald-800">Privacy</Link>
            <Link href="/security" className="font-semibold text-gray-600 hover:text-emerald-800">Security</Link>
            <Link href="/login" className="btn-secondary">Sign in</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <section className="flex items-start gap-4 flex-wrap">
          <GuacMascot expression="thumbsup" size={84} />
          <div className="flex-1 min-w-[240px]">
            <h1 className="text-3xl font-black text-emerald-900 tracking-tight">Terms of Service</h1>
            <p className="text-sm text-gray-500 mt-1">Last updated: {LAST_UPDATED}</p>
            <p className="text-sm text-gray-700 mt-3">
              These are the rules for using GetGuac. We've kept them short and in plain English.
              By creating an account you agree to them.
            </p>
          </div>
        </section>

        <Section icon={FileText} title="1. The Account">
          <p>You're at least 13 years old and the information you give us at sign-up (name, email, birth date) is accurate. You're responsible for keeping your password private. If someone gets into your account because you reused a password somewhere that got breached, that's on you — we still help if you tell us.</p>
        </Section>

        <Section icon={FileText} title="2. What GetGuac Does">
          <p>GetGuac helps you track receipts, manage rewards programs, share a household shopping list, and predict when you'll need to buy things again. It is <strong>not</strong> a bank, a tax advisor, or a financial planner. Numbers shown in the app are estimates based on the receipts you give us — verify with the actual merchant before making decisions that depend on exact amounts.</p>
        </Section>

        <Section icon={FileText} title="3. What You Can Do">
          <p>You can use GetGuac for your own personal household finance. You can invite others to your household (limit a small number of people who actually live with you). You can export your own data at any time from your profile.</p>
        </Section>

        <Section icon={FileText} title="4. What You Can't Do">
          <ul className="list-disc ml-5 space-y-1.5">
            <li>Try to read or write to someone else's account.</li>
            <li>Upload receipts that aren't yours (e.g. scraped from someone else).</li>
            <li>Spam other users via the chat or household features.</li>
            <li>Reverse-engineer the prediction engine to scrape product / pricing data.</li>
            <li>Use the API or automated tooling at a rate that affects other users — talk to us if you need higher limits.</li>
          </ul>
        </Section>

        <Section icon={ShieldCheck} title="5. Your Data">
          <p>See the <Link href="/privacy" className="text-emerald-700 font-semibold hover:underline">Privacy Policy</Link> and <Link href="/security" className="text-emerald-700 font-semibold hover:underline">Security page</Link> for specifics on what we store, who can see it, and how to delete it. You own your data; we hold it on your behalf.</p>
        </Section>

        <Section icon={FileText} title="6. Subscriptions & Pricing">
          <p>Today, GetGuac is free. If we add paid features, you'll see the price and what you get before being charged — never auto-upgraded. If we change these terms, we'll tell you at next sign-in and again the first time the change is relevant to you (e.g. if a free feature moves behind a paywall).</p>
        </Section>

        <Section icon={FileText} title="7. Termination">
          <p>You can delete your account and all data at any time from your <Link href="/profile" className="text-emerald-700 font-semibold hover:underline">profile page</Link> — one click, no questions, hard delete in 24 hours. We can terminate accounts that break the rules in section 4, but we'll email you first unless the abuse is severe (e.g. active phishing).</p>
        </Section>

        <Section icon={FileText} title="8. No Warranty (the lawyer part)">
          <p>GetGuac is provided "as-is." We can't guarantee 100% uptime, perfect receipt parsing, or that predictions will match what you actually buy. Use it as a helpful tool, not as the source of truth for any number that matters legally or financially.</p>
        </Section>

        <Section icon={FileText} title="9. Changes to These Terms">
          <p>If we change these terms, we'll post the new version here with a new "last updated" date and notify signed-in users at next sign-in. Continued use after changes means you accept them. If you don't, delete your account — we won't be mad.</p>
        </Section>

        <Section icon={FileText} title="10. Contact">
          <p>Questions? <a href="mailto:hello@getguac.app" className="text-emerald-700 font-semibold hover:underline">hello@getguac.app</a>. We read every email.</p>
        </Section>

        <div className="border-t border-emerald-100 pt-6 text-xs text-gray-500 text-center">
          <p>
            <Link href="/privacy" className="hover:text-emerald-700 font-semibold">Privacy Policy</Link>
            {' · '}
            <Link href="/security" className="hover:text-emerald-700 font-semibold">Security</Link>
            {' · '}
            <Link href="/" className="hover:text-emerald-700 font-semibold">Home</Link>
          </p>
        </div>
      </main>
    </div>
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
