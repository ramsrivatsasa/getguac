import Link from 'next/link'
import MarketingShell from '../../components/MarketingShell'
import ReceiptCircle from '../../components/ReceiptCircle'

// The get-started guide — the one long page that takes someone from "I just
// heard of this" to "it is running on its own".
//
// 🔒 EVERY STEP IS A REAL, SHIPPED SURFACE, CHECKED IN THE CODE:
//   step 1  /join?try=receipt — the anonymous trial, parse-only, stores nothing
//   step 2  /register
//   step 3  inbox connection — opt-in, and /how-email-works documents it
//   step 4  automatic categories from parse-receipt-engine.js line items
//   step 5  /reports — includes the recurring-charge detector (3+ similar
//           charges at a similar interval) and duplicate detection
//   step 6  /bills calendar
//   step 7  return windows from refund_policies on the parsed receipt
// Nothing here promises budgets, account balances or net worth. GetGuac has no
// bank linking, and this page must not imply otherwise.

export const metadata = {
  title: 'The get-started guide — GetGuac in seven steps',
  description:
    'From your first receipt to a system that runs itself. A practical, step-by-step guide to setting up GetGuac — what to do first, what to skip, and what good looks like after a month.',
  alternates: { canonical: '/get-started' },
}

const DISPLAY = { fontFamily: 'var(--font-bricolage), sans-serif' }

// 🔴 ASCII ONLY, FLAT SELECTORS, NO COMMENTS INSIDE THIS STRING. React escapes
// the text children of a style element, so anything else is both a hydration
// mismatch and invalid CSS on the server render.
// scripts/check-style-blocks.mjs enforces this.
const GS_CSS = `
.gs-step { border-radius: 16px; background: #fff; padding: 20px; box-shadow: 0 0 0 1px rgba(16,40,26,.10); }
.gs-step-shot { display: grid; grid-template-columns: 1fr .92fr; align-items: center; gap: 28px; }
.gs-shot { width: 100%; border-radius: 12px; border: 1px solid #E4EDE4; box-shadow: 0 20px 44px -30px rgba(16,40,26,.55); display: block; background: #fff; }
.gs-shot-phone { width: 62%; margin: 0 auto; border-radius: 20px; }
@media (max-width: 860px) {
  .gs-step-shot { grid-template-columns: 1fr; gap: 18px; }
  .gs-shot-phone { width: 54%; }
}
`

const STEPS = [
  {
    n: '01',
    shot: { src: '/home/goals/phone-guac-ai.webp', phone: true, alt: 'A photographed receipt parsed by Guac-AI, showing the store, date, tax and every line item' },
    mins: '1 min',
    head: 'Scan one receipt before you commit to anything',
    body: 'Do not start by creating an account. Start by finding out whether this works on your receipts. Photograph one on the landing page and watch it come back with the store, the date, the tax and every line item.',
    why: 'You learn in a minute whether the parsing handles the shops you actually use. Nothing is stored and no account is created.',
    cta: { href: '/join?try=receipt', label: '📷 Try 1 receipt' },
  },
  {
    n: '02',
    mins: '2 min',
    head: 'Create the account',
    body: 'Sign up with Google, or with an email address and a handle. The handle becomes your sign-in name and your free @getguac.app address, which matters in step three.',
    why: 'Until now nothing was saved. From here your receipts persist, build history, and start being comparable month to month.',
    cta: { href: '/register', label: 'Create a free account' },
  },
  {
    n: '03',
    shot: { src: '/home/goals/web-receipts.webp', alt: 'The GetGuac receipts list filling up on its own from forwarded email receipts' },
    mins: '5 min',
    head: 'Turn on the inbox so receipts arrive without you',
    body: 'Most receipts are already emailed to you. Connecting your inbox — or using your new @getguac.app address at checkout — means those arrive and get read automatically, without you photographing anything.',
    why: 'This is the step that turns GetGuac from a thing you remember to do into a thing that happens on its own. It is also the step most people skip and later wish they had not.',
    cta: { href: '/how-email-works', label: 'How the inbox works' },
    note: 'Opt-in, and reversible. You can turn it off in Profile and reading stops.',
  },
  {
    n: '04',
    shot: { src: '/home/goals/web-organized.webp', alt: 'Spending sorted into categories by line item rather than by merchant' },
    mins: 'automatic',
    head: 'Let a couple of weeks of categories build',
    body: 'Purchases sort themselves by line item, not by merchant. That is the difference between knowing you spent $186 at a supermarket and knowing what was actually in the basket.',
    why: 'One receipt is a record. Three weeks of receipts is a description of how you live — and that is the thing you can act on.',
    cta: { href: '/resources#goals', label: 'See what that looks like' },
  },
  {
    n: '05',
    shot: { src: '/home/goals/web-subs.webp', alt: 'The recurring-charge list, with each subscription and what it costs' },
    mins: '10 min',
    head: 'Read your first month of reports',
    body: 'Once there is a month of history, the reports become useful: spending by category, month against month, duplicates caught before they inflate a total, and subscriptions surfaced by pattern — three or more similar charges at a similar interval.',
    why: 'The subscription list is where most people find money immediately. It reliably contains at least one thing they had forgotten they were paying for.',
    cta: { href: '/resources#guides', label: 'The subscription audit guide' },
  },
  {
    n: '06',
    shot: { src: '/home/goals/web-bills.webp', alt: 'The GetGuac bills calendar showing the month ahead' },
    mins: '10 min',
    head: 'Put your bills on the calendar',
    body: 'Add the recurring bills you already know about, with their dates. The calendar then shows the month ahead rather than the month behind.',
    why: 'Almost nothing about bills is genuinely unexpected. Seeing them a fortnight out is the difference between planning and reacting.',
    cta: { href: '/bills', label: 'Open the bills calendar' },
  },
  {
    n: '07',
    shot: { src: '/home/goals/web-returns.webp', alt: 'Return windows counting down on recent purchases' },
    mins: 'ongoing',
    head: 'Check return windows before they close',
    body: 'Receipts carry return policies, and GetGuac keeps track of the deadline. A returnable item is money that is still yours right up until the window shuts.',
    why: 'This is the only step that pays you back directly. Everything above tells you what happened; this one recovers money while there is still time.',
    cta: { href: '/resources/guides/refund-rights.html', label: 'The refund rights guide' },
  },
]

export default function GetStartedPage() {
  return (
    <MarketingShell subtitle="get-started">
      <section className="mx-auto max-w-4xl px-4 pt-12 pb-6 text-center sm:px-6 sm:pt-16">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
          The get-started guide
        </span>
        <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-gray-900 sm:text-6xl" style={DISPLAY}>
          From one receipt to a system
          <span className="block bg-gradient-to-br from-emerald-500 via-lime-500 to-amber-500 bg-clip-text text-transparent">
            that runs without you.
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
          Seven steps. About half an hour of actual work, spread over your first month —
          and the first one takes a minute and does not need an account.
        </p>
      </section>

      <style>{GS_CSS}</style>

      {/* Steps. Numbered and time-stamped because the single biggest reason
          people abandon a setup guide is not knowing how much is left.
          Each step also SHOWS the screen it is talking about — the guide read
          as seven paragraphs of instructions for a product you had never seen.
          Step 02 is account creation and deliberately has no screen: a signup
          form is not worth a screenshot and pretending otherwise would pad the
          page. The layout handles its absence rather than substituting art. */}
      <section className="mx-auto max-w-5xl px-4 pb-8 sm:px-6">
        <ol className="m-0 list-none space-y-4 p-0">
          {STEPS.map((s) => (
            <li key={s.n} className={s.shot ? 'gs-step gs-step-shot' : 'gs-step'}>
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-[#65A30D]" style={DISPLAY}>{s.n}</span>
                  <span className="rounded-full bg-lime-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-lime-900">{s.mins}</span>
                </div>
                <h2 className="mt-2 text-xl font-extrabold leading-snug text-[#15281C]">{s.head}</h2>
                <p className="mt-2 text-[15px] leading-6 text-gray-700">{s.body}</p>
                <p className="mt-2 text-[15px] leading-6 text-gray-500"><span className="font-bold text-gray-700">Why it matters — </span>{s.why}</p>
                {s.note && <p className="mt-2 text-sm text-emerald-800">{s.note}</p>}
                <Link href={s.cta.href} className="mt-3 inline-block font-extrabold text-[#4D7C0F] no-underline">{s.cta.label} →</Link>
              </div>
              {s.shot && (
                <img
                  className={s.shot.phone ? 'gs-shot gs-shot-phone' : 'gs-shot'}
                  src={s.shot.src} alt={s.shot.alt}
                  width={s.shot.phone ? 360 : 1200} height={s.shot.phone ? 757 : 780}
                  loading="lazy" decoding="async"
                />
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* The circle. The seven steps above are the setup; this is the thing the
          setup produces — the loop a receipt travels once it is all running.
          Same component the homepage and /join use, so the three cannot drift. */}
      <section className="mx-auto max-w-5xl px-4 pb-4 sm:px-6">
        <ReceiptCircle
          heading="What you have when the seven steps are done."
          blurb="Every receipt goes round this loop, and each trip round makes the next one better."
          href="/how-it-works"
          linkLabel="See the whole story"
        />
      </section>

      {/* What good looks like. A setup guide that never says when you are done
          leaves people permanently unsure whether it is working. */}
      <section className="mx-auto max-w-3xl px-4 pb-10 sm:px-6">
        <div className="rounded-2xl bg-[#F8FBF4] p-5 ring-1 ring-emerald-900/10">
          <h2 className="text-xl font-extrabold text-[#15281C]">What good looks like after a month</h2>
          <ul className="mt-3 space-y-2 text-[15px] leading-6 text-gray-700">
            <li>Receipts arrive on their own and you have stopped thinking about capture.</li>
            <li>You can answer &ldquo;what did we spend on food last month&rdquo; without guessing.</li>
            <li>At least one subscription has been cancelled.</li>
            <li>No bill has surprised you.</li>
            <li>You have returned something you would otherwise have kept by accident.</li>
          </ul>
          <p className="mt-3 text-sm text-gray-500">
            If four of those five are true, it is working. If none are, the usual missing piece is
            step three — the inbox connection is what makes the rest happen without effort.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16 text-center sm:px-6">
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/join?try=receipt" className="btn-primary">📷 Start with one receipt</Link>
          <Link href="/why-getguac" className="btn-secondary">Why GetGuac is different</Link>
          <Link href="/resources#guides" className="btn-secondary">All the guides</Link>
        </div>
      </section>
    </MarketingShell>
  )
}
