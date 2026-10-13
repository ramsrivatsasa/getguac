'use client'

import { useEffect, useRef, useState } from 'react'
import { RotateCcw, ArrowRight, BookOpen } from 'lucide-react'
import { readScores, saveScore, onScoresChange } from './scores'

export function useScores() {
  const [scores, setScores] = useState({})
  useEffect(() => {
    setScores(readScores())
    return onScoresChange(setScores)
  }, [])
  return scores
}

// Same bands as gradeFor() in lib/bootcamp.js; duplicated here so the client
// bundle does not pull in the whole Academy.
function grade(pct, pass) {
  if (pct >= 90) return { label: 'Expert', note: 'You know this topic well. Move on to the next test.' }
  if (pct >= pass) return { label: 'Passed', note: 'Solid. Review the explanations you missed, then move on.' }
  if (pct >= 50) return { label: 'Almost there', note: 'Read the lesson once more and retake the test.' }
  return { label: 'Start with the lesson', note: 'Read the lesson first; the test will make more sense after it.' }
}

// Best-score badge for hub rows. Renders a neutral dash until the browser has
// read storage, so the server and first client render match.
export function ScoreBadge({ id }) {
  const s = useScores()[id]
  if (!s) return <span className="bc-badge bc-badge-none">Not taken</span>
  return <span className={s.best >= 70 ? 'bc-badge bc-badge-pass' : 'bc-badge bc-badge-try'}>Best {s.best}%</span>
}

export function OverallScore({ ids, total }) {
  const scores = useScores()
  const taken = ids.filter((id) => scores[id])
  const passed = taken.filter((id) => scores[id].best >= 70).length
  const avg = taken.length ? Math.round(taken.reduce((sum, id) => sum + scores[id].best, 0) / taken.length) : 0
  const firstOpen = ids.find((id) => !scores[id] || scores[id].best < 70)
  return (
    <div className="bc-overall">
      <span className="bc-overall-label">Your bootcamp score</span>
      <span className="bc-overall-num">{taken.length ? `${avg}%` : '--'}</span>
      <span className="bc-overall-sub">{passed} of {total} tests passed · {taken.length} taken</span>
      <div className="ac-bar" aria-hidden="true"><div className="ac-bar-fill" style={{ width: `${Math.round((passed / total) * 100)}%` }} /></div>
      {firstOpen && <a className="ac-continue" href={`/money-bootcamp/${firstOpen}`}><span>{taken.length ? 'Next test' : 'Start the first test'}</span><ArrowRight size={16} aria-hidden="true" /></a>}
      <span className="bc-overall-note">Scores stay in this browser. No sign-up needed.</span>
    </div>
  )
}

// The test itself. All questions are in the page HTML (readable without
// JavaScript and by search engines); answering reveals the explanation, and the
// score is saved once every question is answered.
export function BootcampTest({ id, questions, pass, lessonHref, nextHref, nextLabel, sourceTitles }) {
  const [picked, setPicked] = useState({})
  const [result, setResult] = useState(null)
  const resultRef = useRef(null)
  const answered = Object.keys(picked).length
  const correct = questions.filter((q, i) => picked[i] === q.answer).length
  const pct = Math.round((correct / questions.length) * 100)

  useEffect(() => {
    if (answered === questions.length && !result) {
      setResult(saveScore(id, correct, questions.length))
      setTimeout(() => { try { resultRef.current && resultRef.current.focus() } catch {} }, 50)
    }
  }, [answered, questions.length, result, id, correct])

  const retake = () => { setPicked({}); setResult(null); try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch {} }
  const g = grade(pct, pass)

  return (
    <section className="bc-test" aria-labelledby="bc-test-h">
      <div className="bc-test-bar">
        <h2 className="bc-test-h" id="bc-test-h">{questions.length} questions</h2>
        <span className="bc-test-count" aria-live="polite">{answered} of {questions.length} answered · {correct} correct</span>
        <div className="ac-bar bc-test-progress" aria-hidden="true"><div className="ac-bar-fill" style={{ width: `${Math.round((answered / questions.length) * 100)}%` }} /></div>
      </div>
      <ol className="ac-quiz">
        {questions.map((q, i) => {
          const choice = picked[i]
          const done = choice !== undefined
          return (
            <li key={i} className="ac-q bc-q">
              <span className="bc-q-kind">{q.kind}</span>
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
                  {q.from && sourceTitles && <> <a className="bc-from" href={`/academy/${q.from}`}>Lesson: {sourceTitles[q.from]}</a></>}
                </p>
              )}
            </li>
          )
        })}
      </ol>

      {result && (
        <div className="bc-result" ref={resultRef} tabIndex={-1} aria-live="polite">
          <div className="bc-result-score">
            <span className="bc-result-pct">{pct}%</span>
            <span className="bc-result-of">{correct} of {questions.length} correct</span>
          </div>
          <div className="bc-result-copy">
            <span className={pct >= pass ? 'bc-badge bc-badge-pass' : 'bc-badge bc-badge-try'}>{g.label}</span>
            <p className="bc-result-note">{g.note} {result.best > pct ? `Your best is ${result.best}%.` : ''}</p>
            <div className="bc-result-actions">
              <button type="button" className="bc-btn bc-btn-ghost" onClick={retake}><RotateCcw size={15} aria-hidden="true" /> Retake</button>
              {lessonHref && <a className="bc-btn bc-btn-ghost" href={lessonHref}><BookOpen size={15} aria-hidden="true" /> Review the lesson</a>}
              {nextHref && <a className="bc-btn bc-btn-dark" href={nextHref}>{nextLabel} <ArrowRight size={15} aria-hidden="true" /></a>}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
