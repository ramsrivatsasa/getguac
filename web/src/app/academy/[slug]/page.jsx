import { notFound } from 'next/navigation'
import MarketingShell from '../../../components/MarketingShell'
import ArticleFigure from '../../../components/ArticleFigure'
import { TRACKS, academyLessons, academyLesson } from '../../../lib/academy'
import { ACADEMY_CSS } from '../academy-css'
import { TrackNav, LessonActions, LessonCheck } from './LessonClient'

export function generateStaticParams() {
  return academyLessons().map((l) => ({ slug: l.slug }))
}

export function generateMetadata({ params }) {
  const l = academyLesson(params.slug)
  if (!l) return {}
  // Article-backed lessons point search engines at the article; the Academy is
  // a second way in to the same text, not a duplicate to index.
  const canonical = l.native ? `/academy/${l.slug}` : `/articles/${l.slug}`
  return {
    title: `${l.title} | GetGuac Academy`,
    description: l.excerpt,
    alternates: { canonical },
    openGraph: { title: l.title, description: l.excerpt, url: `/academy/${l.slug}`, type: 'article', images: ['/og.png'] },
  }
}

function Body({ body }) {
  return body.map((item, i) => {
    if (typeof item === 'string') return <p key={i} className="ac-p">{item}</p>
    if (item && item.h) return <h3 key={i} className="ac-h3">{item.h}</h3>
    if (item && item.list) return <ul key={i} className="ac-ul">{item.list.map((li, j) => <li key={j} className="ac-li">{li}</li>)}</ul>
    if (item && item.figure) return <ArticleFigure key={i} figure={item.figure} />
    return null
  })
}

const isExternal = (href) => /^https?:/.test(href)

export default function LessonPage({ params }) {
  const all = academyLessons()
  const idx = all.findIndex((l) => l.slug === params.slug)
  if (idx < 0) notFound()
  const l = all[idx]
  const x = l.extras
  const prev = idx > 0 ? { slug: all[idx - 1].slug } : null
  const next = idx < all.length - 1 ? { slug: all[idx + 1].slug } : null
  const navLessons = all.map(({ slug, trackId, title }) => ({ slug, trackId, title }))
  const navTracks = TRACKS.map(({ id, name, icon }) => ({ id, name, icon }))
  const lastRow = x.example.rows.length - 1
  const hasTotal = /^total/i.test(String(x.example.rows[lastRow][0]))

  return (
    <MarketingShell subtitle="academy" hideSearch>
      <style dangerouslySetInnerHTML={{ __html: ACADEMY_CSS }} />
      <div className="ac-page">
        <div className="ac-wrap">
          <nav className="ac-crumb" aria-label="Breadcrumb">
            <a className="ac-crumb-link" href="/academy">Academy</a><span aria-hidden="true">/</span><span>{l.trackName}</span>
          </nav>
          <div className="ac-layout">
            <nav className="ac-side" aria-label="Academy lessons">
              <div className="ac-side-title">Tracks</div>
              <TrackNav tracks={navTracks} lessons={navLessons} current={l.slug} />
            </nav>

            <div className="ac-main">
              <details className="ac-side-mobile">
                <summary className="ac-side-mobile-sum">All tracks and lessons</summary>
                <div className="ac-side-mobile-body"><TrackNav tracks={navTracks} lessons={navLessons} current={l.slug} /></div>
              </details>

              <header className="ac-banner">
                <div className="ac-banner-top">
                  <span className="ac-pill">{l.trackName}</span>
                  <span className="ac-meta">Lesson {l.n} of {all.length} · {l.readMins} min read</span>
                </div>
                <h1 className="ac-lesson-h1">{l.title}</h1>
                <p className="ac-lesson-lede">{l.excerpt}</p>
                <div className="ac-learn">
                  <h2 className="ac-learn-title">In this lesson you will</h2>
                  <ul className="ac-learn-list">{x.objectives.map((o) => <li key={o} className="ac-li">{o}</li>)}</ul>
                </div>
              </header>

              <section className="ac-section" aria-label="The lesson">
                <span className="ac-section-eyebrow">The lesson</span>
                <div className="ac-prose"><Body body={l.body} /></div>
                {!l.native && <p className="ac-source">Also published as an article: <a className="ac-source-link" href={`/articles/${l.slug}`}>{l.title}</a>. By the GetGuac team · <a className="ac-source-link" href="/editorial-policy">Editorial policy</a></p>}
                {l.native && <p className="ac-source">By the GetGuac team · <a className="ac-source-link" href="/editorial-policy">Editorial policy</a></p>}
              </section>

              <section className="ac-section" aria-labelledby="ac-ideas">
                <span className="ac-section-eyebrow">Key ideas</span>
                <h2 className="ac-section-h2" id="ac-ideas">Three ideas to keep</h2>
                <div className="ac-ideas">
                  {x.ideas.map((idea, i) => (
                    <article key={idea.t} className="ac-idea">
                      <span className="ac-idea-n" aria-hidden="true">{i + 1}</span>
                      <h3 className="ac-idea-t">{idea.t}</h3>
                      <p className="ac-idea-d">{idea.d}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="ac-section" aria-labelledby="ac-plan">
                <span className="ac-section-eyebrow">Your action plan</span>
                <h2 className="ac-section-h2" id="ac-plan">Do it in {x.plan.length} steps</h2>
                <ol className="ac-plan">
                  {x.plan.map((s, i) => (
                    <li key={s.t} className="ac-plan-step">
                      <span className="ac-plan-n" aria-hidden="true">{i + 1}</span>
                      <div><h3 className="ac-plan-t">{s.t}</h3><p className="ac-plan-d">{s.d}</p></div>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="ac-section" aria-labelledby="ac-example">
                <span className="ac-section-eyebrow">Worked example</span>
                <h2 className="ac-section-h2" id="ac-example">{x.example.title}</h2>
                <p className="ac-example-intro">{x.example.intro}</p>
                <table className="ac-table">
                  <thead><tr>{x.example.head.map((h, i) => <th key={i} scope="col" className="ac-th">{h}</th>)}</tr></thead>
                  <tbody>
                    {x.example.rows.map((row, r) => (
                      <tr key={r} className={hasTotal && r === lastRow ? 'ac-tr-total' : undefined}>
                        {row.map((cell, c) => <td key={c} className="ac-td">{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="ac-takeaway">{x.example.takeaway}</p>
              </section>

              <section className="ac-section" aria-labelledby="ac-mistakes">
                <span className="ac-section-eyebrow">Mistakes to avoid</span>
                <h2 className="ac-section-h2" id="ac-mistakes">Where this usually goes wrong</h2>
                <ul className="ac-mistakes">{x.mistakes.map((m) => <li key={m} className="ac-mistake">{m}</li>)}</ul>
              </section>

              <section className="ac-exercise" aria-label="Try it today">
                <span className="ac-exercise-eyebrow">Try it today</span>
                <p className="ac-exercise-text">{x.exercise}</p>
              </section>

              <section className="ac-section" aria-labelledby="ac-apply">
                <span className="ac-section-eyebrow">Use it in GetGuac</span>
                <h2 className="ac-section-h2" id="ac-apply">Tools and guides for this lesson</h2>
                <div className="ac-apply">
                  {x.apply.map((a) => (
                    <a key={a.href} className="ac-apply-link" href={a.href} {...(isExternal(a.href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                      <span className="ac-apply-label">{a.label}{isExternal(a.href) ? ' ↗' : ''}</span>
                      <span className="ac-apply-d">{a.d}</span>
                    </a>
                  ))}
                  {l.calc && !x.apply.some((a) => a.href.includes(`#${l.calc}`)) && (
                    <a className="ac-apply-link" href={`/calculators#${l.calc}`}>
                      <span className="ac-apply-label">Run the numbers</span>
                      <span className="ac-apply-d">The matching free calculator.</span>
                    </a>
                  )}
                </div>
              </section>

              <LessonCheck check={l.check} />

              <LessonActions slug={l.slug} prev={prev} next={next} />
            </div>
          </div>
        </div>
      </div>
    </MarketingShell>
  )
}
