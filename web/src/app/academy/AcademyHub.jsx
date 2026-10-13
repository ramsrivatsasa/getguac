'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Clock } from 'lucide-react'
import { TrackIcon } from './icons'
import { readDone, onDoneChange } from './progress'

// The hub: track filter (sidebar on desktop, chips on mobile), search, lessons
// grouped under their track, and a progress card that always offers the next
// unfinished lesson. Progress reads after mount so the server HTML is identical
// for every visitor.
export default function AcademyHub({ tracks, lessons, resources = {}, section = 'lessons', heading, intro, photo, photoAlt }) {
  const [done, setDoneState] = useState({})
  const [track, setTrack] = useState('all')
  const [query, setQuery] = useState('')
  const view = section

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    const legacy = {articles:'articles',resources:'articles',topics:'articles','start-here':'articles',guides:'guides',basics:'guides','external-guides':'guides',tools:'tools',goals:'tools',lessons:'lessons'}[hash]
    if (legacy && view === 'lessons') window.location.replace(`/academy/${legacy}`)
  }, [view])

  useEffect(() => {
    setDoneState(readDone())
    return onDoneChange(setDoneState)
  }, [])

  const doneCount = lessons.filter((l) => done[l.progressSlug || l.slug]).length
  const pct = Math.round((doneCount / lessons.length) * 100)
  const next = lessons.find((l) => !done[l.progressSlug || l.slug]) || lessons[0]

  const q = query.trim().toLowerCase()
  const visible = useMemo(() => lessons.filter((l) => {
    if (track !== 'all' && l.trackId !== track) return false
    if (!q) return true
    return `${l.title} ${l.excerpt} ${l.trackName}`.toLowerCase().includes(q)
  }), [lessons, track, q])

  const shownTracks = tracks.filter((t) => visible.some((l) => l.trackId === t.id))
  const featured = [
    {id:'where-you-stand', label:'Feel more in control', photo:'/home/campaign-story/understand-couple-v2.webp', alt:'A couple reviewing household paperwork together'},
    {id:'track-spending-with-receipts', label:'Make everyday spending clearer', photo:'/home/story-people/capture-blonde-produce-v1-768.webp', alt:'A shopper holding a receipt and phone in a grocery store'},
    {id:'get-the-refund-youre-owed', label:'Protect what you spend', photo:'/home/campaign-story/protect-return-v2.webp', alt:'A woman checking a receipt beside a purchase'}
  ].map(f => ({...f, lesson:lessons.find(l => l.progressSlug === f.id)}))

  return (
    <>
      <section className="ac-hero">
        <div className="ac-hero-copy">
          <span className="ac-eyebrow">GetGuac Academy</span>
          <h1 className="ac-h1">{heading || <>Small money lessons.<br />More room for life.</>}</h1>
          <p className="ac-lede">{intro || 'Build your confidence with money. Learn to save, shop smarter and stand up for your consumer rights, one practical step at a time.'}</p>
          {view === 'lessons' && <div className="ac-stats">
            <span className="ac-stat">{lessons.length} lessons</span>
            <span className="ac-stat">{tracks.length} tracks</span>
            <span className="ac-stat">Free, no account needed</span>
          </div>}
          {view === 'lessons' && <a className="ac-hero-action" href={`/academy/${next.slug}`}>Start your next lesson <ArrowRight size={18} aria-hidden="true" /></a>}
        </div>
        <figure className="ac-hero-picture">
          <img className="ac-family-photo" src={photo || '/home/story-people/openai-hero-giggling-family-baby-v2-768.webp'} alt={photoAlt || 'Parents and children sharing a happy moment together with a tablet'} width={768} height={512} fetchPriority="high" />
          <figcaption className="ac-photo-quote">“Make space for what matters. Start with one small step.”<span>GetGuac Academy</span></figcaption>
        </figure>
      </section>
        {view === 'lessons' && <aside className="ac-progress-card" aria-label="Your progress">
          <div>
            <div className="ac-progress-label">Your progress</div>
            <div className="ac-progress-num">{doneCount}<span className="ac-progress-of"> of {lessons.length} complete</span></div>
          </div>
          <div className="ac-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Lessons complete"><div className="ac-bar-fill" style={{ width: `${pct}%` }} /></div>
          <a className="ac-continue" href={`/academy/${next.slug}`}>
            <span className="ac-continue-title">{doneCount ? 'Continue' : 'Start'}: {next.title}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </aside>}

      <nav className="ac-library-nav" aria-label="Academy library">
        <Link href="/academy/lessons" aria-current={view === 'lessons' ? 'page' : undefined}>Lessons</Link>
        <Link href="/academy/articles" aria-current={view === 'articles' ? 'page' : undefined}>Articles</Link>
        <Link href="/academy/guides" aria-current={view === 'guides' ? 'page' : undefined}>Guides</Link>
        <Link href="/academy/tools" aria-current={view === 'tools' ? 'page' : undefined}>Tools</Link>
      </nav>
      {view !== 'lessons' && <div data-resource-root>{resources[view]}</div>}
      {view === 'lessons' && <div id="lessons">
      <section className="ac-featured" aria-labelledby="ac-featured-heading">
        <h2 className="ac-track-h2" id="ac-featured-heading">A good place to start</h2>
        <div className="ac-featured-grid">
          {featured.map(f => <a className="ac-featured-card" key={f.id} href={`/academy/${f.lesson.slug}`}>
            <img src={f.photo} alt={f.alt} width={768} height={512} loading="lazy" />
            <div className="ac-featured-copy"><span className="ac-featured-label">{f.label}</span><h3 className="ac-card-title">{f.lesson.title}</h3><span className="ac-card-meta">{f.lesson.readMins} min <ArrowRight size={14} aria-hidden="true" /></span></div>
          </a>)}
        </div>
      </section>
      <div className="ac-layout">
        <nav className="ac-side" aria-label="Tracks">
          <div className="ac-side-title">Tracks</div>
          <TrackButton active={track === 'all'} onClick={() => setTrack('all')} icon="BookOpen" name="All lessons" count={`${doneCount}/${lessons.length}`} />
          {tracks.map((t) => {
            const inTrack = lessons.filter((l) => l.trackId === t.id)
            const d = inTrack.filter((l) => done[l.progressSlug || l.slug]).length
            return <TrackButton key={t.id} active={track === t.id} onClick={() => setTrack(t.id)} icon={t.icon} name={t.name} count={`${d}/${inTrack.length}`} />
          })}
        </nav>

        <div className="ac-main">
          <div className="ac-track-select-wrap">
            <label className="ac-track-select-label" htmlFor="ac-track-select">Track</label>
            <select id="ac-track-select" className="ac-track-select" value={track} onChange={(e) => setTrack(e.target.value)}>
              <option value="all">All lessons ({doneCount}/{lessons.length} done)</option>
              {tracks.map((t) => {
                const inTrack = lessons.filter((l) => l.trackId === t.id)
                const d = inTrack.filter((l) => done[l.progressSlug || l.slug]).length
                return <option key={t.id} value={t.id}>{t.name} ({d}/{inTrack.length})</option>
              })}
            </select>
          </div>

          <div className="ac-tools">
            <input className="ac-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search lessons, e.g. credit score" aria-label="Search lessons" />
            <span className="ac-showing" aria-live="polite">{visible.length} of {lessons.length} lessons</span>
          </div>

          {visible.length === 0 && (
            <div className="ac-empty">
              No lessons match “{query}”.
              <div><button type="button" className="ac-empty-btn" onClick={() => { setQuery(''); setTrack('all') }}>Show all lessons</button></div>
            </div>
          )}

          {shownTracks.map((t) => {
            const items = visible.filter((l) => l.trackId === t.id)
            const all = lessons.filter((l) => l.trackId === t.id)
            const d = all.filter((l) => done[l.progressSlug || l.slug]).length
            return (
              <section key={t.id} className="ac-track-section" aria-labelledby={`track-${t.id}`}>
                <header className="ac-track-head">
                  <div>
                    <h2 className="ac-track-h2" id={`track-${t.id}`}>{t.name}</h2>
                    <p className="ac-track-blurb">{t.blurb}</p>
                  </div>
                  <span className="ac-track-done">{d} of {all.length} done</span>
                </header>
                <div className="ac-cards">
                  {items.map((l) => (
                    <a key={l.slug} className="ac-card" href={`/academy/${l.slug}`}>
                      <div className="ac-card-art">
                        <img src={`/academy/thumbnails/${l.progressSlug || l.slug}.svg`} alt="" width={640} height={280} loading="lazy" />
                      </div>
                      <div className="ac-card-body">
                        <h3 className="ac-card-title">{l.title}</h3>
                        <p className="ac-card-text">{l.excerpt}</p>
                        <span className="ac-card-meta"><span className={done[l.progressSlug || l.slug] ? 'ac-card-num ac-card-num-done' : 'ac-card-num'} aria-hidden="true">{done[l.progressSlug || l.slug] ? <Check size={12} /> : l.n}</span><Clock size={11} aria-hidden="true" /> {l.readMins} min{done[l.progressSlug || l.slug] ? ' · Completed' : ''}<span className="ac-card-open">Explore lesson <ArrowRight size={13} aria-hidden="true" /></span></span>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
      </div>}
    </>
  )
}

function TrackButton({ active, onClick, icon, name, count }) {
  return (
    <button type="button" className={active ? 'ac-track-btn ac-track-btn-on' : 'ac-track-btn'} aria-pressed={active} onClick={onClick}>
      <TrackIcon name={icon} />
      <span className="ac-track-name">{name}</span>
      <span className="ac-track-count">{count}</span>
    </button>
  )
}
