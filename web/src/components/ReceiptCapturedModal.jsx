'use client'
// Pops after a successful receipt parse to celebrate the capture.
//
// Visual: emerald-tinted curved-bottom hero (like a torn receipt
// header) with the captured GuacMoney value floating big, the store
// name + date + total below on white, a "Receipt items" summary card,
// and two CTAs: "Snap another" (closes modal, leaves user on the page)
// and "View receipt" (jumps to /receipts/<id>).
//
// Celebration burst: emerald + lime confetti dots fly outward from
// the center on mount, mascot pops in with a scale spring.

import { useEffect, useRef } from 'react'
import { Camera, ArrowRight, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { fireConfetti } from '../lib/confetti'
import { displayStoreName } from '../lib/store-name-normalize'

export default function ReceiptCapturedModal({ open, receipt, onClose, onSnapAnother }) {
  const router = useRouter()
  const burstRef = useRef(null)

  // Fire a confetti burst on open. Lib already exists in
  // lib/confetti.js (canvas-confetti wrapper). Best-effort.
  useEffect(() => {
    if (!open) return
    try { fireConfetti({ x: 0.5, y: 0.4 }) } catch {}
  }, [open])

  if (!open || !receipt) return null

  const items = receipt.items || []
  const itemCount = items.length
  const total = Number(receipt.total_amount || 0)
  // GuacMoney value — placeholder formula: $0.25 per matched line
  // item, $1 base. Real economy lives elsewhere; this is just for
  // the celebration chip.
  const guacMoney = Math.max(1, Math.round(itemCount * 0.25 + 1))

  return (
    <div
      className="fixed inset-0 z-[280] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm captured-fade"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={burstRef}
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden captured-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Torn-edge emerald hero with the GuacMoney value. */}
        <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700 text-white px-6 pt-5 pb-10 text-center">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white"
            aria-label="Close"
          >
            <X size={16} />
          </button>
          <div className="text-5xl mb-1 mascot-pop">🥑</div>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-100">Receipt captured</p>
          <p className="text-4xl font-black tabular-nums mt-1 leading-none">
            +${guacMoney}
            <span className="text-base font-bold align-top ml-1">GuacMoney</span>
          </p>

          {/* SVG zig-zag torn-edge — purely decorative */}
          <svg className="absolute bottom-0 left-0 right-0 w-full h-4 text-white" viewBox="0 0 180 16" preserveAspectRatio="none" aria-hidden>
            <path d="M0,0 L10,8 L20,0 L30,8 L40,0 L50,8 L60,0 L70,8 L80,0 L90,8 L100,0 L110,8 L120,0 L130,8 L140,0 L150,8 L160,0 L170,8 L180,0 L180,16 L0,16 Z" fill="currentColor"/>
          </svg>
        </div>

        {/* Store + total */}
        <div className="px-6 pt-5 pb-3 text-center">
          <p className="text-xl font-extrabold text-gray-900 truncate">
            {receipt.store_name ? displayStoreName(receipt.store_name) : 'Receipt'}
          </p>
          <p className="text-sm text-gray-500 tabular-nums">
            {receipt.date || '—'} · ${total.toFixed(2)}
          </p>
        </div>

        {/* Items preview — first 4 line items */}
        {itemCount > 0 && (
          <div className="mx-5 mb-4 rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
            {items.slice(0, 4).map((it, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2.5 text-sm">
                <span className="truncate font-medium text-gray-800">{it.item_name || 'Item'}</span>
                <span className="ml-2 tabular-nums text-gray-600">
                  ${Number(it.price ?? 0).toFixed(2)}
                </span>
              </div>
            ))}
            {itemCount > 4 && (
              <div className="px-3 py-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50/60 text-center">
                + {itemCount - 4} more
              </div>
            )}
          </div>
        )}

        {/* CTAs */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            type="button"
            onClick={() => { onClose?.(); onSnapAnother?.() }}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-gray-200 hover:border-emerald-300 text-gray-700 font-bold"
          >
            <Camera size={15} /> Snap another
          </button>
          <button
            type="button"
            onClick={() => {
              onClose?.()
              if (receipt.id) router.push(`/receipts/${receipt.id}`)
              else router.push('/receipts')
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white font-bold shadow"
          >
            View receipt <ArrowRight size={15} />
          </button>
        </div>
      </div>

      <style jsx>{`
        .captured-fade   { animation: cap-fade 200ms ease-out both; }
        .captured-pop    { animation: cap-pop 520ms cubic-bezier(0.16, 1.4, 0.3, 1) both; }
        .mascot-pop      { animation: mascot-pop 700ms cubic-bezier(0.16, 1.6, 0.3, 1) 80ms both; transform-origin: center; }
        @keyframes cap-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cap-pop  {
          0%   { opacity: 0; transform: translateY(20px) scale(0.85); }
          60%  { transform: translateY(-4px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes mascot-pop {
          0%   { opacity: 0; transform: scale(0.2)  rotate(-30deg); }
          70%  { transform: scale(1.18) rotate(8deg); }
          100% { opacity: 1; transform: scale(1)    rotate(0deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .captured-fade, .captured-pop, .mascot-pop { animation: none; }
        }
      `}</style>
    </div>
  )
}
