// Public /how-it-works page — auto-scrolling infographic presentation of
// the GetGuac flow. Each step is a self-contained slide with an inline
// SVG illustration, AI-mascot avatars, and a narrated voiceover via the
// browser SpeechSynthesis API (no audio file needed). Press Play and the
// presentation scrolls itself; pause/skip/mute controls live in the
// bottom-right. Prints as a clean PDF if you Ctrl/Cmd-P.

'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import GuacMascot from '../../components/GuacMascot'
import {
  Sparkles, Copy, BarChart3, ThumbsUp, ShieldCheck, ArrowRight,
  Smartphone, Globe, Receipt, Tag, Play, Pause, Volume2, VolumeX,
  ChevronLeft, ChevronRight,
} from 'lucide-react'

// ─── Slide content ────────────────────────────────────────────────────────
// Adding/removing a slide = edit this array. Narration is the voiceover
// SpeechSynthesis reads aloud when that slide enters view.
const SLIDES = [
  {
    n: 'hero',
    accent: 'emerald',
    type: 'hero',
    title: 'From receipt to insight, in seconds.',
    narration: 'Welcome to GetGuac. Snap a photo, forward an email, or drop in a credit-card statement — and Guac-AI turns every receipt into searchable, scored, categorized spending data. Here is how it works, end to end.',
    durationMs: 9000,
  },
  {
    n: 1,
    accent: 'emerald',
    icon: <Receipt size={26} className="text-emerald-700" />,
    title: 'Get a receipt',
    subtitle: 'Three ways in',
    bullets: [
      ['Camera', 'Snap a paper receipt from the mobile app — single shot or batch of up to three at a time.'],
      ['Email', 'Forward an e-receipt to your free you+g@getguac.app inbox. It auto-files in 10 minutes.'],
      ['Statement', 'Drop a credit-card PDF on the Statements page — every transaction becomes a receipt row.'],
    ],
    art: 'capture',
    narration: 'Step one. Get a receipt into GetGuac one of three ways. Snap it with your phone camera — paper receipts, even faded ones. Forward an emailed receipt to your free at-getguac.app inbox, which files itself in about ten minutes. Or drop in a credit-card statement PDF and every line becomes a receipt row.',
    aiPeople: ['camera', 'email', 'statement'],
    durationMs: 13000,
  },
  {
    n: 2,
    accent: 'lime',
    icon: <Sparkles size={26} className="text-lime-700" />,
    title: 'Guac-AI reads it',
    subtitle: '5–15 seconds',
    bullets: [
      ['Store + date + total', 'Tax, payment method, last-4 of the card. Even handwritten totals on faded paper.'],
      ['Itemized line items', 'Every SKU, qty, price. Items become history you can search by name.'],
      ['Refund policies', 'Printed on the receipt? Captured. Not printed? Curated store defaults fill the gap.'],
    ],
    art: 'parse',
    narration: 'Step two. Guac-AI reads the receipt. Within five to fifteen seconds, it extracts the store name, date, total, tax, payment method, and the last four digits of your card. Every line item — sku, quantity, price — becomes searchable history. Refund policies printed on the receipt are captured; for the rest, curated store defaults fill in the gaps.',
    aiPeople: ['gemini', 'groq', 'ocr'],
    durationMs: 13000,
  },
  {
    n: 3,
    accent: 'amber',
    icon: <Copy size={26} className="text-amber-700" />,
    title: 'Duplicates get caught',
    subtitle: 'Capture-time + sweep',
    bullets: [
      ['Same receipt, twice', "Two camera shots of the same restaurant bill won't both land in the table."],
      ['Email + camera', 'Forward an Amazon receipt and snap the box — Guac-AI notices the match.'],
      ['Smart matching', 'Normalized store names + ±1 cent tolerance — GLORY DAYS GRILL still equals Glory Days Grill.'],
    ],
    art: 'dedup',
    narration: 'Step three. Duplicates get caught automatically. Snap the same receipt twice, or forward the Amazon email after photographing the box — Guac-AI notices the match using normalized store names and a one-cent tolerance on the total. Three duplicate rows become one keeper.',
    aiPeople: ['sleuth'],
    durationMs: 11000,
  },
  {
    n: 4,
    accent: 'sky',
    icon: <Tag size={26} className="text-sky-700" />,
    title: 'Auto-categorize',
    subtitle: 'Rules + AI',
    bullets: [
      ['12 built-in categories', 'Groceries, dining, gas, electronics, home, charity, and more — out of the box.'],
      ['Your own categories', 'Add custom ones — Pet, Yoga, Side Hustle — with their own emoji and color.'],
      ['Bulk auto-categorize', 'One button on Receipts assigns the obvious ones; you confirm or override the rest.'],
    ],
    art: 'categorize',
    narration: 'Step four. Receipts get categorized automatically. Twelve built-in categories cover groceries, dining, gas, electronics, home, charity, and more. Add your own custom categories with their own emoji and color. One bulk button assigns the obvious ones using rules plus AI; you confirm or override the rest.',
    aiPeople: ['tagger'],
    durationMs: 12000,
  },
  {
    n: 5,
    accent: 'indigo',
    icon: <BarChart3 size={26} className="text-indigo-700" />,
    title: 'See where it all went',
    subtitle: 'Dashboard + Reports',
    bullets: [
      ['Spending by Store', "Top merchants by dollar, grouped across name variants so Amazon doesn't split into five bars."],
      ['Category breakdown', '1M / 3M / 1Y / all-time slices, with tax separated out for business filing.'],
      ['Repeat purchases', 'Items you bought again — track price drift on the things you actually use.'],
    ],
    art: 'dashboard',
    narration: 'Step five. See where it all went. The dashboard shows your top stores by dollar, grouped across name variants so Amazon does not split into five bars. Reports break spending down by category over one month, three months, a year, or all time. Repeat purchases are tracked so you can see price drift on the things you actually buy.',
    aiPeople: ['analyst'],
    durationMs: 12000,
  },
  {
    n: 6,
    accent: 'rose',
    icon: <ThumbsUp size={26} className="text-rose-700" />,
    title: 'Worth it?',
    subtitle: 'Decision feedback loop',
    bullets: [
      ['Rate every purchase', 'Five-star Worth-It rating per receipt — takes 2 seconds.'],
      ['GuacScore', 'A single number for how well you are spending that tightens as low-rated purchases drop off.'],
      ['Bank Bite', 'Interest, fees, penalties from your statements — the wizard nudges you when they are avoidable.'],
    ],
    art: 'worthIt',
    narration: 'Step six. Worth it? Rate every purchase with a quick five-star Worth-It score. Your GuacScore — a single number for how well you are spending — tightens as low-rated purchases drop off. The Bank Bite watcher flags interest, fees, and penalties on your statements so you can avoid them next month.',
    aiPeople: ['judge'],
    durationMs: 12000,
  },
  {
    n: 'closing',
    accent: 'emerald',
    type: 'closing',
    title: 'Every receipt stays in your account.',
    narration: 'Every receipt, every photo, every parsed item lives in your account, protected by row-level security at the database. GetGuac literally cannot query your data without your token. No selling, no ad targeting, no resale of merchant data. Welcome to GetGuac.',
    durationMs: 11000,
  },
]

export default function HowItWorksPage() {
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [current, setCurrent] = useState(0)
  const slideRefs = useRef([])
  const advanceTimer = useRef(null)

  // ─── Narration via Web Speech API ───────────────────────────────────────
  const speak = useCallback((text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    if (muted) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    // Prefer a friendly English voice if available — Chrome ships with several.
    const voices = window.speechSynthesis.getVoices()
    const friendly = voices.find(v => /en/i.test(v.lang) && /female|samantha|google|aria|jenny|english/i.test(v.name))
        ?? voices.find(v => /en/i.test(v.lang))
    if (friendly) utter.voice = friendly
    utter.rate = 1.0
    utter.pitch = 1.05
    window.speechSynthesis.speak(utter)
  }, [muted])

  const stopSpeaking = useCallback(() => {
    if (typeof window === 'undefined') return
    window.speechSynthesis?.cancel()
  }, [])

  // ─── Scroll the active slide into view ──────────────────────────────────
  const scrollTo = useCallback((idx, withNarration = true) => {
    const el = slideRefs.current[idx]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setCurrent(idx)
    if (withNarration && SLIDES[idx]?.narration) {
      // Slight delay so the scroll lands before the voice starts.
      setTimeout(() => speak(SLIDES[idx].narration), 600)
    }
  }, [speak])

  // ─── Auto-advance timer ─────────────────────────────────────────────────
  useEffect(() => {
    if (!playing) {
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
      stopSpeaking()
      return
    }
    const slide = SLIDES[current]
    if (!slide) return
    advanceTimer.current = setTimeout(() => {
      if (current >= SLIDES.length - 1) {
        setPlaying(false) // reached the end
        return
      }
      scrollTo(current + 1)
    }, slide.durationMs || 11000)
    return () => clearTimeout(advanceTimer.current)
  }, [playing, current, scrollTo, stopSpeaking])

  const togglePlay = () => {
    if (!playing) {
      // Starting from anywhere — re-narrate current slide.
      setPlaying(true)
      if (SLIDES[current]?.narration) speak(SLIDES[current].narration)
    } else {
      setPlaying(false)
    }
  }
  const toggleMute = () => {
    setMuted(m => {
      if (!m) stopSpeaking()
      return !m
    })
  }
  const skip = (dir) => {
    const next = Math.max(0, Math.min(SLIDES.length - 1, current + dir))
    scrollTo(next, true)
  }

  // Cleanup speech on unmount
  useEffect(() => () => stopSpeaking(), [stopSpeaking])

  // ─── Track which slide is in view via IntersectionObserver ──────────────
  // (Lets manual user scroll also update the current-slide indicator.)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && e.intersectionRatio > 0.55) {
          const idx = Number(e.target.dataset.idx)
          if (!isNaN(idx) && idx !== current) setCurrent(idx)
        }
      })
    }, { threshold: [0.55] })
    slideRefs.current.forEach(el => el && obs.observe(el))
    return () => obs.disconnect()
  }, [current])

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-lime-50 text-gray-800 font-sans">
      {/* Top nav */}
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-emerald-100 print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-lime-300 via-emerald-400 to-emerald-700 shadow-md ring-2 ring-white flex items-center justify-center text-lg">🥑</div>
            <div className="leading-none">
              <div className="text-base font-black tracking-tight text-emerald-900">GetGuac</div>
              <div className="text-[9px] text-emerald-600 font-semibold uppercase tracking-wider mt-0.5">how it works</div>
            </div>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/" className="font-semibold text-gray-600 hover:text-emerald-800">Home</Link>
            <Link href="/how-email-works" className="hidden sm:inline font-semibold text-gray-600 hover:text-emerald-800">Email</Link>
            <Link href="/security" className="hidden sm:inline font-semibold text-gray-600 hover:text-emerald-800">Security</Link>
            <Link href="/download" className="hidden sm:inline font-semibold text-gray-600 hover:text-emerald-800">Download</Link>
            <Link href="/register" className="btn-primary">Get started</Link>
          </nav>
        </div>
      </header>

      {/* Slides */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6">
        {SLIDES.map((slide, idx) => (
          <section
            key={idx}
            ref={el => (slideRefs.current[idx] = el)}
            data-idx={idx}
            className={`min-h-[calc(100vh-4rem)] flex items-center py-10 print:break-after-page print:min-h-0 ${
              current === idx ? 'opacity-100' : 'opacity-95'
            } transition-opacity`}
          >
            {slide.type === 'hero' && <HeroSlide slide={slide} />}
            {slide.type === 'closing' && <ClosingSlide slide={slide} />}
            {!slide.type && <StepSlide slide={slide} idx={idx} />}
          </section>
        ))}
      </main>

      {/* Floating presentation controls (hidden on print) */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 print:hidden">
        <div className="flex items-center gap-2 bg-emerald-900/95 text-white px-3 py-2 rounded-full shadow-2xl ring-1 ring-emerald-800">
          <button
            onClick={() => skip(-1)}
            disabled={current === 0}
            aria-label="Previous slide"
            className="w-9 h-9 rounded-full hover:bg-white/10 disabled:opacity-40 flex items-center justify-center transition"
          ><ChevronLeft size={18} /></button>
          <button
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
            className="w-11 h-11 rounded-full bg-lime-400 text-emerald-900 hover:bg-lime-300 flex items-center justify-center shadow-md transition"
          >{playing ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}</button>
          <button
            onClick={() => skip(1)}
            disabled={current === SLIDES.length - 1}
            aria-label="Next slide"
            className="w-9 h-9 rounded-full hover:bg-white/10 disabled:opacity-40 flex items-center justify-center transition"
          ><ChevronRight size={18} /></button>
          <div className="w-px h-6 bg-white/20 mx-1" />
          <button
            onClick={toggleMute}
            aria-label={muted ? 'Unmute narration' : 'Mute narration'}
            className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition"
          >{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
          <span className="text-xs font-mono tabular-nums pr-1 pl-1 opacity-80">
            {current + 1}/{SLIDES.length}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Slide layouts                                                           */
/* ─────────────────────────────────────────────────────────────────────── */

function HeroSlide({ slide }) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-6 flex-wrap">
        <GuacMascot expression="celebrating" size={160} />
        <div className="flex-1 min-w-[280px]">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
            <Sparkles size={12} /> How GetGuac works
          </span>
          <h1 className="text-3xl sm:text-6xl font-black tracking-tight text-gray-900 mt-3 leading-tight">
            From receipt<br />
            <span className="bg-gradient-to-br from-emerald-500 via-lime-500 to-amber-500 bg-clip-text text-transparent">to insight, in seconds.</span>
          </h1>
          <p className="text-lg text-gray-600 mt-3 max-w-2xl">
            Forward an email, snap a photo, or import a credit-card statement — Guac-AI does the rest. Press <strong className="text-emerald-700">Play</strong> to watch the whole flow.
          </p>
          <div className="mt-5 flex gap-2 flex-wrap">
            <Pill icon={<Smartphone size={12} />}>Mobile</Pill>
            <Pill icon={<Globe size={12} />}>Web</Pill>
            <Pill icon={<ShieldCheck size={12} />}>Private by default</Pill>
          </div>
        </div>
      </div>
    </div>
  )
}

function ClosingSlide({ slide }) {
  return (
    <div className="w-full">
      <div className="rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-lime-700 text-white p-8 sm:p-12 shadow-xl">
        <div className="flex items-start gap-6 flex-wrap">
          <GuacMascot expression="thumbsup" size={140} />
          <div className="flex-1 min-w-[260px]">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider">
              <ShieldCheck size={12} /> Yours, only yours
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight mt-3 leading-tight">
              {slide.title}
            </h2>
            <p className="text-emerald-50/90 mt-3 max-w-2xl">
              Row-level security at the database means GetGuac literally can&apos;t query your data without your token. No selling, no ad targeting, no resale of merchant data.
            </p>
            <div className="mt-5 flex gap-3 flex-wrap">
              <Link href="/register" className="inline-flex items-center gap-2 bg-white text-emerald-800 px-5 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition">
                Get started <ArrowRight size={16} />
              </Link>
              <Link href="/download" className="inline-flex items-center gap-2 bg-white/10 ring-1 ring-white/30 text-white px-5 py-3 rounded-xl font-bold hover:bg-white/20 transition">
                Download mobile app
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepSlide({ slide, idx }) {
  const A = ACCENTS[slide.accent] || ACCENTS.emerald
  const reverse = idx % 2 === 0
  return (
    <article className={`w-full ${A.bg} rounded-3xl ring-1 ${A.ring} p-6 sm:p-10 shadow-sm`}>
      <div className={`flex gap-8 items-center flex-wrap ${reverse ? 'sm:flex-row-reverse' : ''}`}>
        <div className="flex-1 min-w-[280px]">
          <div className="flex items-center gap-3 mb-2">
            <div className={`${A.num} text-white w-9 h-9 rounded-full flex items-center justify-center font-black text-base shadow`}>{slide.n}</div>
            <span className={`${A.sub} text-xs font-bold uppercase tracking-wider`}>{slide.subtitle}</span>
          </div>
          <h3 className="text-2xl sm:text-4xl font-black text-gray-900 flex items-center gap-3 mb-4">
            {slide.icon}{slide.title}
          </h3>
          <ul className="space-y-3">
            {slide.bullets.map(([label, body], i) => (
              <li key={i} className="flex gap-3 items-start">
                <div className="w-2 h-2 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                <div>
                  <span className="font-bold text-gray-900">{label}.</span>{' '}
                  <span className="text-gray-700">{body}</span>
                </div>
              </li>
            ))}
          </ul>
          {slide.aiPeople && <AiPeopleStrip people={slide.aiPeople} />}
        </div>
        <div className="flex-shrink-0 mx-auto sm:mx-0">
          <Art name={slide.art} />
        </div>
      </div>
    </article>
  )
}

const ACCENTS = {
  emerald: { bg: 'bg-emerald-50', ring: 'ring-emerald-200', num: 'bg-emerald-600', sub: 'text-emerald-700' },
  lime:    { bg: 'bg-lime-50',    ring: 'ring-lime-200',    num: 'bg-lime-600',    sub: 'text-lime-700' },
  amber:   { bg: 'bg-amber-50',   ring: 'ring-amber-200',   num: 'bg-amber-600',   sub: 'text-amber-700' },
  sky:     { bg: 'bg-sky-50',     ring: 'ring-sky-200',     num: 'bg-sky-600',     sub: 'text-sky-700' },
  indigo:  { bg: 'bg-indigo-50',  ring: 'ring-indigo-200',  num: 'bg-indigo-600',  sub: 'text-indigo-700' },
  rose:    { bg: 'bg-rose-50',    ring: 'ring-rose-200',    num: 'bg-rose-600',    sub: 'text-rose-700' },
}

function Pill({ icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-emerald-200 text-emerald-700 text-xs font-bold">
      {icon}{children}
    </span>
  )
}

// ─── "AI people" strip ─────────────────────────────────────────────────
// Little avocado-headed avatars that represent the AI agents involved at
// each step. Keeps the brand mascot front-and-centre while making the
// "what's working under the hood" feel concrete.
function AiPeopleStrip({ people }) {
  const ROLES = {
    camera:    { emoji: '📷', label: 'Camera scout' },
    email:     { emoji: '📬', label: 'Email watcher' },
    statement: { emoji: '🏦', label: 'Statement reader' },
    gemini:    { emoji: '✨', label: 'Gemini vision' },
    groq:      { emoji: '⚡', label: 'Groq fallback' },
    ocr:       { emoji: '🔠', label: 'OCR cleanup' },
    sleuth:    { emoji: '🔍', label: 'Dedup sleuth' },
    tagger:    { emoji: '🏷️', label: 'Auto-tagger' },
    analyst:   { emoji: '📊', label: 'Insight analyst' },
    judge:     { emoji: '⚖️', label: 'Worth-It judge' },
  }
  return (
    <div className="mt-5 flex gap-3 flex-wrap items-center">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Under the hood</span>
      {people.map((p) => {
        const r = ROLES[p] || { emoji: '🤖', label: p }
        return (
          <div key={p} className="flex items-center gap-2 bg-white border border-gray-200 rounded-full pl-1.5 pr-3 py-1 shadow-sm">
            <span className="relative w-8 h-8 rounded-full bg-gradient-to-br from-lime-300 via-emerald-400 to-emerald-700 flex items-center justify-center shadow-inner">
              <span className="absolute -top-0.5 -right-0.5 text-[12px] leading-none">{r.emoji}</span>
              <span className="text-base leading-none">🥑</span>
            </span>
            <span className="text-xs font-bold text-gray-700">{r.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Art dispatch ─────────────────────────────────────────────────────
function Art({ name }) {
  switch (name) {
    case 'capture':    return <ArtCapture />
    case 'parse':      return <ArtParse />
    case 'dedup':      return <ArtDedup />
    case 'categorize': return <ArtCategorize />
    case 'dashboard':  return <ArtDashboard />
    case 'worthIt':    return <ArtWorthIt />
    default: return null
  }
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Infographic SVGs                                                        */
/* ─────────────────────────────────────────────────────────────────────── */

function ArtCapture() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs>
        <linearGradient id="cap-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d1fae5" />
          <stop offset="1" stopColor="#bef264" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="200" height="180" rx="20" fill="url(#cap-bg)" />
      <rect x="74" y="30" width="52" height="86" rx="8" fill="#064e3b" />
      <rect x="78" y="34" width="44" height="76" rx="4" fill="#ecfdf5" />
      <circle cx="100" cy="72" r="14" fill="#15803d" />
      <circle cx="100" cy="72" r="9" fill="#064e3b" />
      <circle cx="103" cy="69" r="2.5" fill="#a3e635" />
      <g transform="translate(20 120)">
        <rect x="0" y="0" width="60" height="50" rx="3" fill="#fff" stroke="#94a3b8" />
        <line x1="6" y1="10" x2="44" y2="10" stroke="#cbd5e1" strokeWidth="2" />
        <line x1="6" y1="18" x2="40" y2="18" stroke="#cbd5e1" strokeWidth="2" />
        <line x1="6" y1="26" x2="50" y2="26" stroke="#cbd5e1" strokeWidth="2" />
        <line x1="6" y1="38" x2="30" y2="38" stroke="#cbd5e1" strokeWidth="2" />
      </g>
      <g transform="translate(125 130)">
        <rect x="0" y="0" width="50" height="34" rx="3" fill="#fff" stroke="#94a3b8" />
        <path d="M0 0 L25 18 L50 0" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
      </g>
    </svg>
  )
}

function ArtParse() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs>
        <linearGradient id="parse-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ecfccb" />
          <stop offset="1" stopColor="#d9f99d" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="200" height="180" rx="20" fill="url(#parse-bg)" />
      <g transform="translate(15 25)">
        <rect width="65" height="130" rx="3" fill="#fff" stroke="#a3a3a3" />
        <line x1="6" y1="14" x2="59" y2="14" stroke="#d4d4d8" strokeWidth="2.5" />
        <line x1="6" y1="24" x2="40" y2="24" stroke="#e4e4e7" strokeWidth="1.5" />
        <line x1="6" y1="32" x2="50" y2="32" stroke="#e4e4e7" strokeWidth="1.5" />
        <line x1="6" y1="40" x2="35" y2="40" stroke="#e4e4e7" strokeWidth="1.5" />
        <line x1="6" y1="48" x2="44" y2="48" stroke="#e4e4e7" strokeWidth="1.5" />
        <line x1="6" y1="80" x2="59" y2="80" stroke="#a3a3a3" strokeWidth="0.5" />
        <text x="32" y="100" fontSize="11" fontWeight="700" fill="#0f172a" textAnchor="middle">$24.74</text>
      </g>
      <g stroke="#65a30d" strokeWidth="2.5" fill="none" strokeLinecap="round">
        <path d="M85 90 L110 90" />
        <polygon points="110,87 117,90 110,93" fill="#65a30d" />
      </g>
      <g transform="translate(125 60)">
        <rect x="0" y="0" width="60" height="60" rx="14" fill="#15803d" />
        <text x="30" y="42" fontSize="34" textAnchor="middle">🥑</text>
      </g>
      <g transform="translate(120 130)">
        <rect x="0" y="0" width="70" height="14" rx="3" fill="#fff" stroke="#84cc16" />
        <text x="35" y="10" fontSize="8" fontWeight="700" fill="#3f6212" textAnchor="middle">store · date · $</text>
        <rect x="0" y="18" width="50" height="14" rx="3" fill="#fff" stroke="#84cc16" />
        <text x="25" y="28" fontSize="8" fontWeight="700" fill="#3f6212" textAnchor="middle">items[ ]</text>
      </g>
    </svg>
  )
}

function ArtDedup() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs>
        <linearGradient id="dup-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fef3c7" />
          <stop offset="1" stopColor="#fde68a" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="200" height="180" rx="20" fill="url(#dup-bg)" />
      <g transform="translate(25 30)">
        <rect x="0" y="0" width="55" height="70" rx="3" fill="#fff" stroke="#d97706" />
        <rect x="6" y="6" width="55" height="70" rx="3" fill="#fff" stroke="#d97706" />
        <rect x="12" y="12" width="55" height="70" rx="3" fill="#fff" stroke="#d97706" strokeWidth="1.5" />
        <line x1="18" y1="22" x2="62" y2="22" stroke="#cbd5e1" strokeWidth="2" />
        <line x1="18" y1="32" x2="50" y2="32" stroke="#cbd5e1" strokeWidth="1.5" />
        <line x1="18" y1="40" x2="58" y2="40" stroke="#cbd5e1" strokeWidth="1.5" />
        <text x="40" y="62" fontSize="10" fontWeight="700" fill="#9a3412" textAnchor="middle">$24.74</text>
      </g>
      <g stroke="#b45309" strokeWidth="2.5" fill="none" strokeLinecap="round">
        <path d="M105 95 L130 95" />
        <polygon points="130,92 137,95 130,98" fill="#b45309" />
      </g>
      <g transform="translate(140 60)">
        <rect x="0" y="0" width="45" height="58" rx="3" fill="#fff" stroke="#15803d" strokeWidth="2" />
        <line x1="6" y1="12" x2="38" y2="12" stroke="#cbd5e1" strokeWidth="2" />
        <line x1="6" y1="22" x2="30" y2="22" stroke="#cbd5e1" strokeWidth="1.5" />
        <text x="22" y="40" fontSize="10" fontWeight="700" fill="#065f46" textAnchor="middle">$24.74</text>
        <circle cx="22" cy="50" r="5" fill="#15803d" />
        <path d="M19 50 L21 52 L25 48" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <text x="100" y="160" fontSize="10" fontWeight="700" fill="#92400e" textAnchor="middle">3 duplicates → 1 keeper</text>
    </svg>
  )
}

function ArtCategorize() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs>
        <linearGradient id="cat-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e0f2fe" />
          <stop offset="1" stopColor="#bae6fd" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="200" height="180" rx="20" fill="url(#cat-bg)" />
      <g transform="translate(15 25)">
        <rect width="55" height="80" rx="3" fill="#fff" stroke="#94a3b8" />
        <line x1="6" y1="14" x2="49" y2="14" stroke="#cbd5e1" strokeWidth="2" />
        <line x1="6" y1="24" x2="40" y2="24" stroke="#e4e4e7" strokeWidth="1.5" />
        <line x1="6" y1="32" x2="48" y2="32" stroke="#e4e4e7" strokeWidth="1.5" />
        <line x1="6" y1="40" x2="32" y2="40" stroke="#e4e4e7" strokeWidth="1.5" />
      </g>
      <g stroke="#0369a1" strokeWidth="2.5" fill="none" strokeLinecap="round">
        <path d="M76 65 L100 65" />
        <polygon points="100,62 107,65 100,68" fill="#0369a1" />
      </g>
      <g transform="translate(110 25)">
        <rect x="0" y="0" width="78" height="22" rx="11" fill="#dcfce7" stroke="#86efac" />
        <text x="14" y="15" fontSize="11">🛒</text>
        <text x="50" y="14" fontSize="9" fontWeight="700" fill="#065f46" textAnchor="middle">Groceries</text>
      </g>
      <g transform="translate(110 52)">
        <rect x="0" y="0" width="78" height="22" rx="11" fill="#fef3c7" stroke="#fcd34d" />
        <text x="14" y="15" fontSize="11">🍽️</text>
        <text x="48" y="14" fontSize="9" fontWeight="700" fill="#92400e" textAnchor="middle">Dining</text>
      </g>
      <g transform="translate(110 79)">
        <rect x="0" y="0" width="78" height="22" rx="11" fill="#ede9fe" stroke="#c4b5fd" />
        <text x="14" y="15" fontSize="11">⛽</text>
        <text x="48" y="14" fontSize="9" fontWeight="700" fill="#5b21b6" textAnchor="middle">Gas</text>
      </g>
      <g transform="translate(110 106)">
        <rect x="0" y="0" width="78" height="22" rx="11" fill="#fce7f3" stroke="#f9a8d4" />
        <text x="14" y="15" fontSize="11">🐕</text>
        <text x="48" y="14" fontSize="9" fontWeight="700" fill="#9d174d" textAnchor="middle">Pet (custom)</text>
      </g>
    </svg>
  )
}

function ArtDashboard() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs>
        <linearGradient id="dash-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e0e7ff" />
          <stop offset="1" stopColor="#c7d2fe" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="200" height="180" rx="20" fill="url(#dash-bg)" />
      <g transform="translate(20 25)">
        <text x="0" y="0" fontSize="9" fontWeight="800" fill="#312e81">Spending by Store</text>
        <rect x="0"   y="14" width="22" height="80" rx="3" fill="#6366f1" />
        <rect x="28"  y="34" width="22" height="60" rx="3" fill="#818cf8" />
        <rect x="56"  y="50" width="22" height="44" rx="3" fill="#a5b4fc" />
        <rect x="84"  y="62" width="22" height="32" rx="3" fill="#c7d2fe" />
        <rect x="112" y="74" width="22" height="20" rx="3" fill="#e0e7ff" stroke="#a5b4fc" />
        <line x1="-2" y1="94" x2="142" y2="94" stroke="#312e81" strokeWidth="0.6" />
        <g fontSize="7" fontWeight="700" fill="#312e81" textAnchor="middle">
          <text x="11"  y="106">Amzn</text>
          <text x="39"  y="106">Costco</text>
          <text x="67"  y="106">Target</text>
          <text x="95"  y="106">Lowe&apos;s</text>
          <text x="123" y="106">CVS</text>
        </g>
        <g transform="translate(0 125)">
          <rect x="0" y="0" width="60" height="18" rx="3" fill="#fff" stroke="#a5b4fc" />
          <text x="30" y="12" fontSize="8" fontWeight="700" fill="#312e81" textAnchor="middle">Last 90 days</text>
        </g>
      </g>
    </svg>
  )
}

function ArtWorthIt() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs>
        <linearGradient id="worth-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe4e6" />
          <stop offset="1" stopColor="#fecdd3" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="200" height="180" rx="20" fill="url(#worth-bg)" />
      <g transform="translate(60 26)">
        <circle cx="40" cy="40" r="32" fill="none" stroke="#fda4af" strokeWidth="10" />
        <circle cx="40" cy="40" r="32" fill="none" stroke="#15803d" strokeWidth="10"
                strokeDasharray="160 200" strokeLinecap="round" transform="rotate(-90 40 40)" />
        <text x="40" y="40" fontSize="18" fontWeight="900" fill="#0f172a" textAnchor="middle">82</text>
        <text x="40" y="54" fontSize="7" fontWeight="700" fill="#475569" textAnchor="middle">GuacScore</text>
      </g>
      <g transform="translate(50 120)">
        <text x="0"   y="12" fontSize="16">⭐</text>
        <text x="22"  y="12" fontSize="16">⭐</text>
        <text x="44"  y="12" fontSize="16">⭐</text>
        <text x="66"  y="12" fontSize="16">⭐</text>
        <text x="88"  y="12" fontSize="16" opacity="0.4">⭐</text>
      </g>
      <text x="100" y="160" fontSize="10" fontWeight="700" fill="#9f1239" textAnchor="middle">Worth-It · per receipt</text>
    </svg>
  )
}
