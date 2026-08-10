'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import ReceiptFlow from '../../components/ReceiptFlow'

const DISPLAY = { fontFamily: 'var(--font-bricolage), sans-serif' }

export default function GuideHeroSlideshow() {
  const [slide, setSlide] = useState(0)
  const choose = (value) => setSlide(value)

  return <section className="gg-hero relative overflow-hidden border-b border-emerald-950/10" aria-roledescription="carousel" aria-label="GetGuac guide highlights">
    {slide === 0 ? <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:min-h-[650px] lg:grid-cols-[1.05fr_.95fr]">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/70 px-3 py-1.5 text-xs font-black uppercase tracking-[.16em] text-emerald-800"><Sparkles size={14}/> The ultimate GetGuac guide</span>
        <h1 className="mt-6 text-5xl font-black leading-[.98] tracking-tight sm:text-7xl" style={DISPLAY}>One receipt.<br/><span className="text-lime-600">A clearer money life.</span></h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-[#48614d]">A practical, step-by-step guide to getting GetGuac working for you—from your first scan to a receipt system that catches patterns, bills, subscriptions, and return deadlines.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/join?try=receipt" className="btn-primary">Try one receipt <ArrowRight size={17}/></Link><a href="#guide" className="btn-secondary">Read the guide</a></div>
      </div>
      <div className="relative mx-auto w-full max-w-[520px]"><div className="absolute -left-5 -top-5 h-24 w-24 rounded-full bg-[#b8ef52]"/><img className="relative rounded-[32px] shadow-2xl shadow-emerald-950/20" src="/home/story-people/openai-hero-giggling-family-baby-v2.webp" alt="A family enjoying the confidence that comes from clearer spending" width="1200" height="900"/><div className="absolute -bottom-5 right-4 rounded-2xl bg-white p-4 shadow-xl"><p className="text-xs font-bold uppercase tracking-wider text-gray-400">The GetGuac promise</p><p className="mt-1 font-black">See it. Understand it. Keep more.</p></div></div>
    </div> : <div className="mx-auto w-full max-w-[1400px] px-3 pb-20 pt-8 sm:px-6"><ReceiptFlow variant="story" heading="Every receipt makes the next shopping trip smarter." blurb="GetGuac remembers the shopping so you do not have to—and learns from every trip." href="/how-it-works" linkLabel="See how GetGuac works"/></div>}

    <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-emerald-900/10 bg-white/90 p-1.5 shadow-lg backdrop-blur sm:bottom-5">
      <button type="button" onClick={() => choose((slide + 1) % 2)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-emerald-50" aria-label="Previous hero slide"><ArrowLeft size={17}/></button>
      {[0,1].map(index => <button key={index} type="button" onClick={() => choose(index)} className={`h-2.5 rounded-full transition-all ${slide === index ? 'w-7 bg-lime-600' : 'w-2.5 bg-emerald-900/20'}`} aria-label={`Show hero slide ${index + 1}`} aria-current={slide === index ? 'true' : undefined}/>) }
      <button type="button" onClick={() => choose((slide + 1) % 2)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-emerald-50" aria-label="Next hero slide"><ArrowRight size={17}/></button>
    </div>
  </section>
}
