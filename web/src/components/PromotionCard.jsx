'use client'
import { BadgeCheck, Bot, ExternalLink, Mail, Search, Tag, X } from 'lucide-react'
import { safeOfferUrl } from '../lib/promotion-presentation.mjs'

const sourceStyle = {
  email: { label: 'Email offer', icon: Mail, tone: 'bg-blue-50 text-blue-700' },
  web: { label: 'Web result', icon: Search, tone: 'bg-violet-50 text-violet-700' },
  ai: { label: 'AI discovered', icon: Bot, tone: 'bg-emerald-50 text-emerald-700' },
  manual: { label: 'Saved offer', icon: Tag, tone: 'bg-amber-50 text-amber-700' },
}

export default function PromotionCard({ promotion, onDismiss, onKeep, compact = false }) {
  const source = sourceStyle[promotion.source] || sourceStyle.manual
  const Icon = source.icon
  const expires = promotion.expires_at ? new Date(promotion.expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null
  const url = safeOfferUrl(promotion.redemption_url || promotion.source_url)
  return <article className={`rounded-2xl border border-slate-200 bg-white ${compact ? 'p-3' : 'p-4'} shadow-sm`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase ${source.tone}`}><Icon size={11}/>{source.label}</span>{promotion.verification_status === 'verified' && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"><BadgeCheck size={12}/> Verified</span>}</div><p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-500">{promotion.merchant_name}</p></div>
      {onDismiss && <button type="button" onClick={() => onDismiss(promotion.id)} aria-label={`Dismiss ${promotion.title}`} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={15}/></button>}
    </div>
    <h3 className={`${compact ? 'mt-1 text-sm' : 'mt-2 text-base'} font-black leading-5 text-slate-950`}>{promotion.title}</h3>
    {promotion.benefit_text && <p className="mt-2 text-lg font-black text-emerald-700">{promotion.benefit_text}</p>}
    {!compact && promotion.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{promotion.description}</p>}
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><span className="font-bold text-slate-500">{expires ? `Ends ${expires}` : 'Expiry not confirmed'}</span>{promotion.promo_code && <code className="rounded-md bg-slate-100 px-2 py-1 font-black text-slate-700">{promotion.promo_code}</code>}{url && <a href={url} target="_blank" rel="noreferrer" className="ml-auto inline-flex min-h-11 items-center gap-1 font-black text-violet-700">View offer <ExternalLink size={12}/></a>}</div>
    <details className="mt-2 text-xs leading-5 text-slate-600"><summary className="cursor-pointer py-2 font-semibold text-violet-700">Terms & source</summary><p>{promotion.eligibility || 'Eligibility has not been confirmed.'}</p>{promotion.description && <p className="mt-1 break-words">{promotion.description}</p>}<p className="mt-1">{promotion.status === 'review' ? 'Requires review before use.' : 'Check the merchant terms before redeeming.'}</p>{promotion.last_checked_at && <p>Checked {new Date(promotion.last_checked_at).toLocaleDateString()}</p>}{safeOfferUrl(promotion.source_url) && <a className="underline break-words" href={safeOfferUrl(promotion.source_url)} target="_blank" rel="noreferrer">Original source ↗</a>}</details>
    {promotion.status === 'review' && onKeep && promotion.benefit_text && (url || promotion.promo_code) && <button type="button" className="mt-2 flex min-h-11 items-center rounded-xl border border-violet-200 px-3 text-sm font-semibold text-violet-700" onClick={() => onKeep(promotion.id)}>Keep in Rewards</button>}
  </article>
}
