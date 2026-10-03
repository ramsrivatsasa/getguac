'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Circle } from 'lucide-react'
import { TrackIcon } from '../icons'
import { readDone, setDone, onDoneChange } from '../progress'

function useDone() {
  const [done, setDoneState] = useState({})
  useEffect(() => {
    setDoneState(readDone())
    return onDoneChange(setDoneState)
  }, [])
  return done
}

// Sidebar: every track, with the current track opened to its lessons. Rendered
// twice by the page — sticky sidebar on desktop, a collapsible panel on mobile.
export function TrackNav({ tracks, lessons, current }) {
  const done = useDone()
  const currentTrack = lessons.find((l) => l.slug === current)?.trackId
  return (
    <>
      {tracks.map((t) => {
        const inTrack = lessons.filter((l) => l.trackId === t.id)
        const d = inTrack.filter((l) => done[l.slug]).length
        const open = t.id === currentTrack
        return (
          <div key={t.id}>
            <a className={open ? 'ac-track-btn ac-track-btn-on' : 'ac-track-btn'} href={`/academy/${inTrack[0].slug}`} aria-current={open ? 'true' : undefined}>
              <TrackIcon name={t.icon} />
              <span className="ac-track-name">{t.name}</span>
              <span className="ac-track-count">{d}/{inTrack.length}</span>
            </a>
            {open && (
              <div className="ac-lesson-nav">
                {inTrack.map((l) => (
                  <a key={l.slug} className={l.slug === current ? 'ac-lesson-link ac-lesson-link-on' : 'ac-lesson-link'} href={`/academy/${l.slug}`} aria-current={l.slug === current ? 'page' : undefined}>
                    <span className={done[l.slug] ? 'ac-dot ac-dot-done' : 'ac-dot'} aria-hidden="true" />
                    <span>{l.title}{done[l.slug] ? <span className="sr-only"> (completed)</span> : null}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

// End-of-lesson check: multiple-choice questions with instant feedback and an
// explanation, then a worked puzzle whose answer is behind a disclosure. Answers
// are not stored — this is practice, not a test.
export function LessonCheck({ check }) {
  const [picked, setPicked] = useState({})
  const answered = Object.keys(picked).length
  const correct = check.questions.filter((q, i) => picked[i] === q.answer).length
  return (
    <section className="ac-section" aria-labelledby="ac-check">
      <span className="ac-section-eyebrow">Check your understanding</span>
      <h2 className="ac-section-h2" id="ac-check">Quick quiz</h2>
      <ol className="ac-quiz">
        {check.questions.map((q, i) => {
          const choice = picked[i]
          const done = choice !== undefined
          return (
            <li key={i} className="ac-q">
              <p className="ac-q-text">{i + 1}. {q.q}</p>
              <div className="ac-opts" role="group" aria-label={`Question ${i + 1} options`}>
                {q.options.map((opt, j) => {
                  let cls = 'ac-opt'
                  if (done && j === q.answer) cls = 'ac-opt ac-opt-right'
                  else if (done && j === choice) cls = 'ac-opt ac-opt-wrong'
                  return (
                    <button key={j} type="button" className={cls} disabled={done} aria-pressed={choice === j} onClick={() => setPicked((p) => ({ ...p, [i]: j }))}>
                      {opt}
                    </button>
                  )
                })}
              </div>
              {done && (
                <p className={choice === q.answer ? 'ac-why ac-why-right' : 'ac-why ac-why-wrong'} role="status">
                  <strong>{choice === q.answer ? 'Correct.' : 'Not quite.'}</strong> {q.why}
                </p>
              )}
            </li>
          )
        })}
      </ol>
      <div className="ac-score" aria-live="polite">
        {answered < check.questions.length
          ? `${answered} of ${check.questions.length} answered`
          : `You scored ${correct} of ${check.questions.length}.`}
        {answered > 0 && <button type="button" className="ac-retry" onClick={() => setPicked({})}>Try again</button>}
      </div>
      {check.puzzle && (
        <div className="ac-puzzle">
          <span className="ac-puzzle-eyebrow">Puzzle</span>
          <p className="ac-puzzle-q">{check.puzzle.q}</p>
          <details className="ac-puzzle-ans">
            <summary className="ac-puzzle-sum">Show the answer</summary>
            <p className="ac-puzzle-a"><strong>{check.puzzle.answer}</strong></p>
            <p className="ac-puzzle-steps">{check.puzzle.steps}</p>
          </details>
        </div>
      )}
    </section>
  )
}

// Complete toggle plus previous / next. Completing does not navigate on its
// own; the reader chooses when to move on.
export function LessonActions({ slug, prev, next }) {
  const done = useDone()
  const isDone = Boolean(done[slug])
  return (
    <div className="ac-actions">
      <button type="button" className={isDone ? 'ac-complete ac-complete-on' : 'ac-complete'} aria-pressed={isDone} onClick={() => setDone(slug, !isDone)}>
        {isDone ? <Check size={18} aria-hidden="true" /> : <Circle size={18} aria-hidden="true" />}
        {isDone ? 'Lesson completed' : 'Mark lesson complete'}
      </button>
      <div className="ac-pager">
        {prev && <a className="ac-pager-link" href={`/academy/${prev.slug}`}><ArrowLeft size={15} aria-hidden="true" />&nbsp;Previous</a>}
        {next
          ? <a className="ac-pager-link ac-pager-next" href={`/academy/${next.slug}`}>Next lesson&nbsp;<ArrowRight size={15} aria-hidden="true" /></a>
          : <a className="ac-pager-link ac-pager-next" href="/academy">Back to the Academy</a>}
      </div>
    </div>
  )
}
