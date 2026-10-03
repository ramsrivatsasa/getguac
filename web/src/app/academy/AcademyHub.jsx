'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, Clock } from 'lucide-react'
import { TrackIcon } from './icons'
import { readDone, onDoneChange } from './progress'

// The hub: track filter (sidebar on desktop, chips on mobile), search, lessons
// grouped under their track, and a progress card that always offers the next
// unfinished lesson. Progress reads after mount so the server HTML is identical
// for every visitor.
export default function AcademyHub({ tracks, lessons }) {
  const [done, setDoneState] = useState({})
  const [track, setTrack] = useState('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    setDoneState(readDone())
    return onDoneChange(setDoneState)
  }, [])

  const doneCount = lessons.filter((l) => done[l.slug]).length
  const pct = Math.round((doneCount / lessons.length) * 100)
  const next = lessons.find((l) => !done[l.slug]) || lessons[0]

  const q = query.trim().toLowerCase()
  const visible = useMemo(() => lessons.filter((l) => {
    if (track !== 'all' && l.trackId !== track) return false
    if (!q) return true
    return `${l.title} ${l.excerpt} ${l.trackName}`.toLowerCase().includes(q)
  }), [lessons, track, q])

  const shownTracks = tracks.filter((t) => visible.some((l) => l.trackId === t.id))

  return (
    <>
      <section className="ac-hero">
        <div className="ac-hero-copy">
          <span className="ac-eyebrow">GetGuac Academy</span>
          <h1 className="ac-h1">Learn money one clear lesson at a time.</h1>
          <p className="ac-lede">Every GetGuac lesson in one course: the idea, a plan you can follow, a worked example with real arithmetic, and one thing to try today.</p>
          <div className="ac-stats">
            <span className="ac-stat">{lessons.length} lessons</span>
            <span className="ac-stat">{tracks.length} tracks</span>
            <span className="ac-stat">Free, no account needed</span>
          </div>
        </div>
        <aside className="ac-progress-card" aria-label="Your progress">
          <div>
            <div className="ac-progress-label">Your progress</div>
            <div className="ac-progress-num">{doneCount}<span className="ac-progress-of"> of {lessons.length} complete</span></div>
          </div>
          <div className="ac-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Lessons complete"><div className="ac-bar-fill" style={{ width: `${pct}%` }} /></div>
          <a className="ac-continue" href={`/academy/${next.slug}`}>
            <span className="ac-continue-title">{doneCount ? 'Continue' : 'Start'}: {next.title}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </aside>
      </section>

      <div className="ac-layout">
        <nav className="ac-side" aria-label="Tracks">
          <div className="ac-side-title">Tracks</div>
          <TrackButton active={track === 'all'} onClick={() => setTrack('all')} icon="BookOpen" name="All lessons" count={`${doneCount}/${lessons.length}`} />
          {tracks.map((t) => {
            const inTrack = lessons.filter((l) => l.trackId === t.id)
            const d = inTrack.filter((l) => done[l.slug]).length
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
                const d = inTrack.filter((l) => done[l.slug]).length
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
            const d = all.filter((l) => done[l.slug]).length
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
                      <span className={done[l.slug] ? 'ac-card-num ac-card-num-done' : 'ac-card-num'} aria-hidden="true">{done[l.slug] ? <Check size={15} /> : l.n}</span>
                      <div className="ac-card-body">
                        <h3 className="ac-card-title">{l.title}</h3>
                        <p className="ac-card-text">{l.excerpt}</p>
                        <span className="ac-card-meta"><Clock size={11} aria-hidden="true" /> {l.readMins} min{done[l.slug] ? ' · Completed' : ''}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
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
