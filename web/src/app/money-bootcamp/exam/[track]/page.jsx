import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import MarketingShell from '../../../../components/MarketingShell'
import { publicMetadata } from '../../../../lib/public-seo.mjs'
import { bootcampExams, bootcampExam, quizJsonLd, breadcrumbJsonLd, PASS_PCT } from '../../../../lib/bootcamp'
import { ACADEMY_CSS } from '../../../academy/academy-css'
import { BOOTCAMP_CSS } from '../../bootcamp-css'
import { BootcampTest } from '../../BootcampClient'

export function generateStaticParams() {
  return bootcampExams().map((e) => ({ track: e.slug }))
}

const titleFor = (e) => `${e.trackName} Bootcamp: Free ${e.questions.length}-Question Exam`
const descriptionFor = (e) => `Take the free ${e.trackName.toLowerCase()} bootcamp exam: ${e.questions.length} questions across ${e.tests.length} lessons, with an instant score and an explanation for every answer.`

export async function generateMetadata({ params }) {
  const { track } = await params
  const e = bootcampExam(track)
  if (!e) return {}
  return {
    ...publicMetadata(`/money-bootcamp/exam/${e.slug}`, titleFor(e), descriptionFor(e)),
    keywords: e.keywords,
    robots: { index: true, follow: true },
  }
}

export default async function BootcampExamPage({ params }) {
  const { track } = await params
  const all = bootcampExams()
  const idx = all.findIndex((e) => e.slug === track)
  if (idx < 0) notFound()
  const e = all[idx]
  const next = all[idx + 1]
  const url = `/money-bootcamp/exam/${e.slug}`
  const sourceTitles = Object.fromEntries(e.tests.map((t) => [t.slug, t.title]))

  const jsonLd = [
    quizJsonLd({ name: `${e.trackName} bootcamp exam`, description: descriptionFor(e), url: `https://getguac.app${url}`, about: e.trackName, questions: e.questions }),
    breadcrumbJsonLd([['Home', '/'], ['Money Bootcamp', '/money-bootcamp'], [`${e.trackName} exam`, url]]),
  ]

  return (
    <MarketingShell subtitle="money bootcamp" hideSearch>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <style dangerouslySetInnerHTML={{ __html: ACADEMY_CSS + BOOTCAMP_CSS }} />
      <div className="ac-page">
        <div className="ac-wrap">
          <nav className="ac-crumb" aria-label="Breadcrumb">
            <Link className="ac-crumb-link" href="/money-bootcamp">Money Bootcamp</Link><span aria-hidden="true">/</span>
            <a className="ac-crumb-link" href={`/money-bootcamp#${e.slug}`}>{e.trackName}</a>
          </nav>

          <header className="ac-banner">
            <div className="ac-banner-top">
              <span className="ac-pill">Bootcamp final exam</span>
              <span className="ac-meta">{e.questions.length} questions · {e.tests.length} lessons · about {e.minutes} min · pass {PASS_PCT}%</span>
            </div>
            <h1 className="ac-lesson-h1">{e.trackName} bootcamp exam</h1>
            <p className="ac-lesson-lede">{e.blurb} This exam mixes questions from every lesson in the track. Each explanation links to the lesson it came from.</p>
          </header>

          <BootcampTest id={`exam:${e.slug}`} questions={e.questions} pass={PASS_PCT} sourceTitles={sourceTitles} nextHref={next ? `/money-bootcamp/exam/${next.slug}` : '/money-bootcamp'} nextLabel={next ? `Next: ${next.trackName} exam` : 'All tests'} />

          <section className="ac-section" aria-labelledby="bc-more">
            <span className="ac-section-eyebrow">Practise by topic</span>
            <h2 className="ac-section-h2" id="bc-more">Lesson tests in this bootcamp</h2>
            <ul className="bc-more">
              {e.tests.map((t) => (
                <li key={t.slug}><a className="bc-more-link" href={`/money-bootcamp/${t.slug}`}><span>{t.title}</span><ArrowRight size={15} aria-hidden="true" /></a></li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </MarketingShell>
  )
}
