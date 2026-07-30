// Public /editorial-policy page — who writes the money articles, what they are
// and aren't, and how advertising is kept away from the words.
//
// Why it exists: every article carried no visible author and no stated standard,
// which is the exact shape a content review reads as low-trust. Each article now
// bylines "By the GetGuac team" and links here, and the Article JSON-LD points
// its `author.url` at this page.
//
// 🔒 HONESTY LOCK — everything on this page is checkable in the repo, and it has
// to stay that way. In particular:
//   • "no links inside an article body" is true *by construction*: the body
//     renderer (app/articles/[slug]/page.jsx) handles exactly four node types —
//     paragraph string, { h }, { list }, { figure }. There is no link node, so
//     an affiliate or paid link cannot be placed in an article even by mistake.
//   • "figures are drawn from the numbers in the article" is true because
//     components/ArticleFigure.jsx renders values supplied inline in articles.js
//     next to the prose that cites them — nothing is fetched or estimated.
// Do not add a claim here that isn't backed by code, and do not add a link node
// to the body renderer without revisiting the first bullet.

import Link from 'next/link'
import MarketingShell from '../../components/MarketingShell'
import GuacMascot from '../../components/GuacMascot'
import { BookOpen, PenLine, Megaphone, RefreshCw, AlertTriangle, Mail } from 'lucide-react'

export const metadata = {
  title: 'Editorial policy',
  description:
    'Who writes GetGuac articles, how we handle numbers and corrections, and why advertising never touches the words. Plain language, no filler.',
  alternates: { canonical: '/editorial-policy' },
}

const MUTED = '#5F6D63'

function Section({ icon: Icon, title, children }) {
  return (
    <section className="mt-9">
      <h2 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 inline-flex items-center gap-2">
        <Icon size={19} className="text-emerald-600 shrink-0" /> {title}
      </h2>
      <div className="mt-2.5 space-y-3 text-[15px] text-gray-700 leading-relaxed">{children}</div>
    </section>
  )
}

export default function EditorialPolicyPage() {
  return (
    <MarketingShell subtitle="editorial policy" hideSearch>
      <article className="max-w-2xl mx-auto px-4 sm:px-6 pt-9 pb-16">
        <div className="flex items-start gap-4 flex-wrap">
          <GuacMascot expression="happy" size={92} />
          <div className="flex-1 min-w-[240px]">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
              <BookOpen size={12} /> Editorial policy
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 mt-3 leading-tight">
              How we write about your money.
            </h1>
          </div>
        </div>

        <p className="mt-5 text-[15px] text-gray-700 leading-relaxed">
          GetGuac publishes free money guides alongside a receipt scanner and spending tracker.
          This page says who writes them, what they are, what they are not, and where advertising
          fits. It is short on purpose — a policy nobody reads protects nobody.
        </p>

        <Section icon={PenLine} title="Who writes these">
          <p>
            Articles are written and reviewed by the GetGuac team. We do not publish guest posts,
            we do not accept submissions, and we do not attach invented bylines or credentials to
            a piece. If a name is not on it, that is because the team wrote it — not because we are
            hiding an expert we do not have.
          </p>
          <p>
            We write in our own lane first: receipts, spending, refunds, subscriptions and the
            things our own product touches every day. Where a guide covers broader money basics,
            we stick to well-established, non-controversial ground and point you at the calculator
            that lets you run your own numbers instead of trusting ours.
          </p>
        </Section>

        <Section icon={AlertTriangle} title="This is information, not advice">
          <p>
            Nothing here is personalized financial, investment, tax or legal advice, and reading it
            does not make us your advisor. We do not know your income, your debts, your tax
            situation or your risk tolerance. For decisions that turn on those, talk to a qualified
            professional who can actually see your position.
          </p>
          <p>
            Any dollar figures in an article are illustrations, not forecasts. Rates of return,
            prices and tax rules change, and past results never guarantee future ones.
          </p>
        </Section>

        <Section icon={Megaphone} title="Advertising never touches the words">
          <p>
            Some pages carry ads, and every one of them is labelled as an advertisement. No article
            is sponsored, and no advertiser gets to review, request, place or influence a word of
            what we publish.
          </p>
          <p>
            There are no affiliate links or paid links inside an article, and that is enforced by
            the software rather than by good intentions: an article body can only contain
            paragraphs, subheadings, bullet lists and figures. There is no mechanism to put a link
            in one at all.
          </p>
        </Section>

        <Section icon={RefreshCw} title="Numbers, figures and updates">
          <p>
            Charts in an article are generated from the same numbers the surrounding paragraphs
            state, so a figure cannot quietly disagree with the text next to it. Where we show a
            worked example, the arithmetic is in the article so you can check it.
          </p>
          <p>
            Every article shows the date it was last updated. We revisit guides when the underlying
            rules move — contribution limits, tax thresholds, retailer policies — rather than on a
            schedule designed to look busy.
          </p>
        </Section>

        <Section icon={Mail} title="Corrections">
          <p>
            If something here is wrong, we want to know and we will fix it. Send the article and
            what is wrong with it via <Link href="/contact" className="text-emerald-700 font-semibold hover:underline">our contact page</Link>.
            Substantive corrections change the article and its updated date; typos we just fix.
          </p>
        </Section>

        <div className="mt-10 rounded-2xl border border-gray-100 bg-gray-50/60 p-4 text-xs leading-relaxed" style={{ color: MUTED }}>
          Related: <Link href="/privacy" className="text-emerald-700 font-semibold hover:underline">Privacy</Link>{' · '}
          <Link href="/security" className="text-emerald-700 font-semibold hover:underline">Security</Link>{' · '}
          <Link href="/terms" className="text-emerald-700 font-semibold hover:underline">Terms</Link>{' · '}
          <Link href="/about" className="text-emerald-700 font-semibold hover:underline">About</Link>
        </div>

        <div className="mt-8">
          <Link href="/articles" className="text-sm text-emerald-700 font-semibold hover:underline">← Back to all articles</Link>
        </div>
      </article>
    </MarketingShell>
  )
}
