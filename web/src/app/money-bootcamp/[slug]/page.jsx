import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, BookOpen } from 'lucide-react'
import MarketingShell from '../../../components/MarketingShell'
import { publicMetadata } from '../../../lib/public-seo.mjs'
import { bootcampTests, bootcampTest, quizJsonLd, breadcrumbJsonLd, PASS_PCT } from '../../../lib/bootcamp'
import { ACADEMY_CSS } from '../../academy/academy-css'
import { BOOTCAMP_CSS } from '../bootcamp-css'
import { BootcampTest } from '../BootcampClient'

export function generateStaticParams() {
  return bootcampTests().map((t) => ({ slug: t.slug }))
}

const titleFor = (t) => `${t.title}: Free Quiz & Test`
const descriptionFor = (t) => `Test your skills on ${t.title.toLowerCase()} with a free ${t.questions.length}-question quiz. Instant score, answer explanations and the lesson to review. Part of the GetGuac Money Bootcamp.`

export async function generateMetadata({ params }) {
  const { slug } = await params
  const t = bootcampTest(slug)
  if (!t) return {}
  return {
    ...publicMetadata(`/money-bootcamp/${t.slug}`, titleFor(t), descriptionFor(t)),
    keywords: t.keywords,
    robots: { index: true, follow: true },
  }
}

export default async function BootcampTestPage({ params }) {
  const { slug } = await params
  const all = bootcampTests()
  const idx = all.findIndex((t) => t.slug === slug)
  if (idx < 0) notFound()
  const t = all[idx]
  const next = all[idx + 1]
  const inTrack = all.filter((o) => o.trackId === t.trackId)
  const lastInTrack = inTrack[inTrack.length - 1].slug === t.slug
  const nextHref = lastInTrack ? `/money-bootcamp/exam/${t.trackId}` : next ? `/money-bootcamp/${next.slug}` : '/money-bootcamp'
  const nextLabel = lastInTrack ? `Take the ${t.trackName} exam` : 'Next test'
  const url = `/money-bootcamp/${t.slug}`

  const jsonLd = [
    quizJsonLd({ name: `${t.title} quiz`, description: descriptionFor(t), url: `https://getguac.app${url}`, about: t.title, questions: t.questions }),
    breadcrumbJsonLd([['Home', '/'], ['Money Bootcamp', '/money-bootcamp'], [t.trackName, `/money-bootcamp#${t.trackId}`], [`${t.title} quiz`, url]]),
  ]

  return (
    <MarketingShell subtitle="money bootcamp" hideSearch>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <style dangerouslySetInnerHTML={{ __html: ACADEMY_CSS + BOOTCAMP_CSS }} />
      <div className="ac-page">
        <div className="ac-wrap">
          <nav className="ac-crumb" aria-label="Breadcrumb">
            <Link className="ac-crumb-link" href="/money-bootcamp">Money Bootcamp</Link><span aria-hidden="true">/</span>
            <a className="ac-crumb-link" href={`/money-bootcamp#${t.trackId}`}>{t.trackName}</a>
          </nav>

          <header className="ac-banner">
            <div className="ac-banner-top">
              <span className="ac-pill">{t.trackName} test</span>
              <span className="ac-meta">Test {t.n} of {all.length} · {t.questions.length} questions · about {t.minutes} min · pass {PASS_PCT}%</span>
            </div>
            <h1 className="ac-lesson-h1">{t.title}: test your skills</h1>
            <p className="ac-lesson-lede">{t.excerpt} Answer each question to see the explanation; your score appears at the end.</p>
            {t.objectives.length > 0 && (
              <div className="ac-learn">
                <h2 className="ac-learn-title">This test checks that you can</h2>
                <ul className="ac-learn-list">{t.objectives.map((o) => <li key={o} className="ac-li">{o}</li>)}</ul>
              </div>
            )}
            <a className="bc-learn-link" href={`/academy/${t.slug}`}><BookOpen size={16} aria-hidden="true" /> Read the lesson first</a>
          </header>

          <BootcampTest id={t.slug} questions={t.questions} pass={PASS_PCT} lessonHref={`/academy/${t.slug}`} nextHref={nextHref} nextLabel={nextLabel} />

          {t.puzzle && (
            <section className="ac-section" aria-label="Bonus problem">
              <div className="ac-puzzle">
                <span className="ac-puzzle-eyebrow">Bonus problem · not scored</span>
                <p className="ac-puzzle-q">{t.puzzle.q}</p>
                <details className="ac-puzzle-ans">
                  <summary className="ac-puzzle-sum">Show the answer</summary>
                  <p className="ac-puzzle-a"><strong>{t.puzzle.answer}</strong></p>
                  <p className="ac-puzzle-steps">{t.puzzle.steps}</p>
                </details>
              </div>
            </section>
          )}

          {t.exercise && (
            <section className="ac-exercise" aria-label="Try it today">
              <span className="ac-exercise-eyebrow">Put it into practice today</span>
              <p className="ac-exercise-text">{t.exercise}</p>
            </section>
          )}

          <section className="ac-section" aria-labelledby="bc-more">
            <span className="ac-section-eyebrow">{t.trackName}</span>
            <h2 className="ac-section-h2" id="bc-more">More tests in this bootcamp</h2>
            <ul className="bc-more">
              {inTrack.map((o) => (
                <li key={o.slug}>
                  <a className={o.slug === t.slug ? 'bc-more-link bc-more-link-on' : 'bc-more-link'} href={`/money-bootcamp/${o.slug}`} aria-current={o.slug === t.slug ? 'page' : undefined}>
                    <span>{o.title}</span><ArrowRight size={15} aria-hidden="true" />
                  </a>
                </li>
              ))}
              <li><a className="bc-more-link" href={`/money-bootcamp/exam/${t.trackId}`}><span><strong>Final exam:</strong> {t.trackName}</span><ArrowRight size={15} aria-hidden="true" /></a></li>
            </ul>
          </section>
        </div>
      </div>
    </MarketingShell>
  )
}
