import MarketingHero from '../../components/MarketingHero'
// Public /how-email-works page — explains the @getguac.app + +receipts pattern,
// what to forward, what stays untouched, and how the AI parsing works.

import Link from 'next/link'
import GuacMascot from '../../components/GuacMascot'
import MarketingShell from '../../components/MarketingShell'
import { Mail, Inbox, Forward, Sparkles, ShieldOff, ShoppingBag, Clock, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react'
import StageMarker from '../../components/StageMarker'
import ConversionBand from '../../components/ConversionBand'
import ReceiptFlow from '../../components/ReceiptFlow'

export const metadata = {
  title: 'How GetGuac email works — your free @getguac.app inbox',
  description: 'Use you@getguac.app for online shopping signups, you+g@getguac.app for auto-receipt processing. Personal mail stays untouched.',
  // Self-canonical. Without this the page INHERITS the root layout's
  // alternates and declares itself a duplicate of the homepage.
  alternates: { canonical: '/how-email-works' },
}

export default function HowEmailWorksPage() {
  return (
    <MarketingShell subtitle="how email works">
      {/* Hero */}
      <MarketingHero eyebrow="GetGuac email" title="Two addresses." accent="One smart inbox." description="Keep shopping messages together and send receipt emails for processing. Review the extracted details against the original." imageSrc="/home/story-people/capture-blonde-produce-v1-768.webp" imageAlt="A shopper keeping a purchase record on her phone" />
      <StageMarker active="capture" />

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
              Your free mailbox. Read &amp; reply right inside GetGuac at <Link href="/inbox" className="inline-flex min-h-11 items-center font-semibold text-emerald-700 hover:underline">/inbox</Link>.
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
            <p className="font-mono text-lg font-black text-amber-900 mt-1">you+g@getguac.app</p>
            <p className="text-sm text-gray-700 mt-3 leading-relaxed">
              The magic address. Any email landing here is read by Guac-AI, parsed for store + items + total,
              and filed into your <Link href="/receipts" className="inline-flex min-h-11 items-center font-semibold text-amber-800 hover:underline">Receipts</Link> within 10 minutes.
            </p>
            <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5"><Clock size={11} /> Auto-processed · &lt;10 min latency</p>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Both addresses land in the <strong>same</strong> mailbox — GetGuac Mail&apos;s plus-addressing routes <span className="font-mono">+g</span> through the same inbox.
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
              header="Forward to you+g@getguac.app"
              tone="amber"
              cases={[
                { icon: Sparkles, label: 'Order confirmations from any merchant',     body: 'Amazon, Walmart, Best Buy, restaurants — forward and the AI files it.' },
                { icon: Mail,     label: 'E-receipts that landed in your real Gmail', body: 'Forward old receipts you want tracked. One-time effort, lifetime stored.' },
                { icon: Forward,  label: 'PDF bank statements via email',             body: 'Forward your card statement and Guac-AI extracts transactions + fees.' },
                { icon: CheckCircle2, label: 'Auto-forward rules in Gmail/Outlook',  body: '"Subject contains: order confirmation → Forward to you+g@getguac.app". Set once.' },
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
                  <span><strong>Auto-parse is limited to <span className="font-mono">+g</span>.</strong> Only mail sent to your <span className="font-mono">+g</span> address is auto-filed as a receipt. Everything else just sits in your Inbox.</span>
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

      {/* Approved receipt workflow: one reusable cycle with real product proof. */}
      <section id="receipt-cycle" className="max-w-6xl mx-auto scroll-mt-24 py-12">
        <ReceiptFlow
          heading="Every receipt makes the next trip smarter."
          blurb="Photo and email receipts become searchable purchase memory, then help every stage that follows."
          href="/how-it-works"
          linkLabel="See the complete GetGuac journey"
          demoHref="/join?try=receipt"
        />
      </section>

      <ConversionBand eyebrow="Capture email receipts without the clutter" title="Claim your free GetGuac address." description="Forward real receipts to your personal GetGuac address. Promotions stay promotions instead of becoming $0 receipts." secondaryHref="/security" secondaryLabel="Read the security details" />
    </MarketingShell>
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
