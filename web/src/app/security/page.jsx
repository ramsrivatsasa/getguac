// Public /security page — the single source of truth for what GetGuac
// encrypts, what it can see, and what users control. Linked from the footer
// and from every privacy banner. Written in plain language deliberately:
// hand-wavey "bank-grade security" claims are worse than nothing.

import Link from 'next/link'
import GuacMascot from '../../components/GuacMascot'
import { Shield, Lock, Eye, EyeOff, Database, Mail, Trash2, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react'

export const metadata = {
  title: 'Security & Privacy — GetGuac',
  description: 'Plain-language explanation of how GetGuac protects your data, what we can see, and what you control.',
}

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-lime-50 text-gray-800 font-sans">
      {/* Nav */}
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-emerald-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-lime-300 via-emerald-400 to-emerald-700 shadow-md ring-2 ring-white flex items-center justify-center text-lg">🥑</div>
            <div className="leading-none">
              <div className="text-base font-black tracking-tight text-emerald-900">GetGuac</div>
              <div className="text-[9px] text-emerald-600 font-semibold uppercase tracking-wider mt-0.5">security &amp; privacy</div>
            </div>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/" className="font-semibold text-gray-600 hover:text-emerald-800">Home</Link>
            <Link href="/how-email-works" className="hidden sm:inline font-semibold text-gray-600 hover:text-emerald-800">How email works</Link>
            <Link href="/login" className="btn-secondary">Sign in</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-8">
        <div className="flex items-start gap-5 flex-wrap">
          <GuacMascot expression="angel" size={120} />
          <div className="flex-1 min-w-[260px]">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
              <Shield size={12} /> Plain-language security
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-gray-900 mt-3 leading-tight">
              Here&apos;s exactly what<br />
              <span className="bg-gradient-to-br from-emerald-500 via-lime-500 to-amber-500 bg-clip-text text-transparent">we can &amp; can&apos;t see.</span>
            </h1>
            <p className="text-lg text-gray-600 mt-3 max-w-2xl">
              We don&apos;t use scary marketing words. Below: how data flows, what&apos;s encrypted,
              what isn&apos;t, and the buttons you press to wipe it all.
            </p>
          </div>
        </div>
      </section>

      {/* What we encrypt */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="text-2xl font-extrabold tracking-tight mb-5">What&apos;s encrypted</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Layer
            ok
            icon={Lock}
            title="Everything in transit"
            body="Every byte between your browser/app and our servers is TLS 1.3. Same encryption your bank uses. No exceptions, no fallback."
          />
          <Layer
            ok
            icon={Database}
            title="Everything at rest"
            body="Supabase Postgres encrypts the data files on disk with AES-256. Backups too. If someone steals our hard drive, they get noise."
          />
          <Layer
            ok
            icon={KeyRound}
            title="Your mailbox passwords"
            body="When you claim you@getguac.app, we generate a random password and store it AES-256-GCM-encrypted with a key only our server knows. Even our database admins can't read it."
          />
          <Layer
            ok
            icon={Shield}
            title="Row-Level Security on every table"
            body="Even logged into our own database, we can only fetch your row by impersonating your auth token. No 'admin God-mode' over user data."
          />
          <Layer
            ok
            icon={EyeOff}
            title="Auth cookies"
            body="HttpOnly, Secure, SameSite=Lax. JavaScript can't read them, third-party sites can't replay them, attackers can't steal them via XSS."
          />
          <Layer
            ok
            icon={Lock}
            title="Biometric credentials on mobile"
            body="Your fingerprint / Face ID unlocks credentials stored in Android Keystore — a dedicated hardware enclave on your phone. We never see your biometric data."
          />
        </div>
      </section>

      {/* What we CAN see */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="text-2xl font-extrabold tracking-tight mb-5 flex items-center gap-2">
          <Eye size={22} className="text-amber-600" /> What we <em className="italic">can</em> see
        </h2>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
          <p className="text-sm text-amber-900 mb-4">
            GetGuac is a <strong>Guac-AI personal finance assistant</strong>. The AI has to read your receipts to score them, parse them, and surface insights.
            Anyone claiming &quot;true end-to-end encryption&quot; for an AI assistant is lying or shipping a broken product. Here&apos;s what our servers can actually read:
          </p>
          <ul className="space-y-2 text-sm text-amber-950">
            <li className="flex items-start gap-2"><span className="text-amber-700">•</span> Mail arriving at your <span className="font-mono">@getguac.app</span> inbox — so the in-app Inbox can show it to you and Guac-AI can auto-file <span className="font-mono">+receipts</span> messages. <strong>Opt-out in Profile any time.</strong></li>
            <li className="flex items-start gap-2"><span className="text-amber-700">•</span> The contents of receipts you upload (image, PDF, or email) — our AI parses store, items, totals.</li>
            <li className="flex items-start gap-2"><span className="text-amber-700">•</span> Bank statements you upload — same parser, extracts transactions + fees.</li>
            <li className="flex items-start gap-2"><span className="text-amber-700">•</span> Your sign-in email, name, and any optional profile fields you fill in.</li>
          </ul>
        </div>
      </section>

      {/* What we CAN'T see */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="text-2xl font-extrabold tracking-tight mb-5 flex items-center gap-2">
          <EyeOff size={22} className="text-emerald-600" /> What we <em className="italic">never</em> see
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Layer
            no
            icon={Mail}
            title="Mail from before you signed up"
            body="GetGuac Mail only stores mail received after your inbox was provisioned. Old mail history from other providers is never imported, scanned, or copied."
          />
          <Layer
            no
            icon={KeyRound}
            title="Your password"
            body="Stored only as a salted bcrypt hash by Supabase Auth. Even we can't read it back — that's why password resets need a new password."
          />
          <Layer
            no
            icon={Shield}
            title="Other users' data"
            body="Row-Level Security blocks every cross-user query at the database layer. Not 'we trust our code' — the DB itself refuses."
          />
          <Layer
            no
            icon={Eye}
            title="Your data on someone else's screen"
            body="No data sharing with advertisers, analytics brokers, or third-party marketing. Your guac stays in your bowl."
          />
        </div>
      </section>

      {/* User controls */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="text-2xl font-extrabold tracking-tight mb-5">The kill switches you control</h2>
        <div className="space-y-3">
          <Control
            icon={Trash2}
            title="Delete your account + all data"
            body="One button on your Profile page. We cascade-delete every receipt, statement, mailbox message, alias claim, and your auth record. Backups roll off in 30 days."
            cta="Profile → Delete account"
            href="/profile"
          />
          <Control
            icon={Mail}
            title="Pause inbox processing"
            body="A single toggle in Profile → Email settings turns off the poller. We stop reading your inbox until you turn it back on. Your mailbox itself keeps working — you just lose the in-app Inbox + auto-receipt parsing."
            cta="Profile → Email settings"
            href="/profile"
          />
          <Control
            icon={Database}
            title="Export everything"
            body="Download a complete JSON dump of your data. Take it elsewhere or just keep a copy."
            cta="Profile → Export data"
            href="/profile"
          />
        </div>
      </section>

      {/* Honest list of "could be better" */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="text-2xl font-extrabold tracking-tight mb-5 flex items-center gap-2">
          <AlertCircle size={22} className="text-rose-600" /> Things we&apos;re working on
        </h2>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 space-y-3 text-sm text-rose-950">
          <p><strong>Vault feature (planned)</strong> — A true end-to-end-encrypted notes section for things AI doesn&apos;t need to read (passport numbers, account numbers, recovery codes). Key derived from your password — losing it means losing the data.</p>
          <p><strong>Per-field encryption (in progress)</strong> — High-sensitivity columns like alternative email and mobile number being moved to AES-GCM encryption so even our DB doesn&apos;t see the plaintext.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-emerald-100 bg-white/60 mt-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="text-base">🥑</span>
            <span className="font-bold text-emerald-900">GetGuac</span>
            <span>— your money&apos;s wingman</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-emerald-800">Home</Link>
            <Link href="/how-email-works" className="hover:text-emerald-800">How email works</Link>
            <Link href="/login" className="hover:text-emerald-800">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Layer({ icon: Icon, title, body, ok, no }) {
  const accent = ok ? 'emerald' : no ? 'emerald' : 'gray'
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl bg-${accent}-100 text-${accent}-700 flex items-center justify-center shrink-0`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900">{title}</h3>
            {ok && <CheckCircle2 size={14} className="text-emerald-600" />}
            {no && <EyeOff size={14} className="text-emerald-600" />}
          </div>
          <p className="text-sm text-gray-600 mt-1 leading-snug">{body}</p>
        </div>
      </div>
    </div>
  )
}

function Control({ icon: Icon, title, body, cta, href }) {
  return (
    <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-emerald-900">{title}</h3>
          <p className="text-sm text-emerald-950/80 mt-1 leading-snug">{body}</p>
          <Link href={href} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 mt-2">
            {cta} →
          </Link>
        </div>
      </div>
    </div>
  )
}
