'use client'

import { useState } from 'react'
import './join-plan-hero.css'

export default function JoinPlanHero({ onTryReceipt }) {
  const [income, setIncome] = useState('4,200')
  const [target, setTarget] = useState(420)
  const [error, setError] = useState('')
  function calculate(event) {
    event.preventDefault()
    const amount = Number(income.replace(/[$,\s]/g, ''))
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) {
      setError('Enter a monthly income above $0 and up to $1,000,000.')
      return
    }
    setError('')
    setTarget(amount / 10)
  }
  return <section className="jp-hero" aria-labelledby="jp-title">
    <div className="jd-wrap jp-grid">
      <div>
        <span className="jp-pill">Your money. Your priorities. Your 10%.</span>
        <h1 id="jp-title">Find your <span>10%.</span></h1>
        <p className="jp-lede">Keep more of what you bring home. Use your receipts, bills, and spending records to choose practical changes and track your progress.</p>
        <div className="jp-calculator">
          <label htmlFor="jp-income">What is your monthly take-home income?</label>
          <form onSubmit={calculate}>
            <div className="jp-field"><span aria-hidden="true">$</span><input id="jp-income" inputMode="decimal" autoComplete="off" value={income} onChange={event => setIncome(event.target.value)} aria-invalid={Boolean(error)} aria-describedby="jp-result jp-note"/><b>/ month</b></div>
            <button type="submit">Show my 10%</button>
          </form>
          {error && <p role="alert">{error}</p>}
          <p id="jp-result" aria-live="polite">Your 10% target: <strong>{target.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })} a month.</strong></p>
          <p id="jp-note" className="jp-note">A goal to work toward, not guaranteed savings. This calculation stays on your device.</p>
        </div>
        <div className="jp-actions"><a href="/register" className="jp-primary">Start free trial →</a><button type="button" onClick={onTryReceipt}>📷 Try 1 receipt</button><a href="/find-your-10" className="jp-how">See how it works ↗</a></div>
        <p className="jp-note"><strong>30 days free, then US$4.99/month.</strong></p>
        <p className="jp-note">Optional AI credits: US$2.99/month. Coming soon.</p>
        <p className="jp-note">Try 1 receipt previews receipt parsing. Your plan starts separately.</p>
      </div>
      <div className="jp-visual">
        <img className="jp-family" src="/home/story-people/openai-hero-giggling-family-baby-v2.webp" alt="A family laughing together while using a tablet" width="1536" height="1024" fetchPriority="high"/>
        <img className="jp-phone" src="/home/goals/phone-organized.webp" alt="GetGuac organized purchases and spending insights" width="360" height="757"/>
        <span className="jp-bubble jp-understand"><small>Understand spending</small><strong>See where your money goes</strong></span>
        <span className="jp-bubble jp-choose"><small>Choose an action</small><strong>Review a bill or repeat buy</strong></span>
        <span className="jp-bubble jp-track"><small>Track progress</small><strong>Follow your monthly target</strong></span>
      </div>
    </div>
  </section>
}
