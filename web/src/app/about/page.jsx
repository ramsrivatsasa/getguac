// Public /about page — the short, honest brand story and what GetGuac stands for.
import Link from 'next/link'
import MarketingShell from '../../components/MarketingShell'
import { Heart, Eye, Lock, Sparkles } from 'lucide-react'

export const metadata = {
  title: 'About: Your Money, Made Clear',
  description:
    'GetGuac helps everyday people see and save their own money — not earn points. Learn why we built a free, privacy-first receipt scanner and spending tracker.',
  alternates: { canonical: '/about' },
}

const VALUES = [
  { icon: Eye, title: 'Clarity over guilt', body: 'We show you where your money goes in plain language. No lectures, no shame — just an honest, useful picture.' },
  { icon: Lock, title: 'Privacy by default', body: 'No bank login required, no data selling, row-level security on every record. Your money is nobody’s business but yours.' },
  { icon: Heart, title: 'Your money, not points', body: 'We don’t profit from your spending. GetGuac helps you keep more of what you already earned, for the things that matter to you.' },
]

export default function AboutPage() {
  return (
    <MarketingShell subtitle="about">
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-6 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
          <Sparkles size={12} /> Why we built GetGuac
        </span>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-gray-900 mt-4 leading-tight">
          Your money,
          <span className="bg-gradient-to-br from-emerald-500 via-lime-500 to-amber-500 bg-clip-text text-transparent"> made clear.</span>
        </h1>
      </section>

      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-6 text-gray-700 space-y-5 text-lg leading-relaxed">
        <p>
          Most money apps want you to link your bank, watch ads, or chase points for spending more.
          We wanted the opposite: a friendly sidekick that simply helps everyday people understand
          their own spending and keep more of it.
        </p>
        <p>
          So we built GetGuac. Snap a receipt and Guac-AI reads every line, scores how you’re
          spending, catches the fees and subscriptions you forgot about, tracks the refunds you’re
          owed, and quietly finds you a better price. It’s the kind of help a sharp friend who’s
          great with money would give you — without the judgment.
        </p>
        <p>
          It’s free, it’s private, and it’s on your side. Because the money you save isn’t for us —
          it’s for your retirement, your kids’ school, an emergency fund, or whatever matters most to you.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid md:grid-cols-3 gap-4">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <v.icon size={22} />
              </div>
              <h3 className="font-bold text-gray-900 mt-4">{v.title}</h3>
              <p className="text-sm text-gray-600 mt-1.5 leading-snug">{v.body}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link href="/register" className="btn-primary">Get started free</Link>
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-8 text-gray-700 space-y-10">
        <div>
          <h2 className="text-2xl font-black text-gray-900">How GetGuac makes money</h2>
          <div className="mt-3 space-y-4 leading-relaxed">
            <p>
              GetGuac is free to use, and we think you deserve to know how a free product pays its
              bills. Our answer is boring on purpose: the site shows ordinary advertising, and
              members who want an ad-free experience can pay for an optional premium upgrade.
              That&apos;s it.
            </p>
            <p>
              What we don&apos;t do matters more. We never sell your data. We don&apos;t require a
              bank login, so there are no credentials to leak and no transaction feed to monetize.
              We don&apos;t take a cut of anything you buy, and we don&apos;t run a points program
              that quietly rewards you for spending more. The savings GetGuac finds — a refund
              you&apos;re owed, a subscription you forgot, a better price on something you were
              buying anyway — go to you, because it was your money to begin with.
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-black text-gray-900">Who we are</h2>
          <div className="mt-3 space-y-4 leading-relaxed">
            <p>
              GetGuac is built by <b>Yathis Corporation</b>, an independent software company. We are
              a small team, which is why the product feels the way it does: one design language,
              one privacy policy we can actually explain, and features that exist because a real
              person on the team wanted them — the receipt scanner because typing in totals never
              lasts past week two, the refund tracker because stores count on you forgetting, and
              the <Link href="/games" className="text-emerald-700 font-semibold hover:underline">Guac Arcade</Link>{' '}
              because looking at your spending shouldn&apos;t be the only reason to open a money app.
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-black text-gray-900">How we write our guides</h2>
          <div className="mt-3 space-y-4 leading-relaxed">
            <p>
              Our <Link href="/articles" className="text-emerald-700 font-semibold hover:underline">money guides</Link>{' '}
              are written and reviewed by the GetGuac team, dated so you can see when they were last
              updated, and paired with <Link href="/plan" className="text-emerald-700 font-semibold hover:underline">free calculators</Link>{' '}
              so you can run your own numbers instead of taking ours. They are educational, not
              financial advice: we explain how things like 401(k) matches, high-yield savings, and
              debt-payoff methods work, and we leave the decisions to you. If we ever get something
              wrong, <Link href="/contact" className="text-emerald-700 font-semibold hover:underline">tell us</Link> and
              we&apos;ll fix it and update the date.
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-black text-gray-900">Talk to us</h2>
          <div className="mt-3 space-y-4 leading-relaxed">
            <p>
              Questions, bug reports, or an idea that would make GetGuac better? Reach us through
              the <Link href="/contact" className="text-emerald-700 font-semibold hover:underline">contact page</Link> —
              a human reads everything. You can also browse the{' '}
              <Link href="/faq" className="text-emerald-700 font-semibold hover:underline">FAQ</Link>, read exactly how we
              handle data in our <Link href="/privacy" className="text-emerald-700 font-semibold hover:underline">privacy policy</Link>{' '}
              and <Link href="/security" className="text-emerald-700 font-semibold hover:underline">security overview</Link>,
              or see the product end-to-end on the <Link href="/how-it-works" className="text-emerald-700 font-semibold hover:underline">how it works</Link> page.
            </p>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
