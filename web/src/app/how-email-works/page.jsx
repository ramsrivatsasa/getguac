// Public /how-email-works page — explains the @getguac.app + +receipts pattern,
// what to forward, what stays untouched, and how the AI parsing works.

import Link from 'next/link'
import GuacMascot from '../../components/GuacMascot'
import { Mail, Inbox, Forward, Sparkles, ShieldOff, ShoppingBag, Clock, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'How GetGuac email works — your free @getguac.app inbox',
  description: 'Use you@getguac.app for online shopping signups, you+receipts@getguac.app for auto-receipt processing. Personal mail stays untouched.',
}

export default function HowEmailWorksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-lime-50 text-gray-800 font-sans">
      {/* Nav */}
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-emerald-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-lime-300 via-emerald-400 to-emerald-700 shadow-md ring-2 ring-white flex items-center justify-center text-lg">🥑</div>
            <div className="leading-none">
              <div className="text-base font-black tracking-tight text-emerald-900">GetGuac</div>
              <div className="text-[9px] text-emerald-600 font-semibold uppercase tracking-wider mt-0.5">how email works</div>
            </div>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/" className="font-semibold text-gray-600 hover:text-emerald-800">Home</Link>
            <Link href="/security" className="hidden sm:inline font-semibold text-gray-600 hover:text-emerald-800">Security</Link>
            <Link href="/register" className="btn-primary">Get started</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-8">
        <div className="flex items-start gap-5 flex-wrap">
          <GuacMascot expression="eating" size={120} />
          <div className="flex-1 min-w-[260px]">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
              <Mail size={12} /> @getguac.app email
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-gray-900 mt-3 leading-tight">
              Two addresses.<br />
              <span className="bg-gradient-to-br from-emerald-500 via-lime-500 to-amber-500 bg-clip-text text-transparent">One smart inbox.</span>
            </h1>
            <p className="text-lg text-gray-600 mt-3 max-w-2xl">
              Every GetGuac account comes with a free email at <span className="font-mono">@getguac.app</span>.
              Use it for merchant signups, store loyalty, online shopping — then let Guac-AI auto-file your receipts.
            </p>
          </div>
        </div>
      </section>

      {/* The two addresses */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid md:grid-cols-2 gap-5">
          <div className="rounded-3xl border-2 border-emerald-200 bg-white p-6 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mb-3">
              <Inbox size={24} className="text-emerald-700" />
            </div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">Personal</p>
            <p className="font-mono text-lg font-black text-emerald-900 mt-1">you@getguac.app</p>
            <p className="text-sm text-gray-700 mt-3 leading-relaxed">
              Your free mailbox. Read &amp; reply right inside GetGuac at <Link href="/inbox" className="font-semibold text-emerald-700 hover:underline">/inbox</Link>.
              We surface your mail in-app so you never have to juggle a separate webmail tab.
              <strong className="text-emerald-700"> You can pause this in Profile → Email settings any time.</strong>
            </p>
            <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5"><EyeOff size={11} /> One-click opt-out · One-click delete-all</p>
          </div>

          <div className="rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-amber-50/70 to-yellow-50/70 p-6 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mb-3">
              <Sparkles size={24} className="text-amber-700" />
            </div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-amber-700">Auto-process</p>
            <p className="font-mono text-lg font-black text-amber-900 mt-1">you+receipts@getguac.app</p>
            <p className="text-sm text-gray-700 mt-3 leading-relaxed">
              The magic address. Any email landing here is read by Guac-AI, parsed for store + items + total,
              and filed into your <Link href="/receipts" className="font-semibold text-amber-800 hover:underline">Receipts</Link> within 10 minutes.
            </p>
            <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5"><Clock size={11} /> Auto-processed · &lt;10 min latency</p>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Both addresses land in the <strong>same</strong> mailbox — GetGuac Mail&apos;s plus-addressing routes <span className="font-mono">+receipts</span> through the same inbox.
          GetGuac filters by the <span className="font-mono">Delivered-To</span> header so it only processes mail addressed to the receipts hook.
        </p>
      </section>

      {/* When to use which */}
      <section className="bg-white border-y border-emerald-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center mb-8">
            When to use each address
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <UseCase
              header="Use you@getguac.app"
              tone="emerald"
              cases={[
                { icon: ShoppingBag, label: 'Merchant accounts (Amazon, Walmart, Target)', body: 'Sign up using your @getguac.app address — order confirmations land in your inbox.' },
                { icon: Mail,        label: 'Store loyalty + rewards programs',           body: 'Promotional offers, points statements, expiry alerts — kept private.' },
                { icon: Forward,     label: 'Subscriptions + recurring services',         body: 'Netflix, Spotify, gym, anything. One address, easy to track.' },
                { icon: ShieldOff,   label: 'Anywhere you don\'t want to give your real email', body: 'A working email that\'s yours — not your personal Gmail.' },
              ]}
            />
            <UseCase
              header="Forward to you+receipts@getguac.app"
              tone="amber"
              cases={[
                { icon: Sparkles, label: 'Order confirmations from any merchant',     body: 'Amazon, Walmart, Best Buy, restaurants — forward and the AI files it.' },
                { icon: Mail,     label: 'E-receipts that landed in your real Gmail', body: 'Forward old receipts you want tracked. One-time effort, lifetime stored.' },
                { icon: Forward,  label: 'PDF bank statements via email',             body: 'Forward your card statement and Guac-AI extracts transactions + fees.' },
                { icon: CheckCircle2, label: 'Auto-forward rules in Gmail/Outlook',  body: '"Subject contains: order confirmation → Forward to you+receipts@". Set once.' },
              ]}
            />
          </div>
        </div>
      </section>

      {/* The privacy promise */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-lime-50 p-8 sm:p-10">
          <div className="flex items-start gap-5 flex-wrap">
            <GuacMascot expression="angel" size={100} />
            <div className="flex-1 min-w-[240px]">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-emerald-900 tracking-tight">
                The privacy promise, in three lines
              </h2>
              <ul className="mt-4 space-y-2 text-emerald-950">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                  <span><strong>Inbox processing is an opt-in service.</strong> Toggle it off in Profile → Email settings and we stop fetching mail. Your mailbox keeps working for send/receive; we just stop syncing it into the app.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                  <span><strong>Auto-parse is limited to <span className="font-mono">+receipts</span>.</strong> Only mail sent to your <span className="font-mono">+receipts</span> address is auto-filed as a receipt. Everything else just sits in your Inbox.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                  <span><strong>You can wipe everything in one click.</strong> Profile → Delete account. Mailbox, messages, parsed receipts, alias — all gone, no copies kept.</span>
                </li>
              </ul>
              <Link href="/security" className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-900 mt-4">
                Full security breakdown <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it actually works */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center mb-8">
          From signup to insights — the full email journey
        </h2>
        <ol className="space-y-3">
          {[
            { n: '1', t: 'Claim your handle at signup', b: 'Pick a username (e.g. alex). You get alex@getguac.app + alex+receipts@getguac.app provisioned the moment you sign up — yours forever, no extra setup.' },
            { n: '2', t: 'Use the address everywhere',  b: 'Sign up for Amazon, Walmart, Target, loyalty programs — anywhere you don\'t want to give out your real Gmail. Order confirmations land in your @getguac.app inbox.' },
            { n: '3', t: 'Forward to +receipts',        b: 'Set one auto-forward rule in Gmail/Outlook: "subject contains: order confirmation → forward to alex+receipts@getguac.app". Or hit Forward on individual emails as they come in.' },
            { n: '4', t: 'Email arrives at your GetGuac Mail inbox', b: 'Mail sent to your address lands in your GetGuac mailbox — hosted in a privacy-first data centre in Europe. The Delivered-To header is preserved so we know whether it was the bare address or +receipts.' },
            { n: '5', t: 'Guac-AI poller picks it up',  b: 'Every 10 minutes our cron job logs in via encrypted IMAP, fetches new messages, and filters for the +receipts tag. Personal mail is skipped.' },
            { n: '6', t: 'AI extracts the receipt',     b: 'Store name, line items, total, taxes, payment method — all parsed and saved to your Receipts table. The original message stays in your mailbox.' },
            { n: '7', t: 'Shows up in your Receipts feed', b: 'You see the receipt within 10 minutes. Tap to edit, rate it, or assign a category. The AI gets sharper with every receipt you process.' },
          ].map(s => (
            <li key={s.n} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex items-start gap-4">
              <span className="text-3xl font-black text-emerald-300 select-none w-10 shrink-0">{s.n}</span>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900">{s.t}</h3>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{s.b}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Ready for a smarter inbox?
        </h2>
        <p className="text-gray-600 mt-3">
          Every new account gets a free <span className="font-mono">@getguac.app</span> address — no extra setup.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-5">
          <Link href="/register" className="btn-primary text-base px-6 py-3">
            <span className="text-lg">🥑</span> Claim your handle <ArrowRight size={16} />
          </Link>
          <Link href="/security" className="btn-secondary text-base px-6 py-3">Security details</Link>
        </div>
      </section>

      <footer className="border-t border-emerald-100 bg-white/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="text-base">🥑</span>
            <span className="font-bold text-emerald-900">GetGuac</span>
            <span>— your money&apos;s wingman</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-emerald-800">Home</Link>
            <Link href="/security" className="hover:text-emerald-800">Security</Link>
            <Link href="/login" className="hover:text-emerald-800">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function UseCase({ header, cases, tone }) {
  const isEmerald = tone === 'emerald'
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider font-bold mb-3 text-gray-500">{header}</p>
      <div className="space-y-2.5">
        {cases.map(c => (
          <div key={c.label} className={`rounded-xl border border-gray-100 bg-white p-3 shadow-sm flex items-start gap-3`}>
            <div className={`w-9 h-9 rounded-lg ${isEmerald ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} flex items-center justify-center shrink-0`}>
              <c.icon size={16} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-gray-900 leading-tight">{c.label}</p>
              <p className="text-xs text-gray-600 mt-0.5 leading-snug">{c.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
