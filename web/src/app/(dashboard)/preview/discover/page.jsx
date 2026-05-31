'use client'
// Standalone Discover-page preview at /preview/discover.
//
// Mirrors the Fetch reference screenshot layout 1:1 but with GetGuac
// branding + Smashlist vocabulary. Static mock data, zero DB queries
// — strictly for evaluating whether the visual rhythm fits before
// any decision to apply it to the live dashboard.
//
// Layout map (top → bottom):
//   1. Header strip: "Discover" title · Play chip · GuacMoney chip
//   2. Search bar + saved-Steals heart counter
//   3. Big hero card: "Start earning · Quick GuacMoney wins" + Get
//      Started CTA + 3 peeking product tiles below
//   4. 3-up quest carousel with rewards + hearts
//   5. "For you" section header + 3-up product carousel
//   6. (no bottom tab bar on web — that's a mobile concept)

import Link from 'next/link'
import { Search, Heart, Gamepad2, Sparkles, Camera, Flame, Link as LinkIcon } from 'lucide-react'

export default function DiscoverPreview() {
  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2 text-[12px] text-amber-900">
        <strong>Preview only</strong> — this page is a layout sample. No live data, no impact on the real dashboard.
        Visit <code className="bg-white px-1 rounded">/dashboard</code> for the production page.
      </div>

      {/* 1. Header strip — title + Play chip + GuacMoney chip */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-gray-900">Discover</h1>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm text-sm font-bold text-gray-700 hover:border-emerald-300">
            <Gamepad2 size={14} className="text-violet-600" /> Play
          </button>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-sm font-extrabold text-amber-900 tabular-nums">
            🥑 $100
          </span>
        </div>
      </div>

      {/* 2. Search bar + saved counter */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white rounded-full border border-gray-200 px-4 py-2.5 shadow-sm">
          <Search size={16} className="text-emerald-600" />
          <input
            type="text"
            placeholder="Find your next save…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400"
          />
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-full border-2 border-rose-200 text-rose-500 bg-white hover:bg-rose-50">
          <Heart size={14} fill="currentColor" />
          <span className="text-sm font-bold tabular-nums">0</span>
        </button>
      </div>

      {/* 3. Hero — emerald gradient with Get Started + 3 peeking tiles */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700 text-white">
        <div className="px-6 pt-7 pb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black leading-tight">Start earning</h2>
            <p className="text-sm text-emerald-50 mt-1">Quick GuacMoney wins 🥑</p>
          </div>
          <button className="bg-white text-emerald-700 font-extrabold text-sm px-4 py-2.5 rounded-2xl shadow-md hover:scale-[1.02] transition">
            Get started
          </button>
        </div>
        {/* Peeking tiles — slot underneath the hero, half hidden */}
        <div className="px-4 pt-3 grid grid-cols-3 gap-3 pb-0">
          <PeekingTile bg="#fce7f3" emoji="💖" />
          <PeekingTile bg="#fed7aa" emoji="🔥" />
          <PeekingTile bg="#dcfce7" emoji="📸" />
        </div>
      </div>

      {/* 4. Quest carousel — 3 tiles with reward + heart on top of each */}
      <div className="grid grid-cols-3 gap-3 -mt-12 relative z-10">
        <QuestCard
          reward={5}
          title="Connect a store"
          subtitle="Auto-import receipts"
          progress={0}
        />
        <QuestCard
          reward={2}
          title="Save 5 Steals"
          subtitle="Heart 5 deals"
          progress={0.2}
        />
        <QuestCard
          reward={3}
          title="Hit 3 Smash days"
          subtitle="3 receipts in a row"
          progress={0.66}
        />
      </div>

      {/* 5. For you header + 3-up product row */}
      <div className="flex items-baseline justify-between mt-6">
        <h2 className="text-xl font-extrabold text-gray-900">For you</h2>
        <Link href="/stash" className="text-sm font-bold text-emerald-700 hover:text-emerald-900">See more</Link>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <ProductCard
          tint="#fef3c7"
          emoji="☕"
          title="Costco K-Cups"
          subtitle="last bought 18d ago"
          guacMoney={4}
          saved
          social="12k"
        />
        <ProductCard
          tint="#dbeafe"
          emoji="🧴"
          title="Charmin Ultra Soft"
          subtitle="due for restock"
          guacMoney={2}
          saved={false}
          social="48k"
        />
        <ProductCard
          tint="#fce7f3"
          emoji="🍷"
          title="Trader Joe's Cab"
          subtitle="usually $7"
          guacMoney={3}
          saved={false}
          social="2.1k"
        />
      </div>

      <div className="h-6" />
    </div>
  )
}

/* ─────── helpers ─────── */

function PeekingTile({ bg, emoji }) {
  return (
    <div
      className="rounded-t-2xl aspect-square flex items-center justify-center text-5xl"
      style={{ backgroundColor: bg, marginBottom: '-30%' }}
    >
      <span style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>{emoji}</span>
    </div>
  )
}

function QuestCard({ reward, title, subtitle, progress }) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-3 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
      <div className="flex items-center justify-between mb-1.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold tabular-nums">
          🥑 ${reward}
        </span>
        <button
          className="w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-rose-500 hover:border-rose-200 flex items-center justify-center"
          aria-label="Save"
        >
          <Heart size={13} />
        </button>
      </div>
      <p className="text-sm font-extrabold text-gray-900 leading-tight">{title}</p>
      <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">{subtitle}</p>
      <div className="mt-2 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 to-lime-500 transition-all"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  )
}

function ProductCard({ tint, emoji, title, subtitle, guacMoney, saved, social }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
      <div
        className="flex items-center justify-center text-5xl"
        style={{ backgroundColor: tint, aspectRatio: '1 / 1' }}
      >
        <span style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>{emoji}</span>
      </div>
      <div className="p-2.5">
        <p className="text-sm font-extrabold text-gray-900 leading-tight line-clamp-1">{title}</p>
        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{subtitle}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            <button
              className={`w-6 h-6 flex items-center justify-center rounded-full border transition ${
                saved
                  ? 'border-rose-300 bg-rose-50 text-rose-500'
                  : 'border-gray-200 bg-white text-gray-400 hover:text-rose-500 hover:border-rose-200'
              }`}
              aria-label={saved ? 'Unsave' : 'Save'}
            >
              <Heart size={11} fill={saved ? 'currentColor' : 'none'} />
            </button>
            <span className="text-[10px] font-semibold text-gray-500 tabular-nums">{social}</span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold tabular-nums">
            🥑 ${guacMoney}
          </span>
        </div>
      </div>
    </div>
  )
}
