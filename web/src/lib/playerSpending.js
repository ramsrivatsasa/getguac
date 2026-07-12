'use client'
// Shared "your real spending" data source for the personalized arcade games
// (Splurge Slicer, Expense Invaders, Budget Tetris). One fetch, three games.
//
// Signed in with receipts  → the player's ACTUAL purchases + category totals,
//                            pulled live each time they open a game.
// Signed out / no receipts → a believable demo set so the game still plays and
//                            shows the concept, with a "sign in for your real
//                            spending" nudge in the UI.
//
// Scoring is GAME-ONLY: nothing here writes back to ratings or GuacScore. The
// worth-it / not-worth-it call a player makes in a game never touches their
// real records — it just drives the in-game score.
import { useEffect, useState } from 'react'
import { createClient } from './supabase/client'
import { CATEGORY_BY_SLUG } from './categories'

// Discretionary categories — the "splurge / want" side. Slicing these is good.
const DISCRETIONARY = new Set([
  'eats', 'snacks', 'bars', 'drinks', 'fun', 'gifting', 'tech',
  'fits', 'big-stuff', 'subs',
])
// Essentials — the "need" side. Slicing these should cost you.
const ESSENTIAL = new Set([
  'grub', 'bills', 'pharmacy', 'health', 'household', 'personal-care',
  'gas-up', 'auto', 'bank-fees',
])

function catMeta(slug) {
  const c = CATEGORY_BY_SLUG[slug]
  return { slug: slug || 'misc', label: c?.label || 'Misc', emoji: c?.emoji || '📦' }
}

// Is this purchase a splurge? Order of confidence:
//   1. The user already rated it not-worth-it (rating ≤ 2) → splurge.
//   2. The user rated it worth-it (rating ≥ 4) → essential-ish (keep).
//   3. No rating → infer from category, then nudge by price.
function classify(category, rating, price) {
  if (rating != null) {
    if (rating <= 2) return true
    if (rating >= 4) return false
  }
  if (DISCRETIONARY.has(category)) return true
  if (ESSENTIAL.has(category)) return false
  return price >= 40 // unknown category: pricey one-offs read as splurges
}

const DEMO = {
  signedIn: false,
  hasData: false,
  purchases: [
    { name: 'Daily latte', price: 6, category: 'drinks', emoji: '☕', store: 'Corner Cafe', splurge: true },
    { name: 'Streaming #4', price: 12, category: 'subs', emoji: '📺', store: 'StreamCo', splurge: true },
    { name: 'Impulse gadget', price: 49, category: 'tech', emoji: '🎧', store: 'TechMart', splurge: true },
    { name: 'Takeout dinner', price: 32, category: 'eats', emoji: '🍔', store: 'Bistro', splurge: true },
    { name: 'Designer socks', price: 28, category: 'fits', emoji: '🧦', store: 'Threads', splurge: true },
    { name: 'In-app gems', price: 20, category: 'fun', emoji: '💎', store: 'GameStore', splurge: true },
    { name: 'Energy drinks', price: 14, category: 'drinks', emoji: '🥤', store: 'QuickStop', splurge: true },
    { name: 'Late-night snacks', price: 11, category: 'snacks', emoji: '🍿', store: 'QuickStop', splurge: true },
    { name: 'Craft beer 6-pack', price: 16, category: 'bars', emoji: '🍺', store: 'BottleShop', splurge: true },
    { name: 'Groceries', price: 85, category: 'grub', emoji: '🥑', store: 'FreshMart', splurge: false },
    { name: 'Phone plan', price: 45, category: 'bills', emoji: '📱', store: 'Telco', splurge: false },
    { name: 'Prescription', price: 18, category: 'pharmacy', emoji: '💊', store: 'Pharmacy', splurge: false },
    { name: 'Electric bill', price: 60, category: 'bills', emoji: '💡', store: 'PowerCo', splurge: false },
    { name: 'Gas fill-up', price: 42, category: 'gas-up', emoji: '⛽', store: 'FuelUp', splurge: false },
    { name: 'Paper towels', price: 14, category: 'household', emoji: '🧻', store: 'FreshMart', splurge: false },
  ],
  categories: [
    { slug: 'eats', label: 'Eats', emoji: '🍽️', total: 412 },
    { slug: 'grub', label: 'Grub', emoji: '🥑', total: 388 },
    { slug: 'bills', label: 'Bills', emoji: '💡', total: 305 },
    { slug: 'fits', label: 'Fits', emoji: '👔', total: 214 },
    { slug: 'tech', label: 'Tech', emoji: '📱', total: 189 },
    { slug: 'subs', label: 'Subs', emoji: '🔁', total: 96 },
    { slug: 'drinks', label: 'Drinks', emoji: '🥤', total: 78 },
    { slug: 'fun', label: 'Fun', emoji: '🎬', total: 64 },
  ],
  monthlyTotal: 1746,
  budget: 1500,
}

// Pull the signed-in player's real spending. Never throws — any failure falls
// back to the DEMO set so a game always has something to play with.
export async function loadPlayerSpending() {
  try {
    const sb = createClient()
    const { data: auth } = await sb.auth.getUser()
    const uid = auth?.user?.id
    if (!uid) return DEMO

    // Individual purchases (for the slicer) + parent store/category/date.
    const { data: items } = await sb
      .from('receipt_items')
      .select('item_name, price, qty, category, rating, receipts!inner(store_name, date, category)')
      .eq('returned', false)
      .order('id', { ascending: false })
      .limit(600)

    const rows = (items || []).filter((r) => Number(r.price) > 0 && r.item_name)
    if (rows.length < 6) return { ...DEMO, signedIn: true } // too little to be fun

    const purchases = rows.slice(0, 120).map((r) => {
      const category = r.category || r.receipts?.category || 'misc'
      const price = Math.round(Number(r.price))
      const m = catMeta(category)
      return {
        name: String(r.item_name).slice(0, 22),
        price,
        category,
        emoji: m.emoji,
        store: r.receipts?.store_name || '',
        splurge: classify(category, r.rating, price),
      }
    })

    // Category totals + monthly total from recent receipts (last ~90 days).
    const since = new Date(); since.setDate(since.getDate() - 90)
    const sinceISO = since.toISOString().slice(0, 10)
    const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30)
    const monthISO = monthAgo.toISOString().slice(0, 10)
    const { data: receipts } = await sb
      .from('receipts')
      .select('total_amount, category, date')
      .gte('date', sinceISO)
      .order('date', { ascending: false })
      .limit(2000)

    const totals = new Map()
    let monthlyTotal = 0
    for (const rc of (receipts || [])) {
      const amt = Number(rc.total_amount) || 0
      if (amt <= 0) continue
      const slug = rc.category || 'misc'
      totals.set(slug, (totals.get(slug) || 0) + amt)
      if (rc.date >= monthISO) monthlyTotal += amt
    }
    const categories = Array.from(totals.entries())
      .map(([slug, total]) => ({ ...catMeta(slug), total: Math.round(total) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)

    if (categories.length < 3) return { ...DEMO, signedIn: true }

    const budget = Math.max(300, Math.round((monthlyTotal * 0.9) / 50) * 50)
    return {
      signedIn: true,
      hasData: true,
      purchases,
      categories,
      monthlyTotal: Math.round(monthlyTotal),
      budget,
    }
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('[playerSpending] load failed:', e?.message)
    return DEMO
  }
}

// Hook wrapper — returns { data, loading }. `data` is null until the first
// load resolves; games can render a start card immediately and read data on
// Start, or gate the Start button on !loading.
export function usePlayerSpending() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    loadPlayerSpending().then((d) => { if (alive) { setData(d); setLoading(false) } })
    return () => { alive = false }
  }, [])
  return { data, loading }
}
