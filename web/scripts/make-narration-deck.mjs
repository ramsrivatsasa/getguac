#!/usr/bin/env node
// =============================================================================
// Build the complete GetGuac tour deck (PDF) — narration + illustration +
// a concrete example on every slide. Includes the @getguac.app inbox slide.
// =============================================================================
// Narration = our current depth (real numbers/examples) reframed with the v2
// principles (feeling-first, calm & never preachy, two-beat taglines, the
// See clearly → Keep more → Watch it grow arc, free/private/yours trust).
//
//   node web/scripts/make-narration-deck.mjs            → marketing-assets/getguac-narration-final.pdf
//   node web/scripts/make-narration-deck.mjs --preview  → + PNG previews for QA
// =============================================================================

import { chromium } from 'playwright'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', '..', 'marketing-assets')
mkdirSync(OUT, { recursive: true })

const ARC = { see: 'See clearly', keep: 'Keep more', grow: 'Watch it grow' }

// ── Illustrations (self-contained SVG, ~260x200) ────────────────────────────
const ART = {
  flow: `<svg viewBox="0 0 260 200" width="260" height="200"><rect width="260" height="200" rx="18" fill="#ecfdf5"/>
    <g transform="translate(26 52)"><rect width="56" height="96" rx="5" fill="#fff" stroke="#a3a3a3"/><line x1="10" y1="16" x2="46" y2="16" stroke="#d4d4d8" stroke-width="3"/><line x1="10" y1="28" x2="40" y2="28" stroke="#e4e4e7" stroke-width="2"/><line x1="10" y1="36" x2="44" y2="36" stroke="#e4e4e7" stroke-width="2"/><text x="28" y="76" font-size="11" font-weight="700" fill="#0f172a" text-anchor="middle">$24.74</text></g>
    <g stroke="#16a34a" stroke-width="3" fill="none" stroke-linecap="round"><path d="M96 100 H120"/></g><polygon points="120,96 128,100 120,104" fill="#16a34a"/>
    <g transform="translate(140 58)"><rect width="94" height="86" rx="9" fill="#fff" stroke="#16a34a"/><rect x="16" y="48" width="14" height="28" rx="2" fill="#16a34a"/><rect x="40" y="30" width="14" height="46" rx="2" fill="#65a30d"/><rect x="64" y="40" width="14" height="36" rx="2" fill="#84cc16"/></g>
    <path d="M120 40 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z" fill="#22c55e"/></svg>`,

  capture: `<svg viewBox="0 0 260 200" width="260" height="200"><rect width="260" height="200" rx="18" fill="#d1fae5"/>
    <g transform="translate(104 36)"><rect width="52" height="86" rx="9" fill="#064e3b"/><rect x="4" y="4" width="44" height="78" rx="5" fill="#ecfdf5"/><circle cx="26" cy="40" r="13" fill="#15803d"/><circle cx="26" cy="40" r="8" fill="#064e3b"/><circle cx="29" cy="37" r="2.5" fill="#a3e635"/></g>
    <g transform="translate(24 132)"><rect width="48" height="40" rx="3" fill="#fff" stroke="#94a3b8"/><line x1="6" y1="9" x2="38" y2="9" stroke="#cbd5e1" stroke-width="2"/><line x1="6" y1="17" x2="34" y2="17" stroke="#cbd5e1" stroke-width="2"/><line x1="6" y1="25" x2="40" y2="25" stroke="#cbd5e1" stroke-width="2"/></g>
    <g transform="translate(106 136)"><rect width="46" height="34" rx="4" fill="#fff" stroke="#16a34a"/><path d="M3 5 L23 20 L43 5" fill="none" stroke="#16a34a" stroke-width="2"/></g>
    <g transform="translate(190 132)"><rect width="44" height="40" rx="3" fill="#fff" stroke="#94a3b8"/><line x1="6" y1="9" x2="38" y2="9" stroke="#cbd5e1" stroke-width="2"/><line x1="6" y1="17" x2="38" y2="17" stroke="#cbd5e1" stroke-width="2"/><line x1="6" y1="25" x2="30" y2="25" stroke="#cbd5e1" stroke-width="2"/></g></svg>`,

  inbox: `<svg viewBox="0 0 260 200" width="260" height="200"><rect width="260" height="200" rx="18" fill="#ecfccb"/>
    <g transform="translate(66 42)"><rect width="128" height="86" rx="11" fill="#fff" stroke="#65a30d" stroke-width="2"/><path d="M6 12 L64 52 L122 12" fill="none" stroke="#65a30d" stroke-width="3"/><circle cx="112" cy="12" r="17" fill="#15803d"/><text x="112" y="18" font-size="19" font-weight="800" fill="#ecfdf5" text-anchor="middle">@</text></g>
    <g transform="translate(56 142)"><rect width="44" height="13" rx="3" fill="#bbf7d0"/><rect x="52" y="0" width="44" height="13" rx="3" fill="#86efac"/><rect x="104" y="0" width="44" height="13" rx="3" fill="#4ade80"/></g>
    <text x="130" y="180" font-size="11" font-weight="700" fill="#3f6212" text-anchor="middle">you+g@getguac.app</text></svg>`,

  parse: `<svg viewBox="0 0 260 200" width="260" height="200"><rect width="260" height="200" rx="18" fill="#d9f99d"/>
    <g transform="translate(24 38)"><rect width="70" height="124" rx="4" fill="#fff" stroke="#a3a3a3"/><line x1="8" y1="16" x2="62" y2="16" stroke="#d4d4d8" stroke-width="3"/><line x1="8" y1="28" x2="50" y2="28" stroke="#e4e4e7" stroke-width="2"/><line x1="8" y1="36" x2="56" y2="36" stroke="#e4e4e7" stroke-width="2"/><text x="35" y="80" font-size="12" font-weight="700" fill="#0f172a" text-anchor="middle">$17.99</text></g>
    <g stroke="#65a30d" stroke-width="3" fill="none" stroke-linecap="round"><path d="M104 100 H124"/></g><polygon points="124,96 132,100 124,104" fill="#65a30d"/>
    <g transform="translate(144 48)"><rect width="92" height="104" rx="10" fill="#15803d"/><rect x="10" y="12" width="72" height="16" rx="4" fill="#ecfdf5"/><text x="46" y="24" font-size="9" font-weight="800" fill="#15803d" text-anchor="middle">NETFLIX</text><rect x="10" y="34" width="50" height="10" rx="3" fill="#bbf7d0"/><rect x="10" y="50" width="64" height="10" rx="3" fill="#bbf7d0"/><rect x="10" y="66" width="40" height="10" rx="3" fill="#bbf7d0"/><rect x="10" y="84" width="72" height="12" rx="4" fill="#bef264"/></g></svg>`,

  dashboard: `<svg viewBox="0 0 260 200" width="260" height="200"><rect width="260" height="200" rx="18" fill="#e0e7ff"/>
    <g transform="translate(22 44)"><rect width="116" height="112" rx="10" fill="#fff" stroke="#6366f1"/><rect x="16" y="70" width="16" height="32" rx="2" fill="#6366f1"/><rect x="42" y="48" width="16" height="54" rx="2" fill="#818cf8"/><rect x="68" y="58" width="16" height="44" rx="2" fill="#a5b4fc"/><rect x="94" y="80" width="12" height="22" rx="2" fill="#c7d2fe"/></g>
    <g transform="translate(166 60)"><circle cx="40" cy="40" r="40" fill="#c7d2fe"/><path d="M40 40 L40 0 A40 40 0 0 1 80 40 Z" fill="#6366f1"/><path d="M40 40 L80 40 A40 40 0 0 1 26 78 Z" fill="#818cf8"/><circle cx="40" cy="40" r="17" fill="#fff"/></g></svg>`,

  worthit: `<svg viewBox="0 0 260 200" width="260" height="200"><rect width="260" height="200" rx="18" fill="#ffe4e6"/>
    <g transform="translate(130 70)"><circle r="44" fill="none" stroke="#fecdd3" stroke-width="12"/><circle r="44" fill="none" stroke="#e11d48" stroke-width="12" stroke-dasharray="226 60" stroke-linecap="round" transform="rotate(-90)"/><text y="2" font-size="32" font-weight="900" fill="#0f172a" text-anchor="middle">82</text><text y="22" font-size="10" font-weight="700" fill="#9f1239" text-anchor="middle">GuacScore</text></g>
    <text x="130" y="170" font-size="28" fill="#f59e0b" text-anchor="middle">★★★★☆</text></svg>`,

  wizard: `<svg viewBox="0 0 260 200" width="260" height="200"><rect width="260" height="200" rx="18" fill="#ede9fe"/>
    <g transform="rotate(-30 90 120)"><rect x="78" y="46" width="12" height="92" rx="6" fill="#4c1d95"/><rect x="78" y="46" width="12" height="24" rx="6" fill="#a78bfa"/></g>
    <path d="M150 48 l5 13 14 1 -11 9 4 14 -12 -8 -12 8 4 -14 -11 -9 14 -1 z" fill="#7c3aed"/>
    <g fill="#8b5cf6"><path d="M70 60 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2 z"/><path d="M186 104 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z"/></g>
    <g transform="translate(72 132)"><rect width="104" height="36" rx="9" fill="#fff" stroke="#7c3aed" stroke-width="2"/><text x="52" y="24" font-size="14" font-weight="800" fill="#6d28d9" text-anchor="middle">−$35 fee</text><path d="M10 28 L94 10" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/></g></svg>`,

  returns: `<svg viewBox="0 0 260 200" width="260" height="200"><rect width="260" height="200" rx="18" fill="#fef3c7"/>
    <g transform="translate(34 60)"><rect x="0" y="16" width="80" height="64" rx="6" fill="#fff" stroke="#b45309" stroke-width="2"/><path d="M0 36 L80 36" stroke="#fcd34d" stroke-width="3"/><path d="M40 16 L40 80" stroke="#fcd34d" stroke-width="3"/><rect x="31" y="6" width="18" height="16" rx="2" fill="#fbbf24"/></g>
    <g fill="none" stroke="#b45309" stroke-width="5" stroke-linecap="round"><path d="M140 130 A 34 34 0 1 0 146 74"/></g><polygon points="132,68 152,72 140,88" fill="#b45309"/>
    <g transform="translate(150 96)"><circle cx="24" cy="24" r="24" fill="#fff" stroke="#b45309" stroke-width="2"/><path d="M24 9 L24 24 L36 30" fill="none" stroke="#b45309" stroke-width="3" stroke-linecap="round"/></g></svg>`,

  steals: `<svg viewBox="0 0 260 200" width="260" height="200"><rect width="260" height="200" rx="18" fill="#cffafe"/>
    <g transform="translate(54 48)"><rect width="94" height="46" rx="11" fill="#fff" stroke="#0891b2" stroke-width="2"/><text x="47" y="31" font-size="20" font-weight="800" fill="#64748b" text-anchor="middle">$179</text><path d="M18 25 L76 25" stroke="#dc2626" stroke-width="2.5"/></g>
    <g stroke="#0891b2" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M124 104 L124 120"/><polyline points="112,110 124,124 136,110"/></g>
    <g transform="translate(70 132)"><rect width="116" height="52" rx="13" fill="#0e7490"/><text x="58" y="35" font-size="26" font-weight="900" fill="#fff" text-anchor="middle">$149</text></g>
    <text x="206" y="64" font-size="26" text-anchor="middle">🏷️</text></svg>`,

  smashlist: `<svg viewBox="0 0 260 200" width="260" height="200"><rect width="260" height="200" rx="18" fill="#dcfce7"/>
    <g transform="translate(36 36)"><rect width="106" height="128" rx="10" fill="#fff" stroke="#16a34a" stroke-width="2"/>
      <g transform="translate(16 20)" stroke="#16a34a" stroke-width="2.5" fill="none" stroke-linecap="round"><polyline points="0,4 4,8 11,0"/></g><line x1="38" y1="24" x2="88" y2="24" stroke="#cbd5e1" stroke-width="3"/>
      <g transform="translate(16 48)" stroke="#16a34a" stroke-width="2.5" fill="none" stroke-linecap="round"><polyline points="0,4 4,8 11,0"/></g><line x1="38" y1="52" x2="82" y2="52" stroke="#cbd5e1" stroke-width="3"/>
      <g transform="translate(16 76)" stroke="#94a3b8" stroke-width="2.5" fill="none"><circle cx="5" cy="4" r="5"/></g><line x1="38" y1="80" x2="86" y2="80" stroke="#e2e8f0" stroke-width="3"/></g>
    <g transform="translate(182 58)" fill="#15803d"><g stroke="#15803d" stroke-width="3"><path d="M8 -4 L30 -18"/><path d="M8 6 L30 20"/></g><circle cx="0" cy="0" r="12"/><circle cx="36" cy="-22" r="10"/><circle cx="36" cy="24" r="10"/></g></svg>`,

  security: `<svg viewBox="0 0 260 200" width="260" height="200"><rect width="260" height="200" rx="18" fill="#d1fae5"/>
    <path d="M130 34 L186 54 V104 C186 138 160 160 130 170 C100 160 74 138 74 104 V54 Z" fill="#15803d"/>
    <path d="M130 46 L174 62 V102 C174 130 152 148 130 157 C108 148 86 130 86 102 V62 Z" fill="#ecfdf5"/>
    <g transform="translate(108 86)"><rect x="0" y="16" width="44" height="36" rx="7" fill="#15803d"/><path d="M8 16 V9 a14 14 0 0 1 28 0 V16" fill="none" stroke="#15803d" stroke-width="6"/><circle cx="22" cy="32" r="5" fill="#ecfdf5"/></g></svg>`,

  celebrate: `<svg viewBox="0 0 260 200" width="260" height="200"><rect width="260" height="200" rx="18" fill="#ecfdf5"/>
    <circle cx="130" cy="98" r="54" fill="#15803d"/><path d="M104 98 L124 118 L160 78" fill="none" stroke="#ecfdf5" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    <g fill="#22c55e"><path d="M52 58 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z"/><path d="M208 112 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z"/></g></svg>`,

  sankey: `<svg viewBox="0 0 260 200" width="260" height="200"><rect width="260" height="200" rx="18" fill="#e0e7ff"/>
    <rect x="26" y="48" width="22" height="104" rx="5" fill="#4f46e5"/>
    <path d="M48 52 C120 52 140 42 212 42 L212 66 C140 66 120 78 48 84 Z" fill="#6366f1" opacity="0.75"/>
    <path d="M48 86 C120 86 140 94 212 94 L212 116 C140 116 120 106 48 104 Z" fill="#818cf8" opacity="0.8"/>
    <path d="M48 106 C120 106 140 132 212 132 L212 156 C140 156 120 124 48 124 Z" fill="#a5b4fc" opacity="0.85"/>
    <rect x="212" y="40" width="20" height="28" rx="3" fill="#4f46e5"/><rect x="212" y="92" width="20" height="26" rx="3" fill="#6366f1"/><rect x="212" y="130" width="20" height="28" rx="3" fill="#818cf8"/></svg>`,

  recurring: `<svg viewBox="0 0 260 200" width="260" height="200"><rect width="260" height="200" rx="18" fill="#fef3c7"/>
    <g transform="translate(36 32)"><rect width="188" height="136" rx="12" fill="#fff" stroke="#b45309" stroke-width="2"/>
      <g transform="translate(16 18)"><circle cx="12" cy="12" r="12" fill="#fde68a"/><text x="12" y="17" font-size="13" text-anchor="middle">🔁</text><rect x="34" y="7" width="74" height="7" rx="3" fill="#e5e7eb"/><rect x="34" y="18" width="46" height="6" rx="3" fill="#f1f5f9"/><text x="172" y="17" font-size="12" font-weight="800" fill="#92400e" text-anchor="end">$17.99</text></g>
      <g transform="translate(16 58)"><circle cx="12" cy="12" r="12" fill="#fde68a"/><text x="12" y="17" font-size="13" text-anchor="middle">🔁</text><rect x="34" y="7" width="60" height="7" rx="3" fill="#e5e7eb"/><rect x="34" y="18" width="40" height="6" rx="3" fill="#f1f5f9"/><text x="172" y="17" font-size="12" font-weight="800" fill="#92400e" text-anchor="end">$10.99</text></g>
      <g transform="translate(16 98)"><circle cx="12" cy="12" r="12" fill="#fecaca"/><text x="12" y="17" font-size="13" text-anchor="middle">🔁</text><rect x="34" y="7" width="80" height="7" rx="3" fill="#e5e7eb"/><rect x="34" y="18" width="50" height="6" rx="3" fill="#f1f5f9"/><text x="172" y="17" font-size="12" font-weight="800" fill="#dc2626" text-anchor="end">$45.00</text></g></g></svg>`,

  goals: `<svg viewBox="0 0 260 200" width="260" height="200"><rect width="260" height="200" rx="18" fill="#dcfce7"/>
    <g transform="translate(130 72)"><circle r="42" fill="#bbf7d0"/><circle r="28" fill="#86efac"/><circle r="14" fill="#22c55e"/><circle r="4" fill="#fff"/></g>
    <g transform="translate(150 38)"><rect x="0" y="0" width="3" height="42" rx="1.5" fill="#15803d"/><path d="M3 2 L28 9 L3 17 Z" fill="#16a34a"/></g>
    <g transform="translate(40 150)"><rect width="180" height="18" rx="9" fill="#bbf7d0"/><rect width="108" height="18" rx="9" fill="#16a34a"/><text x="90" y="13" font-size="11" font-weight="800" fill="#fff" text-anchor="middle">$1,800 / $3,000</text></g></svg>`,
}

const SLIDES = [
  { kind: 'cover' },
  {
    arc: 'Welcome', section: 'Welcome', art: 'flow', headline: 'Take control of your money.',
    tagline: 'Snap a receipt. See the savings.',
    narration: "Welcome to GetGuac — your money's wingman. Every receipt you've lost, every fee you didn't notice, every subscription quietly draining you — GetGuac catches it all and turns it into clarity. Snap a photo, forward an email, or drop in a statement. Free, private, and on your side. Here's the whole flow.",
    example: "From a $24.74 receipt to a clear spending picture — in seconds.",
    bullets: ['Free, private, and on your side', 'Receipts in → clarity out', 'No spreadsheets, no shoebox'],
  },
  {
    arc: ARC.see, section: 'Step 1 · Capture', art: 'capture', headline: 'Every receipt, captured.',
    tagline: 'No shoebox. No typing.',
    narration: "Getting receipts in is the easy part — three ways that fit real life. Snap a paper receipt at the restaurant or gas station, even crumpled or faded, single shot or a batch of three. Forward an email receipt to your free inbox. Or drop in a statement, and every line becomes a tracked receipt.",
    example: "Costco receipt · 23 line items · parsed in about 6 seconds.",
    bullets: ['Camera — snap any receipt, single or batch', 'Email — forward to your inbox', 'Statement — every line tracked (optional)'],
  },
  {
    arc: ARC.see, section: 'Your free inbox', art: 'inbox', headline: 'Your own @getguac.app inbox.',
    tagline: 'A shield for your real email.',
    narration: "Every account comes with a free, permanent at-getguac-dot-app address — yours forever. Give plain you@getguac.app to stores at signup, so spam and breaches stay off your real email. Then forward any receipt to you-plus-g@getguac.app — the plus-g tells GetGuac to read and file it automatically, every ten minutes. It's a real mailbox: read, reply, and send.",
    example: "you+g@getguac.app → forward any receipt and it files itself in ~10 min.",
    bullets: ['A free address, yours forever', 'Forward receipts to you+g@getguac.app', 'Keeps spam off your real inbox'],
  },
  {
    arc: ARC.see, section: 'Step 2 · Read', art: 'parse', headline: 'It reads every line for you.',
    tagline: 'Five seconds. Zero typing.',
    narration: "Then the magic. In five to fifteen seconds — faster than you finish your coffee — Guac-AI reads the store, the date, the total, the tax, even the last four of your card. Every line item becomes searchable history. It even captures the refund policy, and fills the gap with curated defaults when a receipt doesn't print one.",
    example: "NETFLIX.COM · 06/09/2026 · $17.99 → auto-tagged ‘Bills’.",
    bullets: ['Store, date, total, tax, card', 'Every item, searchable by name', 'Refund policy captured automatically'],
  },
  {
    arc: ARC.see, section: 'Step 3 · See', art: 'dashboard', headline: 'Know exactly where it went.',
    tagline: 'Your money, finally clear.',
    narration: "Here's where it all comes together. Duplicate receipts collapse into one. Spending sorts itself into clean categories. And your dashboard shows your top stores by dollar — grouped smartly, so Amazon doesn't split into five bars. Tax broken out for filing, price drift on what you rebuy. No judgment, no clutter — just a clear, honest picture.",
    example: "Amazon · Amazon Mktp · Amzn → one bar: $1,240 this year.",
    bullets: ['Auto-categorized, duplicates merged', 'Spending by store and category', 'The real numbers — no shame, no clutter'],
  },
  {
    arc: ARC.see, section: 'Reports · Spending flow', art: 'sankey', headline: 'See where your money flows.',
    tagline: 'From total spend to every category.',
    narration: "Beyond the totals, GetGuac maps the flow of your money — from your total spend down to every category and merchant. Groceries, dining, bills, and the little stuff that quietly adds up. Zoom from a full year to a single category in a tap. It's the satisfying, at-a-glance answer to ‘where did it all go?’",
    example: "March: $2,690 spent → Groceries $980 · Dining $410 · Bills $1,300.",
    bullets: ['A money-flow map by category', 'Zoom from a year to one category', 'Tax broken out, ready to file'],
  },
  {
    arc: ARC.keep, section: 'Worth-It · GuacScore', art: 'worthit', headline: "Spend on what's worth it.",
    tagline: 'One tap. A sharper picture.',
    narration: "Now the part that changes habits — gently. Tap a quick Worth-It rating, one to five stars, on a purchase. Two seconds, and it rolls into your GuacScore: one simple number for how well you're really spending. Watch it climb as the things you regret drop away. It's encouragement, not a lecture — GetGuac is in your corner, not over your shoulder.",
    example: "★★☆☆☆ late-night takeout → your GuacScore sharpens as it drops away.",
    bullets: ['Rate any purchase in two seconds', 'GuacScore — a single, clear number', 'Encouraging, never preachy'],
  },
  {
    arc: ARC.keep, section: 'GuacWizard · Bank bites', art: 'wizard', headline: "Catch what's quietly draining you.",
    tagline: 'Honest help, never a lecture.',
    narration: "Meet the GuacWizard — calm, honest money guidance that never shames you. It scans your statements and surfaces the bank bites: interest, fees, penalties, and which card charged them. But it only nudges you on the ones you could avoid — the thirty-five-dollar overdraft, not the APR you couldn't escape. Plain English, specific, kind.",
    example: "“You paid $187 in interest this month — paying in full would save it every month.”",
    bullets: ['Finds interest, fees & forgotten subscriptions', 'Flags only the avoidable ones', 'Plain-spoken — never a guilt trip'],
  },
  {
    arc: ARC.keep, section: 'Recurring & subscriptions', art: 'recurring', headline: 'Every subscription, in one place.',
    tagline: "Cancel what you forgot you're paying for.",
    narration: "GetGuac spots the charges that quietly repeat — streaming, memberships, that app you tried once and forgot. See them all in one list, with what's due next, so nothing sneaks up on you. The ones you don't use anymore? Cancel them and keep the money. No more ‘wait, I'm still paying for that?’",
    example: "Found: Netflix $17.99 · Spotify $10.99 · a gym you haven't used since March, $45/mo.",
    bullets: ['Every recurring charge in one place', "See what's due next", 'Cancel what you forgot'],
  },
  {
    arc: ARC.keep, section: 'Returns & refunds', art: 'returns', headline: "Get back what you're owed.",
    tagline: 'Never miss a refund.',
    narration: "Here's money most people lose every year — to return windows that quietly close. GetGuac watches them for you. Every refund deadline gets a countdown, per item, that turns yellow then red as it nears — fifteen days for Best Buy electronics, thirty for Amazon, essentially lifetime for Costco. Decide to send something back? One tap.",
    example: "Best Buy TV · 15-day window · 4 days left 🔴 — return it before it’s gone.",
    bullets: ['A countdown timer per item', 'Return & price-drop deadlines tracked', '25+ store refund policies built in'],
  },
  {
    arc: ARC.keep, section: 'Steals', art: 'steals', headline: 'Pay less for the same thing.',
    tagline: 'A better price, found for you.',
    narration: "On the things you buy again and again, Steals quietly scouts for a cheaper price — so next time, you pay less for the very same item. No coupons to clip, no tabs to compare. Just a better deal, surfaced for you, on what you already get.",
    example: "AirPods you rebuy: was $179 → Steals found them at $149.",
    bullets: ['Cheaper prices on your repeat buys', 'No coupon hunting, no tab juggling', 'Found for you, automatically'],
  },
  {
    arc: ARC.keep, section: 'Smashlist', art: 'smashlist', headline: 'Build a list. Share it in a tap.',
    tagline: 'Shopping, together.',
    narration: "Your shopping list builds itself from what you actually buy — the staples you reorder, the things running low. Add to it on the fly, then share the whole list with your partner or family in a single tap, so everyone's on the same page at the store. No more ‘did we need milk?’ texts.",
    example: "Weekend grocery list → shared with the whole family in one tap.",
    bullets: ['A list that builds itself', 'Share with family in one tap', 'Everyone in sync at the store'],
  },
  {
    arc: ARC.grow, section: 'Goals', art: 'goals', headline: 'Save toward what matters.',
    tagline: 'Set a goal. Watch it grow.',
    narration: "Turn ‘I should save’ into something real. Set a goal — an emergency fund, a vacation, your kids' school, retirement — give it a target, and GetGuac tracks every dollar you keep against it. Watch the bar fill as your savings and the money GetGuac claws back add up. And when you hit it? That's a real win, celebrated.",
    example: "Emergency fund: $1,800 of $3,000 saved — 60% there 🎯",
    bullets: ['Set goals with a target', 'Track progress automatically', 'Celebrate when you hit them'],
  },
  {
    arc: ARC.grow, section: 'Trust', art: 'security', headline: 'Free, private, and yours.',
    tagline: 'No ads. No selling. No catch.',
    narration: "And here's what makes the rest easy to trust. GetGuac is free — no card, no ads, no catch. We never sell your data, and no bank login is required. Every row is locked to you alone by row-level security — even we can't read across accounts. And you can export everything, or delete it all, in one click.",
    example: "One click: export everything as JSON, or delete your whole account.",
    bullets: ['Free — no card, no ads', 'We never sell your data', 'Export or delete in one click'],
  },
  {
    kind: 'closing', arc: 'Ready?', section: 'Get started', art: 'celebrate', headline: 'Snap your first receipt.',
    tagline: 'See clearly. Keep more. Watch it grow.',
    narration: "So here's the short version. GetGuac captures every receipt, reads it in seconds, shows you exactly where your money goes, helps you keep more of it, and protects what you're owed — all while your data stays yours. Ready to take control? Snap your first receipt, and watch your money finally make sense.",
  },
]

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function coverHTML() {
  return `<section class="slide cover">
    <div class="logo"><span class="av">🥑</span> GetGuac</div>
    <div class="cover-mid"><div class="kicker">The product tour</div>
      <h1>Take control<br/>of your money.</h1>
      <p class="lead">Snap a receipt. See the savings. Keep more of what's yours — free.</p></div>
    <div class="cover-foot">See clearly  ·  Keep more  ·  Watch it grow</div></section>`
}

function arcClass(a) { return a === ARC.see ? 'see' : a === ARC.keep ? 'keep' : a === ARC.grow ? 'grow' : 'ready' }

function slideHTML(s, n, total) {
  const closing = s.kind === 'closing'
  return `<section class="slide content ${closing ? 'closing' : ''}">
    <div class="top"><div class="logo sm"><span class="av">🥑</span> GetGuac</div><div class="arc-tag ${arcClass(s.arc)}">${esc(s.arc)}</div></div>
    <div class="section-label">${esc(s.section)}</div>
    <h2 class="headline">${esc(s.headline)}</h2>
    <div class="tagline">${esc(s.tagline)}</div>
    <div class="row2">
      <div class="col-left">
        <div class="narration"><span class="quote">“</span>${esc(s.narration)}<span class="quote">”</span></div>
      </div>
      <div class="col-right">
        <div class="art">${ART[s.art] || ''}</div>
        ${s.example ? `<div class="example"><div class="ex-label">Example</div><div class="ex-body">${esc(s.example)}</div></div>` : ''}
      </div>
    </div>
    ${s.bullets ? `<ul class="bullets">${s.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
    <div class="pagenum">${n} / ${total}</div></section>`
}

const total = SLIDES.length
const body = SLIDES.map((s, i) => (s.kind === 'cover' ? coverHTML() : slideHTML(s, i + 1, total))).join('\n')

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size: 1280px 720px; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; color: #0f172a; }
  .slide { width: 1280px; height: 720px; padding: 48px 70px; position: relative; overflow: hidden;
           page-break-after: always; background: #fff; display: flex; flex-direction: column; }
  .logo { font-weight: 900; font-size: 30px; letter-spacing: -.5px; color: #065f46; display: flex; align-items: center; gap: 12px; }
  .logo.sm { font-size: 21px; }
  .av { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg,#bef264,#16a34a 60%,#065f46);
        display: inline-flex; align-items: center; justify-content: center; font-size: 23px; box-shadow: 0 4px 12px rgba(0,0,0,.15); }
  .logo.sm .av { width: 31px; height: 31px; font-size: 18px; }
  .top { display: flex; align-items: center; justify-content: space-between; }
  .arc-tag { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 7px 16px; border-radius: 999px; background: #f1f5f9; color: #475569; }
  .arc-tag.see { background:#d1fae5; color:#047857; } .arc-tag.keep { background:#fef3c7; color:#b45309; }
  .arc-tag.grow { background:#ede9fe; color:#6d28d9; } .arc-tag.ready { background:#065f46; color:#ecfdf5; }

  .cover { background: linear-gradient(135deg,#065f46 0%,#16a34a 55%,#84cc16 100%); color:#fff; justify-content: space-between; padding: 64px 80px; }
  .cover .logo { color:#fff; }
  .cover .kicker { font-size:18px; font-weight:700; text-transform:uppercase; letter-spacing:3px; color:#d9f99d; }
  .cover h1 { font-size:90px; font-weight:900; line-height:1.02; letter-spacing:-3px; margin-top:16px; }
  .cover .lead { font-size:27px; color:#ecfccb; margin-top:22px; max-width:820px; }
  .cover-foot { font-size:19px; color:#ecfdf5cc; font-weight:700; letter-spacing:.5px; }

  .section-label { margin-top:22px; font-size:16px; font-weight:800; text-transform:uppercase; letter-spacing:2px; color:#16a34a; }
  .headline { font-size:50px; font-weight:900; letter-spacing:-1.4px; line-height:1.03; margin-top:6px; }
  .tagline { font-size:23px; font-weight:800; color:#65a30d; margin-top:8px; }
  .row2 { display:flex; gap:40px; margin-top:20px; align-items:flex-start; }
  .col-left { flex:1; }
  .col-right { width:268px; flex-shrink:0; }
  .narration { font-size:18px; line-height:1.5; color:#334155; background:#f0fdf4; border-radius:16px; padding:22px 24px; }
  .narration .quote { color:#86efac; font-weight:900; }
  .art { display:flex; justify-content:center; }
  .art svg { border-radius:18px; box-shadow:0 6px 18px rgba(0,0,0,.08); }
  .example { margin-top:14px; background:#fff; border:1px solid #e2e8f0; border-left:4px solid #16a34a; border-radius:12px; padding:12px 14px; }
  .ex-label { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:#16a34a; }
  .ex-body { font-size:14px; font-weight:700; color:#1e293b; margin-top:4px; line-height:1.35; }
  .bullets { margin-top:auto; padding-top:18px; display:flex; gap:14px; list-style:none; }
  .bullets li { flex:1; background:#fff; border:1px solid #e2e8f0; border-top:4px solid #16a34a; border-radius:12px; padding:13px 16px; font-size:15px; font-weight:700; color:#1e293b; line-height:1.32; }
  .pagenum { position:absolute; bottom:30px; right:70px; font-size:14px; font-weight:700; color:#cbd5e1; }
  .closing .headline { color:#065f46; } .closing .narration { background:#ecfdf5; }
</style></head><body>${body}</body></html>`

const b = await chromium.launch()
const page = await b.newPage()
await page.setContent(html, { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
const outPath = resolve(OUT, 'getguac-deck-v2.pdf')
await page.pdf({ path: outPath, width: '1280px', height: '720px', printBackground: true })

if (process.argv.includes('--preview')) {
  await page.setViewportSize({ width: 1280, height: 720 })
  const slides = page.locator('.slide')
  const n = await slides.count()
  for (const i of [6, 9, 13]) if (i < n) await slides.nth(i).screenshot({ path: resolve(OUT, `_deck-preview-${i}.png`) })
  console.log('✓ previews written')
}
await b.close()
console.log('✓ wrote', outPath, '—', total, 'slides')
