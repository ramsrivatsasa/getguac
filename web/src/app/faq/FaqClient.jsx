'use client'
// Help-centre style FAQ: one search box over every answer, a banner per topic,
// and a single-open accordion.
//
// WHY A CLIENT COMPONENT
// The page used native <details> elements, which cannot be filtered by a search
// box and cannot be coordinated (every one of the 82 answers could sit open at
// once). Search + "one answer open at a time" both need state, so the rendering
// moved here. page.jsx stays a server component so the metadata and the FAQPage
// JSON-LD are still generated on the server from the same faq-data module.
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  HelpCircle, Search, ShieldCheck, ReceiptText, Sparkles,
  CircleDollarSign, Rocket, ArrowRight, X, TrendingUp, ShoppingCart, Users, Eye,
} from 'lucide-react'
import { FAQ_GROUPS, PRIORITY_FAQS, GROUP_META, START_HERE, ALL_FAQS, FEATURED_CARDS, sectionId } from './faq-data'

// GROUP_META and FEATURED_CARDS name their icon as a string so faq-data stays
// free of imports.
const ICONS = { Rocket, ShieldCheck, ReceiptText, Sparkles, CircleDollarSign, HelpCircle, TrendingUp, ShoppingCart, Users, Search, Eye }

// 🔴 ASCII ONLY, NO COMMENTS, NO CHILD COMBINATORS INSIDE THIS STRING.
// It is rendered as the text child of a React <style>, and the server escapes
// >, &, ' and " differently from the client — that mismatch has taken this
// page's markup out in production twice. Keep selectors flat and plain.
const FAQ_CSS = `
.gg-faq-hero { position:relative; overflow:hidden; background:radial-gradient(circle at 82% 12%,rgba(184,239,82,.32),transparent 27%),linear-gradient(145deg,#f7f3df 0%,#eef7e7 58%,#fff 100%); }
.gg-faq-hero-inner { position:relative; z-index:1; display:grid; grid-template-columns:minmax(0,1.08fr) minmax(330px,.92fr); gap:52px; align-items:center; }
.gg-faq-proof { position:relative; width:100%; max-width:520px; margin:0 auto; }
.gg-faq-lime-dot { position:absolute; width:100px; height:100px; border-radius:999px; left:-22px; top:-20px; background:#b8ef52; }
.gg-faq-people { position:relative; height:390px; overflow:hidden; border-radius:32px; background:#e8efdf; box-shadow:0 28px 70px -34px rgba(22,51,31,.58); }
.gg-faq-people img { object-fit:cover; object-position:center; }
.gg-faq-photo-copy { position:absolute; z-index:2; right:18px; bottom:-20px; max-width:300px; padding:15px 18px; border-radius:17px; color:#173d27; background:#fff; box-shadow:0 16px 34px rgba(22,51,31,.18); }
.gg-faq-photo-copy strong { display:block; font-size:15px; line-height:1.25; letter-spacing:-.01em; }
.gg-faq-photo-copy span { display:block; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.11em; color:#8a958d; margin-bottom:5px; }

.gg-faq-searchband { border-bottom:1px solid #e8eee5; background:#fff; }
.gg-faq-searchwrap { max-width:760px; margin:0 auto; }
.gg-faq-searchtitle { text-align:center; color:#183322; font-size:15px; font-weight:800; }
.gg-faq-searchsub { text-align:center; color:#69756c; font-size:13px; margin-top:4px; }
.gg-faq-searchbox { position:relative; margin-top:16px; }
.gg-faq-searchbox svg { position:absolute; left:20px; top:50%; transform:translateY(-50%); color:#7b8a7f; pointer-events:none; }
.gg-faq-input { width:100%; border:1px solid #dfe9dc; border-radius:999px; background:#fff; padding:17px 54px 17px 52px; font-size:16px; color:#203a29; box-shadow:0 10px 30px rgba(31,64,44,.06); outline:none; transition:border-color .15s ease, box-shadow .15s ease; }
.gg-faq-input:focus { border-color:#84a92d; box-shadow:0 0 0 4px rgba(132,169,45,.16); }
.gg-faq-input::placeholder { color:#93a098; }
.gg-faq-clear { position:absolute; right:14px; top:50%; transform:translateY(-50%); width:30px; height:30px; border-radius:999px; border:none; background:#eef2ec; color:#4a5b50; display:grid; place-items:center; cursor:pointer; }
.gg-faq-clear:hover { background:#e2eadd; }
.gg-faq-resultline { text-align:center; margin-top:12px; font-size:13px; color:#69756c; min-height:19px; }
.gg-faq-resultline strong { color:#24402f; }

.gg-faq-featured-head { text-align:center; margin-bottom:22px; }
.gg-faq-featured-head h2 { font-size:34px; color:#16331f; margin:0; }
.gg-faq-featured-head p { margin:8px auto 0; max-width:620px; color:#69756c; font-size:15px; line-height:1.6; }
.gg-faq-featured { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; align-items:start; }
.gg-faq-feature { display:flex; flex-direction:column; height:100%; border:1px solid #e3ebdf; border-radius:26px; padding:26px; background:#fff; box-shadow:0 18px 44px -30px rgba(22,51,31,.45); }
.gg-faq-feature-top { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
.gg-faq-feature-icon { width:46px; height:46px; flex:none; border-radius:15px; display:grid; place-items:center; color:#fff; background:linear-gradient(145deg,#4d7c0f,#76a91f); box-shadow:0 8px 22px rgba(77,124,15,.24); }
.gg-faq-kicker { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.13em; color:#8a958d; }
.gg-faq-feature h3 { margin:2px 0 0; font-size:21px; line-height:1.2; color:#16331f; font-family:var(--font-bricolage),sans-serif; letter-spacing:-.02em; font-weight:800; }
.gg-faq-feature-body { color:#58655d; font-size:14px; line-height:1.75; margin:0; }
.gg-faq-compare { display:grid; gap:10px; margin-top:16px; }
.gg-faq-compare-row { border-radius:14px; padding:13px 15px; background:#f7f8f6; border:1px solid #eaeee8; }
.gg-faq-compare-good { background:#f4f9ea; border-color:#e0edcb; }
.gg-faq-compare-row strong { display:block; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.09em; color:#7c8a80; margin-bottom:4px; }
.gg-faq-compare-good strong { color:#4d7c0f; }
.gg-faq-compare-row span { display:block; color:#3f5147; font-size:13.5px; line-height:1.6; }
.gg-faq-feature-wide { grid-column:1 / -1; }
.gg-faq-feature-wide .gg-faq-feature-body { max-width:none; }
.gg-faq-bullets { list-style:none; padding:0; margin:16px 0 0; display:grid; gap:12px; }
.gg-faq-feature-wide .gg-faq-bullets { grid-template-columns:repeat(3,minmax(0,1fr)); gap:18px; }
.gg-faq-bullets li { position:relative; padding-left:22px; color:#58655d; font-size:13.5px; line-height:1.65; }
.gg-faq-dot { position:absolute; left:0; top:7px; width:9px; height:9px; border-radius:3px; background:#b8ef52; border:1px solid #93c635; }
.gg-faq-bullets strong { display:block; color:#294733; font-size:14px; margin-bottom:2px; }
.gg-faq-value { margin-top:16px; padding:14px 16px; border-radius:14px; border-left:3px solid #84a92d; background:#f6f9ef; }
.gg-faq-value strong { display:block; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.09em; color:#4d7c0f; margin-bottom:4px; }
.gg-faq-value span { display:block; color:#33513e; font-size:13.5px; line-height:1.65; }
.gg-faq-feature-foot { display:flex; flex-wrap:wrap; align-items:center; gap:14px; margin-top:auto; padding-top:16px; }
.gg-faq-feature-link { display:inline-flex; align-items:center; gap:6px; font-size:13px; font-weight:800; color:#4d7c0f; }
.gg-faq-feature-link:hover { color:#3c630b; }
.gg-faq-feature-source { font-size:12px; color:#8a958d; text-decoration:underline; }
.gg-faq-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
.gg-faq-card { border:1px solid #dfe9dc; border-radius:18px; padding:18px; background:rgba(255,255,255,.88); box-shadow:0 10px 30px rgba(31,64,44,.05); }
.gg-faq-card svg { color:#4d7c0f; }
.gg-faq-card h2 { font-size:18px; margin:10px 0 4px; color:#183322; }
.gg-faq-card p { color:#647067; font-size:13px; line-height:1.55; }

.gg-faq-section { scroll-margin-top:90px; }
.gg-faq-banner { display:flex; align-items:flex-start; gap:18px; padding:26px 28px; margin-bottom:14px; border:1px solid #e3ebdf; border-radius:26px; background:#fff; box-shadow:0 18px 44px -26px rgba(22,51,31,.42); }
.gg-faq-banner-icon { width:56px; height:56px; flex:none; border-radius:18px; display:grid; place-items:center; color:#4d7c0f; background:#eef7e0; }
.gg-faq-banner-text { flex:1; min-width:0; }
.gg-faq-banner h2 { margin:0; font-size:32px; line-height:1.1; color:#16331f; }
.gg-faq-banner p { margin:8px 0 0; color:#69756c; font-size:15px; line-height:1.5; }
.gg-faq-count { flex:none; align-self:center; padding:7px 14px; border-radius:999px; background:#f3f8ec; color:#456b16; font-size:13px; font-weight:800; white-space:nowrap; }

.gg-faq-item { border:1px solid #e0e8df; border-radius:16px; background:#fff; box-shadow:0 4px 18px rgba(31,64,44,.04); overflow:hidden; scroll-margin-top:100px; }
.gg-faq-item + .gg-faq-item { margin-top:10px; }
.gg-faq-trigger { width:100%; display:flex; align-items:center; justify-content:space-between; gap:20px; padding:19px 20px; background:none; border:none; text-align:left; font:inherit; font-weight:750; color:#203a29; cursor:pointer; }
.gg-faq-trigger:hover { background:#fafcf8; }
.gg-faq-plus { width:26px; height:26px; border-radius:999px; background:#eef7e0; color:#4d7c0f; display:grid; place-items:center; font-size:20px; line-height:1; flex:none; transition:transform .2s ease; }
.gg-faq-item-open .gg-faq-plus { transform:rotate(45deg); }
.gg-faq-panel { display:grid; grid-template-rows:0fr; transition:grid-template-rows .26s ease; }
.gg-faq-panel-open { grid-template-rows:1fr; }
.gg-faq-panel-inner { overflow:hidden; }
.gg-faq-answer { border-top:1px solid #edf1ec; padding:5px 20px 20px; color:#58655d; font-size:14px; line-height:1.75; }
.gg-faq-answer p { margin:13px 0 0; }
.gg-faq-answer h3, .gg-faq-answer h4 { color:#294733; margin:17px 0 2px; font-size:15px; letter-spacing:0; }
.gg-faq-list { padding-left:20px; margin:10px 0 0; list-style:disc; }
.gg-faq-list li { margin:3px 0; }
.gg-faq-answer blockquote, .gg-faq-callout { margin:13px 0 0; padding:10px 13px; border-left:3px solid #84a92d; background:#f6f9ef; color:#294733; border-radius:0 8px 8px 0; }
.gg-faq-mark { background:#e6f7b8; color:#2c4a1c; border-radius:4px; padding:0 2px; }
.gg-faq-qwrap { min-width:0; }
.gg-faq-snippet { display:block; margin-top:6px; font-size:12.5px; font-weight:500; line-height:1.5; color:#77857c; }
.gg-faq-empty { text-align:center; border:1px dashed #d5e2d0; border-radius:22px; padding:44px 24px; background:#fbfdf9; }
.gg-faq-empty h2 { font-size:22px; color:#183322; margin:0 0 6px; }
.gg-faq-empty p { color:#69756c; font-size:14px; }

@media (max-width:860px) { .gg-faq-hero-inner { grid-template-columns:1fr; gap:42px; } .gg-faq-proof { max-width:520px; width:100%; margin:0 auto 20px; } }
@media (max-width:900px) { .gg-faq-featured { grid-template-columns:1fr; } .gg-faq-featured-head h2 { font-size:27px; } .gg-faq-feature-wide .gg-faq-bullets { grid-template-columns:1fr; gap:12px; } }
@media (max-width:760px) { .gg-faq-grid { grid-template-columns:1fr 1fr; } .gg-faq-feature { padding:20px; border-radius:22px; } .gg-faq-feature h3 { font-size:19px; } .gg-faq-banner { display:block; padding:20px; } .gg-faq-banner h2 { font-size:25px; } .gg-faq-banner-icon { margin-bottom:12px; } .gg-faq-count { display:inline-block; margin-top:12px; } }
@media (max-width:520px) { .gg-faq-grid { grid-template-columns:1fr; } .gg-faq-trigger { padding:17px 16px; } .gg-faq-answer { padding:4px 16px 18px; } .gg-faq-banner-icon { width:46px; height:46px; border-radius:15px; } .gg-faq-banner h2 { font-size:22px; } }
`

function formatInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => part.startsWith('**') && part.endsWith('**')
    ? <strong key={i}>{part.slice(2, -2)}</strong>
    : part)
}

function RichAnswer({ body }) {
  const lines = body.split('\n')
  const blocks = []
  let list = []

  const flushList = () => {
    if (!list.length) return
    blocks.push(<ul key={'list-' + blocks.length} className="gg-faq-list">{list.map((item, i) => <li key={i}>{formatInline(item)}</li>)}</ul>)
    list = []
  }

  lines.forEach((raw, i) => {
    const line = raw.trim()
    if (!line) { flushList(); return }
    if (/^[-*] /.test(line)) { list.push(line.slice(2)); return }
    flushList()
    if (/^### /.test(line)) blocks.push(<h4 key={i}>{formatInline(line.slice(4))}</h4>)
    else if (/^## /.test(line)) blocks.push(<h3 key={i}>{formatInline(line.slice(3))}</h3>)
    else if (/^# /.test(line)) blocks.push(<p key={i} className="gg-faq-callout">{formatInline(line.slice(2))}</p>)
    else if (/^> /.test(line)) blocks.push(<blockquote key={i}>{formatInline(line.slice(2))}</blockquote>)
    else blocks.push(<p key={i}>{formatInline(line)}</p>)
  })
  flushList()
  return <div className="gg-faq-answer">{blocks}</div>
}

// Wraps every occurrence of the search term so a hit is visible without opening
// the answer. Case-insensitive, and the term is escaped before it reaches the
// RegExp — a stray "(" typed into the box would otherwise throw on every
// keystroke and blank the page.
function Highlight({ text, term }) {
  if (!term) return text
  const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${safe})`, 'ig'))
  return parts.map((part, i) => part.toLowerCase() === term.toLowerCase()
    ? <mark key={i} className="gg-faq-mark">{part}</mark>
    : <span key={i}>{part}</span>)
}

// Most hits match on the answer body, not the question — searching "return"
// returns 18 answers whose titles never say the word. Without this the result
// list looks arbitrary, so pull the sentence around the match and show it under
// the question, with the term highlighted there too.
function snippetFor(body, needle) {
  const flat = body.replace(/[#*>_]/g, '').replace(/\s+/g, ' ').trim()
  const at = flat.toLowerCase().indexOf(needle)
  if (at < 0) return ''
  let start = Math.max(0, at - 55)
  let end = Math.min(flat.length, at + needle.length + 75)
  // Snap to word boundaries so the snippet does not start mid-word ("...ter,
  // the headphones" instead of "...later, the headphones").
  if (start > 0) {
    const space = flat.indexOf(' ', start)
    if (space > -1 && space < at) start = space + 1
  }
  if (end < flat.length) {
    const space = flat.lastIndexOf(' ', end)
    if (space > at + needle.length) end = space
  }
  return `${start > 0 ? '...' : ''}${flat.slice(start, end).trim()}${end < flat.length ? '...' : ''}`
}

// Stable DOM id for one answer, so a feature card can link straight at it.
const itemDomId = (sid, index) => `faq-${sid}-${index}`

// Questions are matched on a normalised form: the copy uses curly quotes and
// the card content is written separately, so an exact-string lookup silently
// resolves to nothing and the link goes nowhere. Punctuation and case are
// stripped before comparing.
const normQ = (s) => s.toLowerCase().replace(/[‘’“”"']/g, '').replace(/\s+/g, ' ').trim()

export default function FaqClient() {
  const [query, setQuery] = useState('')
  // One answer open at a time, across the whole page — that is what makes this
  // an accordion rather than 82 independent toggles.
  const [openKey, setOpenKey] = useState('start-here::0')
  const resultsRef = useRef(null)

  const sections = useMemo(() => [
    { name: START_HERE.name, id: sectionId(START_HERE.name), icon: START_HERE.icon, blurb: START_HERE.blurb, items: PRIORITY_FAQS },
    ...Object.entries(FAQ_GROUPS).map(([name, items]) => ({
      name, id: sectionId(name), icon: GROUP_META[name].icon, blurb: GROUP_META[name].blurb, items,
    })),
  ], [])

  // question -> where that answer lives, so the feature cards can open it.
  const answerIndex = useMemo(() => {
    const map = new Map()
    sections.forEach((s) => s.items.forEach((f, i) => {
      map.set(normQ(f.q), { key: `${s.id}::${i}`, domId: itemDomId(s.id, i) })
    }))
    return map
  }, [sections])

  // 🔴 SCROLL ONLY AFTER THE ACCORDION HAS SETTLED.
  // Opening one answer closes the previous one, and the panel open/close is a
  // 260ms transition. Scrolling on the next frame starts the browser moving
  // while ~400px of collapsing content is still above the target, so the smooth
  // scroll finishes ~200px past it and the answer sits off the top of the
  // screen. Measured: topPx -230, -193, -168 before this delay existed.
  const SETTLE_MS = 340
  const scrollToAnswer = (domId, behavior = 'smooth') => {
    window.setTimeout(() => {
      document.getElementById(domId)?.scrollIntoView({ behavior, block: 'start' })
    }, SETTLE_MS)
  }

  // Open the answer a card points at, then bring it into view.
  const openAnswer = (question, e) => {
    const hit = answerIndex.get(normQ(question))
    if (!hit) return
    if (e) e.preventDefault()
    setQuery('')
    setOpenKey(hit.key)
    scrollToAnswer(hit.domId)
    if (window.history?.replaceState) window.history.replaceState(null, '', `#${hit.domId}`)
  }

  // A shared #faq-... link must land on an OPEN answer, not a closed row.
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash.startsWith('faq-')) return
    for (const hit of answerIndex.values()) {
      if (hit.domId === hash) {
        setOpenKey(hit.key)
        scrollToAnswer(hash, 'auto')
        return
      }
    }
  }, [answerIndex])

  const term = query.trim()
  const needle = term.toLowerCase()

  const filtered = useMemo(() => {
    if (!needle) return sections
    return sections
      .map((s) => ({ ...s, items: s.items.filter((f) => `${f.q}\n${f.body}`.toLowerCase().includes(needle)) }))
      .filter((s) => s.items.length)
  }, [needle, sections])

  const matchCount = filtered.reduce((n, s) => n + s.items.length, 0)

  // Opening the first hit as you type means the answer is on screen without a
  // second click; clearing the box restores the default first-answer-open state.
  //
  // 🔴 ONLY ACTS ON A REAL QUERY TRANSITION — never on a bare mount run.
  // It used to reset openKey whenever the query was empty, which includes the
  // mount pass, and React StrictMode invokes effects TWICE in dev. So the hash
  // effect above would open the linked answer and this one immediately reset it
  // to the first answer: every shared #faq-... link landed on the wrong row.
  // Guarding on the previous value makes it idempotent under double-invocation.
  const prevNeedle = useRef('')
  useEffect(() => {
    const prev = prevNeedle.current
    prevNeedle.current = needle
    if (needle) {
      const first = filtered[0]
      setOpenKey(first ? `${first.id}::0` : '')
    } else if (prev) {
      setOpenKey('start-here::0')
    }
  }, [needle]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalAnswers = ALL_FAQS.length

  return (
    <>
      <style>{FAQ_CSS}</style>

      <section className="gg-faq-hero">
        <div className="gg-faq-hero-inner max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-16 sm:pb-20">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-emerald-900/10 text-emerald-800 text-xs font-black uppercase tracking-[.16em]">
              <Sparkles size={14} /> Help centre
            </span>
            <h1 className="text-5xl sm:text-7xl font-black tracking-tight mt-6 leading-[.98] text-[#16331f]">Why scan it?<br/><span className="text-lime-600">Because the total hides the story.</span></h1>
            <p className="text-lg text-[#48614d] mt-6 max-w-xl leading-8">Checking a receipt confirms today&rsquo;s charge. Saving it helps reveal price changes, mixed-cart spending, return deadlines, warranties, and the purchases quietly shaping your budget.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/join?try=receipt" className="btn-primary inline-flex items-center gap-2">Try one receipt <ArrowRight size={16}/></Link>
              <a href="#start-here" className="btn-secondary">Read the stories</a>
            </div>
            <p className="mt-4 text-xs text-[#68776d]">No bank password. No spreadsheet. Start with one receipt that matters.</p>
          </div>

          <div className="gg-faq-proof" aria-label="A family scanning a grocery receipt together">
            <span className="gg-faq-lime-dot" aria-hidden="true" />
            <div className="gg-faq-people">
              <Image src="/get-started/people-receipt-habits-v1.png" alt="A family reviewing and scanning a grocery receipt together" fill priority sizes="(max-width: 860px) 90vw, 44vw" />
            </div>
            <div className="gg-faq-photo-copy"><span>The GetGuac promise</span><strong>See it. Understand it. Keep more.</strong></div>
          </div>
        </div>
      </section>

      <section className="gg-faq-searchband px-4 sm:px-6 py-10">
        <div className="gg-faq-searchwrap">
          <p className="gg-faq-searchtitle">Search our answers to find what you need</p>
          <p className="gg-faq-searchsub">{totalAnswers} answers across {sections.length} topics</p>
          <form className="gg-faq-searchbox" role="search" onSubmit={(e) => e.preventDefault()}>
            <Search size={19} aria-hidden="true" />
            <input
              className="gg-faq-input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search answers, e.g. returns, email, privacy"
              aria-label="Search the FAQ"
            />
            {query && (
              <button type="button" className="gg-faq-clear" onClick={() => setQuery('')} aria-label="Clear search">
                <X size={16} />
              </button>
            )}
          </form>
          <p className="gg-faq-resultline" aria-live="polite">
            {term
              ? (matchCount
                  ? <span><strong>{matchCount}</strong> {matchCount === 1 ? 'answer' : 'answers'} match &ldquo;{term}&rdquo;</span>
                  : <span>No answers match &ldquo;{term}&rdquo;</span>)
              : ''}
          </p>
        </div>
      </section>

      {!term && (
        <section aria-labelledby="what-receipts-show" className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 pb-2">
          <div className="gg-faq-featured-head">
            <h2 id="what-receipts-show">What the receipt shows that the total cannot</h2>
            <p>Four things a bank line will never tell you — and one that is being done to you while you shop.</p>
          </div>
          <div className="gg-faq-featured">
            {FEATURED_CARDS.map((card) => {
              const Icon = ICONS[card.icon] || ReceiptText
              return (
                <article key={card.title} className={`gg-faq-feature${card.wide ? ' gg-faq-feature-wide' : ''}`}>
                  <div className="gg-faq-feature-top">
                    <span className="gg-faq-feature-icon" aria-hidden="true"><Icon size={22}/></span>
                    <div>
                      <span className="gg-faq-kicker">{card.kicker}</span>
                      <h3>{card.title}</h3>
                    </div>
                  </div>
                  <p className="gg-faq-feature-body">{card.body}</p>

                  {card.compare && (
                    <div className="gg-faq-compare">
                      {card.compare.map((row) => (
                        <div key={row.label} className={`gg-faq-compare-row${row.good ? ' gg-faq-compare-good' : ''}`}>
                          <strong>{row.label}</strong><span>{row.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {card.bullets && (
                    <ul className="gg-faq-bullets">
                      {card.bullets.map((b) => (
                        <li key={b.label}>
                          <span className="gg-faq-dot" aria-hidden="true" />
                          <strong>{b.label}</strong>{b.text}
                        </li>
                      ))}
                    </ul>
                  )}

                  {card.callout && (
                    <div className="gg-faq-value">
                      <strong>{card.callout.label}</strong><span>{card.callout.text}</span>
                    </div>
                  )}

                  <div className="gg-faq-feature-foot">
                    {card.link && answerIndex.get(normQ(card.link.q)) && (
                      <a
                        href={`#${answerIndex.get(normQ(card.link.q)).domId}`}
                        className="gg-faq-feature-link"
                        onClick={(e) => openAnswer(card.link.q, e)}
                      >
                        {card.link.label} <ArrowRight size={14}/>
                      </a>
                    )}
                    {card.source && (
                      <a href={card.source.href} className="gg-faq-feature-source" target="_blank" rel="noreferrer noopener">
                        {card.source.label}
                      </a>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {!term && (
        <nav aria-label="FAQ topics" className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-4">
          <div className="gg-faq-grid">
            {Object.entries(FAQ_GROUPS).map(([name, faqs]) => {
              const Icon = ICONS[GROUP_META[name].icon]
              return (
                <a key={name} href={'#' + sectionId(name)} className="gg-faq-card hover:border-lime-400 hover:-translate-y-0.5 transition">
                  <Icon size={21}/><h2>{name}</h2><p>{GROUP_META[name].blurb} &middot; {faqs.length} answers</p>
                </a>
              )
            })}
          </div>
        </nav>
      )}

      <div ref={resultsRef} className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 pb-20 space-y-14">
        {filtered.map((section) => {
          const Icon = ICONS[section.icon] || HelpCircle
          return (
            <section key={section.id} id={section.id} className="gg-faq-section">
              <div className="gg-faq-banner">
                <span className="gg-faq-banner-icon" aria-hidden="true"><Icon size={26}/></span>
                <div className="gg-faq-banner-text">
                  <h2>{section.name}</h2>
                  <p>{section.blurb}</p>
                </div>
                <span className="gg-faq-count">{section.items.length} {section.items.length === 1 ? 'answer' : 'answers'}</span>
              </div>

              {section.items.map((faq, index) => {
                const key = `${section.id}::${index}`
                const isOpen = openKey === key
                const snippet = needle && !faq.q.toLowerCase().includes(needle)
                  ? snippetFor(faq.body, needle)
                  : ''
                return (
                  <div key={faq.q} id={itemDomId(section.id, index)} className={`gg-faq-item${isOpen ? ' gg-faq-item-open' : ''}`}>
                    <h3 style={{ margin: 0 }}>
                      <button
                        type="button"
                        className="gg-faq-trigger"
                        aria-expanded={isOpen}
                        aria-controls={`panel-${section.id}-${index}`}
                        onClick={() => setOpenKey(isOpen ? '' : key)}
                      >
                        <span className="gg-faq-qwrap">
                          <span><Highlight text={faq.q} term={term} /></span>
                          {snippet && <span className="gg-faq-snippet"><Highlight text={snippet} term={term} /></span>}
                        </span>
                        <span className="gg-faq-plus" aria-hidden="true">+</span>
                      </button>
                    </h3>
                    <div className={`gg-faq-panel${isOpen ? ' gg-faq-panel-open' : ''}`} id={`panel-${section.id}-${index}`} role="region">
                      <div className="gg-faq-panel-inner">
                        <RichAnswer body={faq.body}/>
                      </div>
                    </div>
                  </div>
                )
              })}
            </section>
          )
        })}

        {term && !matchCount && (
          <div className="gg-faq-empty">
            <h2>Nothing matched &ldquo;{term}&rdquo;</h2>
            <p>Try a shorter word — or email us and a person will answer.</p>
            <div className="mt-5 flex flex-wrap gap-3 justify-center">
              <button type="button" className="btn-secondary" onClick={() => setQuery('')}>Clear search</button>
              <a href="mailto:hello@getguac.app" className="btn-primary">Email GetGuac</a>
            </div>
          </div>
        )}

        <section className="rounded-[28px] bg-[#173522] text-white p-7 sm:p-10 text-center">
          <p className="text-lime-300 font-bold text-sm uppercase tracking-wider">Have a different question?</p>
          <h2 className="text-3xl sm:text-4xl mt-2">We&rsquo;re here to help.</h2>
          <p className="text-white/70 mt-3">Email hello@getguac.app or start free and ask Guac.</p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link href="/register" className="btn-primary">Get Started Free</Link>
            <a href="mailto:hello@getguac.app" className="btn-secondary bg-white">Email GetGuac</a>
          </div>
        </section>
      </div>
    </>
  )
}
