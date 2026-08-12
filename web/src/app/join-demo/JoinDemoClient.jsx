'use client'

import { useEffect, useState } from 'react'
import JoinReceiptTrial from '../join/JoinReceiptTrial'
import './join-demo.css'

const CIRCLE_STAGES = [
  { name: 'Capture', icon: '▣', title: 'One receipt. One quick scan.', copy: 'Paper and digital receipts become searchable items instead of mystery totals.', metric: '2 ways in', detail: 'Photo scans and email receipts', slug: 'receipts' },
  { name: 'Understand', icon: '◎', title: 'See where every dollar went.', copy: 'Categories and item-level details turn one store total into a useful spending picture.', metric: '14 items', detail: 'Organized automatically', slug: 'organized' },
  { name: 'Remember', icon: '⌁', title: 'Your shopping memory, organized.', copy: 'Find what you bought without searching drawers, inboxes, or bank transactions.', metric: 'Searchable', detail: 'Purchases remembered', slug: 'stash' },
  { name: 'Prepare', icon: '☑', title: 'Start the next trip with a plan.', copy: 'Your buying history helps build a smarter list before you enter the store.', metric: 'Trip ready', detail: 'Less guessing', slug: 'smashlist' },
  { name: 'Shop smart', icon: '◇', title: 'Know when a price is worth it.', copy: 'Price context helps you buy, wait, or choose something better with confidence.', metric: 'Price context', detail: 'Before you buy', slug: 'steals' },
  { name: 'Protect', icon: '♢', title: 'Keep return money from disappearing.', copy: 'Return windows and pending refunds stay visible while there is still time to act.', metric: '5 days left', detail: 'Return window watched', slug: 'returns' },
  { name: 'Worth it', icon: '☆', title: 'Remember what deserved your money.', copy: 'Rate purchases so satisfaction and regret improve your next decision.', metric: 'Worth-It', detail: 'Real value remembered', slug: 'worth-it' },
  { name: 'Next trip', icon: '↻', title: 'Every trip makes the next one smarter.', copy: 'GetGuac learns your shopping rhythm and turns past receipts into better timing.', metric: 'Learned', detail: 'Your buying rhythm', slug: 'predictions' },
]

export default function JoinDemoClient() {
  const [trialSignal, setTrialSignal] = useState(0)
  const [heroZoomed, setHeroZoomed] = useState(false)
  const [circleStage, setCircleStage] = useState(0)
  const circle = CIRCLE_STAGES[circleStage]

  useEffect(() => {
    const close = (event) => { if (event.key === 'Escape') setHeroZoomed(false) }
    window.addEventListener('keydown', close)
    document.body.style.overflow = heroZoomed ? 'hidden' : ''
    return () => { window.removeEventListener('keydown', close); document.body.style.overflow = '' }
  }, [heroZoomed])

  const goToDemo = () => {
    setTrialSignal((value) => value + 1)
  }

  return (
    <main className="jd-page">
      <section className="jd-hero">
        <div className="jd-wrap jd-hero-grid">
          <div className="jd-copy">
            <span className="jd-kicker">Receipt intelligence · No bank login</span>
            <h1>See what you bought.<br/><em>Not just what you spent.</em></h1>
            <p className="jd-lede">Scan one receipt to organize every item, catch return deadlines, and understand where your money went.</p>
            <div className="jd-actions">
              <button className="jd-primary" type="button" onClick={goToDemo}>📷 Try 1 receipt</button>
              <a className="jd-google" href="/register">Start free with Google</a>
            </div>
            <div className="jd-store-row">
              <a className="jd-store" href="https://apps.apple.com/us/app/getguac/id6790993237"><b aria-hidden="true">●</b><span><small>Download on the</small><strong>App Store</strong></span></a>
              <a className="jd-store" href="https://play.google.com/store/apps/details?id=app.getguac.getguac"><b aria-hidden="true">▶</b><span><small>Get it on</small><strong>Google Play</strong></span></a>
            </div>
            <div className="jd-trust"><span>✓ Free forever</span><span>✓ No card required</span><span>✓ Delete anytime</span></div>
            <div className="jd-product-links"><a href="#intelligence"><b>◎</b> GuacScore</a><a href="#intelligence"><b>✦</b> GuacWizard</a><a href="#intelligence"><b>★</b> Worth It?</a></div>
          </div>

          {heroZoomed && <button className="jd-zoom-backdrop" type="button" aria-label="Close enlarged hero visual" onClick={() => setHeroZoomed(false)} />}
          <div className={`jd-transformation ${heroZoomed ? 'is-zoomed' : ''}`} aria-label="A bank charge and receipt becoming useful GetGuac purchase details" role="button" tabIndex={0} onClick={() => setHeroZoomed(true)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setHeroZoomed(true) }}>
            <button className="jd-zoom-control" type="button" aria-label={heroZoomed ? 'Close enlarged hero visual' : 'Enlarge hero visual'} onClick={(event) => { event.stopPropagation(); setHeroZoomed((value) => !value) }}>{heroZoomed ? '×' : '↗ Enlarge'}</button>
            <span className="jd-sees-label"><i aria-hidden="true">▥</i> What your bank sees</span>
            <div className="jd-bank-card">
              <div className="jd-bank-icon">▥</div><strong>TARGET</strong><b>$91.42</b>
            </div>
            <div className="jd-paper">
              <div className="jd-target-mark">◉ TARGET</div><small>EXPECT MORE. PAY LESS.</small>
              <p>St. Paul — Highland Park<br/>1200 Cleveland Ave S<br/>St. Paul, MN 55116</p>
              <i/>
              <div><span>GROCERY</span><b>$15.49</b><span>PAPER TOWELS</span><b>$3.29</b><span>ORANGE JUICE</span><b>$1.48</b><span>BANANAS</span><b>$4.79</b><span>HOUSEHOLD</span><b>$11.99</b><span>LAUNDRY DETERGENT</span><b>$2.99</b><span>DISH SOAP</span><b>$4.79</b><span>PERSONAL CARE</span><b>$3.49</b><span>TOOTHPASTE</span><b>$24.99</b></div>
              <footer><b>TOTAL</b><b>$91.42</b></footer>
            </div>
            <div className="jd-flow" aria-label="One scan organizes the receipt into useful money details">
              <small>ONE SCAN</small>
              <strong>Receipt understood</strong>
              <ul><li>14 items identified</li><li>Categories assigned</li><li>Returns calculated</li></ul>
              <span>→</span>
            </div>
            <div className="jd-result">
              <span className="jd-understands"><i aria-hidden="true">🥑</i> What GetGuac understands</span>
              <div className="jd-iphone-buttons" aria-hidden="true"><i/><i/><i/></div>
              <div className="jd-dynamic-island" aria-hidden="true"><i/></div>
              <div className="jd-phone-head"><b>🥑 GetGuac</b><span>•••</span></div>
              <div className="jd-result-main">
                <header className="jd-mobile-title"><span>Overview</span><b>This month</b></header>
                <div className="jd-result-stats"><article><i>♧</i><b>14</b><span>items organized</span></article><article><i>□</i><span>Return window</span><b>5 days left</b></article><article><i>↻</i><span>Repeat purchase</span><b>Paper towels</b></article></div>
                <section><header><b>By category</b><span>View all items →</span></header><div className="jd-chart"><i/><ul><li><b>Household</b><span>38% &nbsp; $34.46</span></li><li><b>Groceries</b><span>24% &nbsp; $21.74</span></li><li><b>Baby</b><span>22% &nbsp; $29.48</span></li><li><b>Personal Care</b><span>9% &nbsp; $11.77</span></li></ul></div></section>
                <div className="jd-good">✓ <span><b>Good news!</b> Most items are returnable.<small>5 days left to return 9 of 14 items.</small></span></div>
                <footer><span>Total spent</span><b>$91.42</b></footer>
              </div>
              <nav className="jd-phone-nav"><span>⌂<b>Home</b></span><span>▣<b>Items</b></span><span>＋<b>Add</b></span><span>↩<b>Returns</b></span><span>◎<b>Score</b></span></nav>
              <div className="jd-home-indicator" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      <section id="proof" className="jd-proof jd-wrap">
        <div className="jd-proof-card"><span className="jd-proof-icon">♧</span><div><h2>Every item organized</h2><p>Turn any receipt into a clear list of what you actually bought.</p></div></div>
        <div className="jd-proof-card"><span className="jd-proof-icon">□</span><div><h2>Return deadlines watched</h2><p>We track return windows so you never miss a deadline.</p></div></div>
        <div className="jd-proof-card"><span className="jd-proof-icon">♙</span><div><h2>No bank login required</h2><p>Your data stays private. We never connect to your bank.</p></div></div>
      </section>

      <section className="jd-circle">
        <div className="jd-wrap">
          <div className="jd-circle-head"><div><span className="jd-kicker">The GetGuac circle</span><h2>Every receipt makes the next trip smarter.</h2></div><div className="jd-circle-tabs" role="tablist">{CIRCLE_STAGES.map((stage, index) => <button key={stage.name} type="button" role="tab" aria-selected={circleStage === index} onClick={() => setCircleStage(index)}><i>{stage.icon}</i><span>{stage.name}</span></button>)}</div></div>
          <div className="jd-circle-line"><span style={{ width: `${((circleStage + 1) / CIRCLE_STAGES.length) * 100}%` }} /></div>
          <div className="jd-circle-sub"><p>GetGuac remembers the shopping so you do not have to—and learns from every trip.</p><a href="/how-it-works">See how GetGuac works →</a></div>
          <div className="jd-circle-stage"><div className="jd-circle-copy"><span>{circle.icon} {circle.name}</span><h3>{circle.title}</h3><div><b>{circle.copy}</b><p>✓ Real app screens</p><p>✓ Useful after checkout</p></div></div><div className="jd-circle-screen"><header><i>{circle.icon}</i><b>{circle.metric}</b><span>{circle.detail}</span></header><p>{circle.copy}</p><figure><img className="jd-circle-web" src={`/home/goals/web-${circle.slug}.webp`} alt={`${circle.name} in GetGuac web`} /><img className="jd-circle-phone" src={`/home/goals/phone-${circle.slug}.webp`} alt={`${circle.name} in GetGuac mobile`} /></figure></div></div>
          <p className="jd-circle-note">Real screens from the live app · demo data · web and mobile</p>
        </div>
      </section>

      <section id="intelligence" className="jd-intelligence">
        <div className="jd-wrap">
          <div className="jd-intro"><span className="jd-kicker">Beyond receipt storage</span><h2>Your receipts become money intelligence.</h2><p>Understand your habits, decide what deserves another dollar, and know what to do next.</p></div>
          <div className="jd-intel-grid">
            <article className="jd-intel-card jd-score"><div><span>◎ GUACSCORE</span><h3>See how your spending is really doing.</h3><p>A simple score turns scattered purchases into a financial signal you can improve.</p><a href="/guacscore">Explore GuacScore →</a></div><figure className="jd-card-phone"><i aria-hidden="true"/><img src="/home/goals/phone-guacscore.webp" alt="GuacScore inside the real GetGuac app" /></figure></article>
            <article className="jd-intel-card jd-wizard"><div><span>✦ GUACWIZARD</span><h3>Find the fees and leaks hiding in your money.</h3><p>Wizard Score and personalized insights show where money is slipping away and what to fix first.</p><a href="/goals/wizard.html">Meet GuacWizard →</a></div><figure className="jd-card-phone"><i aria-hidden="true"/><img src="/showcase/guacwizard.png" alt="The actual GuacWizard mobile screen with Wizard Score and money insights" /></figure></article>
            <article className="jd-intel-card jd-worth"><div><span>★ WORTH IT?</span><h3>Remember what was actually worth buying.</h3><p>Rate purchases so buyer's remorse becomes a better decision next time.</p><a href="/resources/worth-it.html">See Worth It →</a></div><figure className="jd-card-phone"><i aria-hidden="true"/><img src="/home/goals/phone-worth-it.webp" alt="Worth It inside the real GetGuac app" /></figure></article>
          </div>
          <p className="jd-real-note">Real screens from the GetGuac app · demo data</p>
        </div>
      </section>

      <section className="jd-last jd-wrap">
        <div><span>🥑</span><h2>One receipt is enough to start.</h2><p>No spreadsheet. No bank password. No card.</p></div>
        <button type="button" onClick={goToDemo}>Try one receipt free →</button>
      </section>
      <JoinReceiptTrial startSignal={trialSignal} />
    </main>
  )
}
