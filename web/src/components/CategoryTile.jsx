'use client'
// Shop-by-category tile — used by the Discover dashboard + the
// Store-detail page. Compact "title on the left, illustration on the
// right" layout with a pastel tint per category.
//
// Click hands off to /stash?category=<slug> or wherever the caller
// routes. Category copy lives in lib/categories.js; tints in
// ProductCard's CATEGORY_TINT.

import Link from 'next/link'
import { tintForCategory } from './ProductCard'

export default function CategoryTile({ slug, label, emoji = '🛒', href }) {
  const target = href || `/stash?category=${encodeURIComponent(slug || '')}`
  return (
    <Link
      href={target}
      className="relative flex items-center bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 hover:-translate-y-0.5 transition-all overflow-hidden"
      style={{ minHeight: 64 }}
    >
      <div className="flex-1 px-3 py-3 z-10">
        <p className="font-bold text-gray-900 text-sm">{label}</p>
      </div>
      <div
        className="absolute top-0 right-0 h-full w-20 flex items-center justify-center text-3xl"
        style={{ backgroundColor: tintForCategory(slug) }}
      >
        <span style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.06))' }}>{emoji}</span>
      </div>
    </Link>
  )
}
