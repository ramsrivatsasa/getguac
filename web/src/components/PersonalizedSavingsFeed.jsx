'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BellRing, BookOpen, PiggyBank, ReceiptText, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, TrendingDown } from 'lucide-react'
import GuacMascot from './GuacMascot'
import { buildPersonalizedOpportunityRanking, loadPersonalizationSignals, recordPersonalizationEvent } from '../lib/userProfile'

const money = value => Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export default function PersonalizedSavingsFeed({ receipts = [], goals = [], bills = [], items = [], stores = [] }) {
  const [learningSignals, setLearningSignals] = useState({ version: 1, cards: {}, updatedAt: null })
  const [feedbackMessage, setFeedbackMessage] = useState('')
  useEffect(() => setLearningSignals(loadPersonalizationSignals()), [])
  const topGoal = goals[0]
  const goalCurrent = Number(topGoal?.current_amount || 0)
  const goalTarget = Number(topGoal?.target_amount || 0)
  const goalProgress = goalTarget > 0 ? Math.min(100, Math.round(goalCurrent / goalTarget * 100)) : 0
  const goalRemaining = Math.max(0, goalTarget - goalCurrent)
  const topStore = stores[0]
  const storeReceipts = topStore ? receipts.filter(receipt => String(receipt.store_name || '').toLowerCase().includes(String(topStore.fullName || '').toLowerCase().split(' ')[0])).length : 0
  const categories = new Map()
  for (const receipt of receipts) {
    const category = receipt.category || 'Other'
    categories.set(category, (categories.get(category) || 0) + Number(receipt.total_amount || 0))
  }
  const topCategory = [...categories.entries()].sort((a, b) => b[1] - a[1])[0]
  const categoryText = [...categories.keys()].join(' ').toLowerCase()
  const goalText = goals.map(goal => `${goal.name || ''} ${goal.goal_type || ''}`).join(' ').toLowerCase()
  const hasFamilySignal = /family|household|grocery|child|baby|school/.test(categoryText + ' ' + goalText)
  const hasCollegeSignal = /college|tuition|education|university|student|school/.test(categoryText + ' ' + goalText)
  const itemHistory = new Map()
  for (const item of items) {
    const key = String(item.sku || item.item_name || '').trim().toLowerCase()
    if (!key) continue
    itemHistory.set(key, (itemHistory.get(key) || 0) + 1)
  }
  const repeatItems = [...itemHistory.values()].filter(count => count > 1).length
  const learningModel = useMemo(() => buildPersonalizedOpportunityRanking({ receipts, goals, bills, items, stores, signals: learningSignals }), [receipts, goals, bills, items, stores, learningSignals])

  const cards = [
    {
      id: 'store',
      kind: 'Save',
      context: 'For you',
      eyebrow: topStore ? `Based on your ${topStore.fullName} receipts` : 'Based on your receipts',
      title: topStore ? `Spot room to save at ${topStore.fullName}` : 'See where there may be room to save',
      detail: topStore ? `${storeReceipts || topStore.count || 0} purchases · ${money(topStore.amount)} tracked in this view.` : `${receipts.length} receipts are ready to organize into a clearer spending story.`,
      action: 'Open receipts', href: '/receipts', icon: ReceiptText, art: 'from-blue-700 via-blue-600 to-cyan-400',
    },
    {
      id: 'protection',
      kind: 'Protect',
      context: 'For your purchases',
      eyebrow: 'Purchase protection',
      title: 'Keep returns and warranties visible',
      detail: `${receipts.length} recent purchase${receipts.length === 1 ? '' : 's'} can feed return dates, recalls, and warranty reminders.`,
      action: 'Protect purchases', href: '/returns', icon: ShieldCheck, art: 'from-rose-700 via-rose-500 to-orange-300',
    },
    {
      id: 'bills',
      kind: 'Plan',
      context: bills.length ? 'For your next bills' : 'For your future',
      eyebrow: bills.length ? `Built from ${bills.length} upcoming bill${bills.length === 1 ? '' : 's'}` : 'Recurring money',
      title: bills.length ? 'Make room before bills arrive' : 'Find subscriptions worth reviewing',
      detail: bills.length ? 'See due dates beside safe-to-spend so the next payment is not a surprise.' : 'Add recurring bills to see their effect on your available money.',
      action: 'Review bills', href: '/bills', icon: BellRing, art: 'from-violet-800 via-violet-600 to-fuchsia-400',
    },
    {
      id: 'prices',
      kind: 'Learn',
      context: 'For your future',
      eyebrow: repeatItems ? `${repeatItems} repeat item${repeatItems === 1 ? '' : 's'} recognized` : 'Price memory',
      title: repeatItems ? 'Watch what your usual items cost' : 'Build your personal price history',
      detail: repeatItems ? 'Compare unit prices over time instead of trusting a sale label.' : 'Itemized receipts will turn repeat purchases into a price-change timeline.',
      action: 'See reports', href: '/reports', icon: TrendingDown, art: 'from-orange-700 via-orange-500 to-amber-300',
    },
    {
      id: 'knowledge',
      kind: 'Know',
      context: hasCollegeSignal ? 'Back to college' : hasFamilySignal ? 'For your family' : 'For your knowledge',
      eyebrow: topCategory ? `Learn from your ${topCategory[0]} pattern` : 'Money knowledge for real life',
      title: repeatItems ? 'Know unit price—not just the sale label' : 'Learn one idea from your own activity',
      detail: repeatItems ? 'A smaller shelf price can still cost more per ounce, count, or use. GetGuac keeps the comparison connected to your receipts.' : 'Short lessons become more useful when they explain a bill, receipt, goal, or price already in your account.',
      action: 'Build my knowledge', href: '/learn', icon: BookOpen, art: 'from-cyan-800 via-cyan-600 to-blue-400',
    },
  ]
  const rank = new Map(learningModel.ranked.map((opportunity, index) => [opportunity.id, index]))
  const rankedCards = [...cards].sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99))
  const featuredCard = rankedCards[0]
  const featuredOpportunity = learningModel.ranked.find(opportunity => opportunity.id === featuredCard?.id)
  useEffect(() => {
    for (const card of rankedCards.slice(0, 5)) {
      const sessionKey = `getguac_profile_impression_${card.id}`
      if (sessionStorage.getItem(sessionKey)) continue
      recordPersonalizationEvent(card.id, 'impression')
      sessionStorage.setItem(sessionKey, '1')
    }
    // One impression pass per browser session, not on every feedback update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipts.length, goals.length, bills.length, items.length])

  function learnFromClick(cardId) {
    setLearningSignals(recordPersonalizationEvent(cardId, 'click'))
  }

  function learnFromFeedback(event) {
    if (!featuredCard) return
    setLearningSignals(recordPersonalizationEvent(featuredCard.id, event))
    setFeedbackMessage(event === 'more-useful' ? 'Got it — we’ll prioritize more opportunities like this.' : 'Got it — we’ll show less of this and keep exploring.')
  }

  return <section className="dashboard-edit-card overflow-hidden">
    <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-100 text-violet-700"><Sparkles size={16}/></span><h2 className="text-lg font-black text-slate-950">Guides & tools for you</h2></div><p className="mt-1 text-xs text-slate-600">Optional guidance selected from your purchases, bills, goals, and account activity. Nothing changes unless you choose an action.</p></div><Link href="/discover" className="inline-flex items-center gap-1 text-xs font-black text-violet-700">Explore all <ArrowRight size={13}/></Link></div>
    </div>

    <div className="p-4 sm:p-5"><div className="flex items-start snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:thin]">{rankedCards.map(({ id, kind, eyebrow, title, detail, action, href, icon: Icon, art }, index) => <Link href={href} onClick={()=>learnFromClick(id)} key={title} className="group w-[230px] shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"><div className={`relative h-24 overflow-hidden bg-gradient-to-br ${art}`}><div className="absolute -right-8 -top-12 h-36 w-36 rotate-12 rounded-[2.5rem] border-[22px] border-white/10"/><div className="absolute -bottom-7 -left-5 h-24 w-40 -rotate-6 rounded-[2rem] bg-white/10"/><p className="absolute left-3 top-3 text-xs font-black uppercase tracking-[.16em] text-white/90">{kind}</p><Icon size={40} strokeWidth={1.35} className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white drop-shadow-sm transition duration-300 group-hover:scale-110"/>{index === 0 && <span className="absolute bottom-3 right-3 rounded-md bg-amber-300 px-2 py-1 text-xs font-black uppercase tracking-wide text-amber-950 shadow-sm">Top pick</span>}<div className="absolute bottom-3 left-3 flex gap-1" aria-hidden="true"><span className="h-1.5 w-7 rounded-full bg-white"/><span className="h-1.5 w-4 rounded-full bg-white/50"/><span className="h-1.5 w-4 rounded-full bg-white/30"/></div></div><div className="p-3"><p className="text-xs font-black uppercase tracking-wider text-slate-500">{eyebrow}</p><h3 className="mt-1.5 text-sm font-black leading-5 text-slate-950">{title}</h3><p className="mt-1.5 text-sm leading-5 text-slate-600">{detail}</p><span className="mt-3 inline-flex items-center gap-1 text-sm font-black text-violet-700">{action}<ArrowRight size={14}/></span></div></Link>)}</div><div className="mt-3 grid gap-2 rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-600 sm:grid-cols-[1fr_auto] sm:items-center"><div className="flex items-start gap-2"><BookOpen size={15} className="mt-0.5 shrink-0 text-slate-500"/><span><strong className="text-slate-800">Why this top pick?</strong> {featuredOpportunity?.reason || 'It matches the strongest useful signal in this account.'} Engagement can adjust the order, but financial relevance stays in control.</span></div><div className="flex flex-wrap items-center gap-1.5"><span className="mr-1 text-slate-600">Useful?</span><button type="button" onClick={()=>learnFromFeedback('more-useful')} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 font-bold text-slate-700 hover:border-violet-300 hover:text-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-600"><ThumbsUp size={13}/>More</button><button type="button" onClick={()=>learnFromFeedback('less-useful')} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 font-bold text-slate-700 hover:border-violet-300 hover:text-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-600"><ThumbsDown size={13}/>Less</button></div>{feedbackMessage && <p aria-live="polite" className="text-violet-700 sm:col-span-2">{feedbackMessage}</p>}</div></div>
  </section>
}
