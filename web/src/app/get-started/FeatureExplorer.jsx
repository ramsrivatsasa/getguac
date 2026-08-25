'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, MousePointerClick } from 'lucide-react'
import ZoomableImage from './ZoomableImage'

const DISPLAY = { fontFamily: 'var(--font-bricolage), sans-serif' }

// Half of ALL_FEATURES points at /goals/*.html and /resources/*, which are static
// files in public/, not Next routes. <Link> prefetches an RSC payload for its
// href and gets a 404 for those. Plain <a> for anything that is not a route.
const isStaticPage = (href) => href.endsWith('.html') || href.startsWith('/resources')

function FeatureLink({ href, className, children }) {
  return isStaticPage(href)
    ? <a href={href} className={className}>{children}</a>
    : <Link href={href} className={className}>{children}</Link>
}

const CHAPTERS = [
  {
    title: 'Capture the real picture',
    description: 'Bring paper receipts, email receipts, and statements together so GetGuac can see what you actually bought.',
    features: ['Receipt scanner', 'GetGuac email inbox', 'Statement import'],
  },
  {
    title: 'Make it automatic',
    description: 'Let Guac-AI read, organize, and remember routine money activity with less manual work from you.',
    features: ['Guac-AI parsing', 'Categories and duplicates', 'Subscriptions and recurring charges', 'Bills calendar'],
  },
  {
    title: 'Read your patterns',
    description: 'Turn saved purchases into useful answers about habits, value, trends, and the choices shaping your money.',
    features: ['Dashboard and reports', 'Guac AI questions', 'Worth-It ratings', 'GuacScore', 'GuacMoney', 'Tax and charity reports'],
  },
  {
    title: 'Protect your money',
    description: 'Catch fees, return deadlines, price opportunities, and privacy risks before they quietly cost you.',
    features: ['GuacWizard bank bites', 'Returns and refunds', 'Stash', 'Steals', 'Marketplace and coupons', 'Private by design'],
  },
  {
    title: 'Keep the habit easy',
    description: 'Use lightweight planning and learning tools that fit real life without turning money into a daily chore.',
    features: ['Shopping List', 'Car Miles', 'Guac Arcade'],
  },
]

export default function FeatureExplorer({ features, starts }) {
  const orderedFeatures = CHAPTERS.flatMap((chapter, chapterIndex) => chapter.features.map(title => ({
    ...features.find(item => item.title === title),
    chapterIndex,
  }))).filter(item => item.title)
  const [selectedTitle, setSelectedTitle] = useState(orderedFeatures[0].title)
  const selected = orderedFeatures.findIndex(item => item.title === selectedTitle)
  const feature = orderedFeatures[selected]
  const chapter = CHAPTERS[feature.chapterIndex]

  const select = (title) => {
    setSelectedTitle(title)
    requestAnimationFrame(() => document.getElementById('feature-detail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
  }

  const move = (direction) => select(orderedFeatures[(selected + direction + orderedFeatures.length) % orderedFeatures.length].title)

  return <div className="mt-12">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[.18em] text-lime-700">Choose a feature</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">The same five chapters from the guide organize all 22 tools below. Select any feature for its practical starting step and real GetGuac screen.</p>
      </div>
      <p className="rounded-full bg-[#eaf4df] px-4 py-2 text-sm font-black text-[#31533a]">{String(selected + 1).padStart(2, '0')} / {orderedFeatures.length}</p>
    </div>

    <div className="mt-9 space-y-10">
      {CHAPTERS.map((itemChapter, chapterIndex) => {
        const chapterFeatures = orderedFeatures.filter(item => item.chapterIndex === chapterIndex)
        return <section key={itemChapter.title} className="rounded-[28px] border border-emerald-950/10 bg-[#fafbf7] p-4 sm:p-6">
          <div className="grid gap-3 border-b border-emerald-950/10 pb-5 sm:grid-cols-[auto_1fr] sm:items-start sm:gap-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#173d27] text-lg font-black text-[#b8ef52]">{chapterIndex + 1}</span>
            <div><p className="text-[11px] font-black uppercase tracking-[.16em] text-lime-700">Chapter {chapterIndex + 1}</p><h3 className="mt-1 text-2xl font-black text-[#16331f]" style={DISPLAY}>{itemChapter.title}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">{itemChapter.description}</p></div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {chapterFeatures.map((item) => {
              const index = orderedFeatures.findIndex(featureItem => featureItem.title === item.title)
              const isSelected = selectedTitle === item.title
              return <button key={item.title} type="button" onClick={() => select(item.title)} aria-pressed={isSelected} className={`group flex min-h-[82px] items-center gap-3 rounded-2xl border p-3 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300 ${isSelected ? 'border-[#173d27] bg-[#173d27] text-white shadow-lg shadow-emerald-950/15' : 'border-emerald-950/10 bg-white text-[#31533a] hover:-translate-y-0.5 hover:border-lime-500 hover:shadow-md'}`}>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black ${isSelected ? 'bg-[#b8ef52] text-[#173d27]' : 'bg-[#edf5e5] text-lime-700'}`}>{String(index + 1).padStart(2, '0')}</span>
                <span><span className={`block text-[10px] font-black uppercase tracking-[.12em] ${isSelected ? 'text-[#b8ef52]' : 'text-emerald-700/65'}`}>Chapter {chapterIndex + 1}</span><span className="mt-1 block text-sm font-extrabold leading-5">{item.title}</span></span>
              </button>
            })}
          </div>
        </section>
      })}
    </div>

    <article id="feature-detail" className="mt-8 overflow-hidden rounded-[34px] border border-emerald-950/10 bg-[#f4f8ee] shadow-2xl shadow-emerald-950/10">
      <div className="grid min-w-0 lg:grid-cols-[.82fr_1.18fr]">
        <div className="flex flex-col p-6 sm:p-9 lg:p-11">
          <div className="flex items-center gap-3"><span className="text-4xl font-black text-lime-600" style={DISPLAY}>{String(selected + 1).padStart(2, '0')}</span><span className="rounded-full bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 ring-1 ring-emerald-950/10">Chapter {feature.chapterIndex + 1}</span></div>
          <p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-lime-700">{chapter.title}</p>
          <h3 className="mt-2 text-3xl font-black leading-tight text-[#16331f] sm:text-4xl" style={DISPLAY}>{feature.title}</h3>
          <p className="mt-4 text-base leading-7 text-gray-700">{feature.body}</p>
          <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-emerald-950/10">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-emerald-800"><Check size={15}/> How to get started</p>
            <p className="mt-3 text-[15px] leading-7 text-[#31533a]">{starts[feature.title]}</p>
          </div>
          <FeatureLink href={feature.href} className="mt-6 inline-flex items-center gap-2 self-start font-extrabold text-lime-700 hover:text-lime-800">Open {feature.title} <ArrowRight size={17}/></FeatureLink>
          <div className="mt-auto flex items-center justify-between gap-3 pt-8">
            <button type="button" onClick={() => move(-1)} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-black text-[#31533a] ring-1 ring-emerald-950/10 hover:bg-emerald-50"><ArrowLeft size={16}/> Previous</button>
            <button type="button" onClick={() => move(1)} className="inline-flex items-center gap-2 rounded-full bg-[#173d27] px-4 py-2.5 text-sm font-black text-white hover:bg-[#245334]">Next <ArrowRight size={16}/></button>
          </div>
        </div>
        <div className="relative flex min-h-[390px] items-center justify-center overflow-hidden border-t border-emerald-950/10 bg-gradient-to-br from-[#dff2d2] via-[#eef8e7] to-white p-5 sm:p-8 lg:min-h-[650px] lg:border-l">
          <div className="absolute right-5 top-5 z-10 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-emerald-800 shadow-sm backdrop-blur"><MousePointerClick size={14}/> Tap to zoom</div>
          <div className={`w-full ${feature.phone ? 'max-w-[310px]' : 'max-w-[920px]'}`}>
            <ZoomableImage key={feature.image} src={feature.image} alt={`${feature.title} in GetGuac`} width={feature.phone ? 420 : 1200} height={feature.phone ? 860 : 780}/>
          </div>
        </div>
      </div>
    </article>
  </div>
}
