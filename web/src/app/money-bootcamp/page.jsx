import Link from 'next/link'
import MarketingShell from '../../components/MarketingShell'
import { publicMetadata } from '../../lib/public-seo.mjs'
import { bootcampTests, bootcampExams, breadcrumbJsonLd, PASS_PCT } from '../../lib/bootcamp'
import { ACADEMY_CSS } from '../academy/academy-css'
import { TrackIcon } from '../academy/icons'
import { BOOTCAMP_CSS } from './bootcamp-css'
import { ScoreBadge, OverallScore } from './BootcampClient'

const TITLE = 'Free Budgeting Test & Money Bootcamp: Check Your Money Skills'
const DESCRIPTION = 'Take free budgeting, saving, debt, credit, investing and tax tests. 100 short quizzes plus 13 bootcamp exams, each with an instant score and answer explanations. No sign-up.'

export const metadata = {
  ...publicMetadata('/money-bootcamp', TITLE, DESCRIPTION),
  keywords: [
    'free budgeting test', 'budget bootcamp', 'money bootcamp', 'budgeting quiz', 'check your money skills',
    'personal finance quiz', 'financial literacy test', 'money quiz with answers', 'credit score quiz',
    'debt payoff quiz', 'emergency fund quiz', 'investing basics quiz', 'tax basics quiz', 'retirement quiz',
  ],
  robots: { index: true, follow: true },
}

const FAQ = [
  ['Is the money bootcamp free?', 'Yes. Every test and exam is free, with no account or sign-up. Your scores are kept in this browser only.'],
  ['How is each test scored?', `Each lesson test has 9 multiple-choice questions. You see the right answer and an explanation as you go, then a percentage score at the end. ${PASS_PCT}% or more is a pass.`],
  ['Where do the questions come from?', 'Each test checks one GetGuac Academy lesson: its practice questions, key ideas, action plan and the mistakes it warns against. Read the lesson first if a test feels hard.'],
  ['Is this financial advice?', 'No. The bootcamp is general education. Investing, stock and retirement topics explain how things work and never recommend a product or a stock.'],
]

export default function BootcampHub() {
  const tests = bootcampTests()
  const exams = bootcampExams()
  const questionCount = tests.reduce((n, t) => n + t.questions.length, 0)
  const ids = tests.map((t) => t.slug)

  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'Course', name: 'GetGuac Money Bootcamp',
      description: DESCRIPTION, url: 'https://getguac.app/money-bootcamp', inLanguage: 'en', isAccessibleForFree: true,
      provider: { '@type': 'Organization', name: 'GetGuac', url: 'https://getguac.app' },
      hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online', courseWorkload: 'PT5M' },
      offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD', category: 'Free' },
    },
    {
      '@context': 'https://schema.org', '@type': 'ItemList', name: 'Money Bootcamp tests',
      itemListElement: tests.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: `${t.title} test`, url: `https://getguac.app/money-bootcamp/${t.slug}` })),
    },
    {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
    breadcrumbJsonLd([['Home', '/'], ['Money Bootcamp', '/money-bootcamp']]),
  ]

  return (
    <MarketingShell subtitle="money bootcamp" hideSearch>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <style dangerouslySetInnerHTML={{ __html: ACADEMY_CSS + BOOTCAMP_CSS }} />
      <div className="ac-page">
        <div className="ac-wrap">
          <nav className="ac-crumb" aria-label="Breadcrumb"><Link className="ac-crumb-link" href="/">Home</Link><span aria-hidden="true">/</span><span>Money Bootcamp</span></nav>

          <header className="bc-hero">
            <div className="ac-hero-copy">
              <span className="ac-eyebrow">Money Bootcamp</span>
              <h1 className="ac-h1">Free budgeting test: check your money skills</h1>
              <p className="ac-lede">A short test for every GetGuac Academy lesson, from your first budget to credit, debt, investing basics and taxes. Answer, see why, get your score, then fix the gaps with the lesson.</p>
              <div className="ac-stats">
                <span className="ac-stat">{tests.length} tests</span>
                <span className="ac-stat">{exams.length} bootcamp exams</span>
                <span className="ac-stat">{questionCount.toLocaleString('en-US')} questions</span>
                <span className="ac-stat">Free, no sign-up</span>
              </div>
            </div>
            <OverallScore ids={ids} total={tests.length} />
          </header>

          <ol className="bc-how" aria-label="How the bootcamp works">
            <li className="bc-how-step"><span className="bc-how-n" aria-hidden="true">1</span><div><p className="bc-how-t">Take a 9-question test</p><p className="bc-how-d">About 5 minutes per topic.</p></div></li>
            <li className="bc-how-step"><span className="bc-how-n" aria-hidden="true">2</span><div><p className="bc-how-t">See why after each answer</p><p className="bc-how-d">Every question explains the right answer.</p></div></li>
            <li className="bc-how-step"><span className="bc-how-n" aria-hidden="true">3</span><div><p className="bc-how-t">Score {PASS_PCT}% to pass</p><p className="bc-how-d">Then take the track exam.</p></div></li>
          </ol>

          {exams.map((exam) => {
            const inTrack = tests.filter((t) => t.trackId === exam.trackId)
            return (
              <section key={exam.slug} id={exam.slug} className="bc-track" aria-labelledby={`bc-${exam.slug}`}>
                <div className="bc-track-head">
                  <div className="bc-track-title">
                    <span className="bc-track-icon"><TrackIcon name={exam.icon} size={18} /></span>
                    <div>
                      <h2 className="bc-track-h2" id={`bc-${exam.slug}`}>{exam.trackName}</h2>
                      <p className="bc-track-blurb">{exam.blurb}</p>
                    </div>
                  </div>
                  <a className="bc-exam-link" href={`/money-bootcamp/exam/${exam.slug}`}>Final exam · {exam.questions.length} questions <ScoreBadge id={`exam:${exam.slug}`} /></a>
                </div>
                <table className="bc-table">
                  <thead>
                    <tr>
                      <th scope="col" className="bc-th bc-th-n">#</th>
                      <th scope="col" className="bc-th">Test</th>
                      <th scope="col" className="bc-th bc-th-q">Questions</th>
                      <th scope="col" className="bc-th bc-th-score">Your best</th>
                      <th scope="col" className="bc-th bc-th-go"><span className="sr-only">Start</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {inTrack.map((t) => (
                      <tr key={t.slug}>
                        <td className="bc-td bc-td-n">{t.n}</td>
                        <td className="bc-td"><a className="bc-row-link" href={`/money-bootcamp/${t.slug}`}>{t.title}</a></td>
                        <td className="bc-td bc-td-meta bc-td-q">{t.questions.length} · {t.minutes} min</td>
                        <td className="bc-td"><ScoreBadge id={t.slug} /></td>
                        <td className="bc-td"><a className="bc-go" href={`/money-bootcamp/${t.slug}`} aria-label={`Start the ${t.title} test`}>Start</a></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )
          })}

          <section className="ac-section" aria-labelledby="bc-faq">
            <span className="ac-section-eyebrow">Questions</span>
            <h2 className="ac-section-h2" id="bc-faq">About the Money Bootcamp</h2>
            {FAQ.map(([q, a]) => (<div key={q}><h3 className="bc-faq-q">{q}</h3><p className="bc-faq-a">{a}</p></div>))}
            <Link className="bc-learn-link" href="/academy/lessons">Read the lessons in GetGuac Academy →</Link>
          </section>
        </div>
      </div>
    </MarketingShell>
  )
}
