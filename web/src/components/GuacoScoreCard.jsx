'use client'
import Link from 'next/link'
import { calculateGuacoScore } from '../lib/guacoscore'
import GuacMascot from './GuacMascot'

const GRADE_TINT = {
  emerald: { stroke: '#10b981', text: 'text-emerald-700', bg: 'from-emerald-50 to-lime-100',  ring: 'ring-emerald-200' },
  lime:    { stroke: '#84cc16', text: 'text-lime-700',    bg: 'from-lime-50 to-emerald-100',  ring: 'ring-lime-200' },
  amber:   { stroke: '#f59e0b', text: 'text-amber-700',   bg: 'from-amber-50 to-yellow-100',  ring: 'ring-amber-200' },
  orange:  { stroke: '#f97316', text: 'text-orange-700',  bg: 'from-orange-50 to-amber-100',  ring: 'ring-orange-200' },
  rose:    { stroke: '#e11d48', text: 'text-rose-700',    bg: 'from-rose-50 to-red-100',      ring: 'ring-rose-200' },
}

// Big circular gauge showing the user's GuacoScore.
// Pass `receipts` (array) — typically your filtered list for the period.
// Pass `bankBite = { interest, fees, total }` to apply a penalty for the
// money lost to interest + fees over the same period.
export default function GuacoScoreCard({ receipts = [], bankBite = null, size = 'lg', className = '' }) {
  const { score, grade, ratedCount, bankPenalty } = calculateGuacoScore(receipts, { bankBite })
  const small = size === 'sm'

  // Pre-rating users get the same gauge with a starter score of 0
  // and a friendly "happy" framing instead of the old "Rate to unlock"
  // placeholder. The chip still nudges to /validate but doesn't gate
  // the whole tile behind it.
  const isPreRating = score == null
  const displayScore = isPreRating ? 0 : score
  const displayGrade = isPreRating
    ? { color: 'emerald', emoji: '🥑', label: 'Fresh start' }
    : grade

  const tint = GRADE_TINT[displayGrade.color] || GRADE_TINT.emerald
  const R = small ? 22 : 56
  const STROKE = small ? 5 : 9
  const C = 2 * Math.PI * R
  const offset = C * (1 - displayScore / 100)
  const svgSize = (R + STROKE) * 2 + 4

  if (small) {
    return (
      <div className={`stat-card relative overflow-hidden bg-gradient-to-br ${tint.bg} ring-1 ${tint.ring} ${className}`}>
        <div className="relative shrink-0" style={{ width: svgSize, height: svgSize }}>
          <svg viewBox={`0 0 ${svgSize} ${svgSize}`} width={svgSize} height={svgSize}>
            <circle cx={svgSize / 2} cy={svgSize / 2} r={R} fill="white" />
            <circle cx={svgSize / 2} cy={svgSize / 2} r={R}
              fill="none" stroke="#e5e7eb" strokeWidth={STROKE} />
            <circle cx={svgSize / 2} cy={svgSize / 2} r={R}
              fill="none" stroke={tint.stroke} strokeWidth={STROKE} strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={offset}
              transform={`rotate(-90 ${svgSize / 2} ${svgSize / 2})`}
              style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className={`font-extrabold tabular-nums ${tint.text} text-sm`}>{displayScore}</p>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-gray-500 font-medium leading-tight">GuacScore</p>
          <p className={`text-sm font-bold ${tint.text} flex items-center gap-1 mt-0.5`}>
            <span>{displayGrade.emoji}</span>
            <span className="truncate">{displayGrade.label}</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`card relative overflow-hidden bg-gradient-to-br ${tint.bg} border-0 ring-1 ${tint.ring} ${className}`}>
      <div className="flex items-center gap-4">
        <div className="relative shrink-0" style={{ width: svgSize, height: svgSize }}>
          <svg viewBox={`0 0 ${svgSize} ${svgSize}`} width={svgSize} height={svgSize}>
            <circle cx={svgSize / 2} cy={svgSize / 2} r={R} fill="white" />
            <circle cx={svgSize / 2} cy={svgSize / 2} r={R}
              fill="none" stroke="#e5e7eb" strokeWidth={STROKE} />
            <circle cx={svgSize / 2} cy={svgSize / 2} r={R}
              fill="none" stroke={tint.stroke} strokeWidth={STROKE} strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={offset}
              transform={`rotate(-90 ${svgSize / 2} ${svgSize / 2})`}
              style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className={`font-extrabold tabular-nums ${tint.text} text-3xl`}>{displayScore}</p>
            <p className="text-[9px] uppercase tracking-wider font-bold text-gray-500 -mt-1">/ 100</p>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">GuacScore™</p>
          <p className={`font-extrabold mt-0.5 flex items-center gap-1.5 text-xl ${tint.text}`}>
            <span className="text-xl">{displayGrade.emoji}</span>
            {displayGrade.label}
          </p>
          <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">{displayGrade.desc || ''}</p>
          <p className="text-[10px] text-gray-400 mt-1">
            From {ratedCount} rated purchase{ratedCount === 1 ? '' : 's'}
            {bankPenalty > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100 font-semibold">
                🦷 Bank Bite −{bankPenalty}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

