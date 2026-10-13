'use client'
// Receipt amount reconciliation — product spec §7.
//
// Subtotal + tax + tip + fees − discounts should reconcile to the total. When
// the user edits Tip (or any other amount) the check recomputes immediately and
// FLAGS a mismatch. It never rewrites the total: the printed total is the money
// that actually left the account, and a tip typed into the wrong box must not
// silently change it.

import { useMemo } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import { reconcileReceiptAmounts } from '../lib/budget-engine'

const money = value => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(value || 0))

export default function AmountReconciliation({ receipt }) {
  const check = useMemo(() => reconcileReceiptAmounts(receipt || {}), [receipt])
  // Nothing optional filled in yet — there is no claim to check.
  if (check.reconciles === null) return null

  if (check.reconciles) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-[13px] font-semibold text-emerald-800">
        <Check size={15} className="shrink-0" />
        Subtotal, tax, tip, fees, and discounts add up to {money(check.calculatedTotal)}.
      </p>
    )
  }

  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-900">
      <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
      <p>
        <strong className="font-bold">These amounts do not add up.</strong>{' '}
        Subtotal, tax, tip, fees, and discounts come to {money(check.calculatedTotal)}, which is{' '}
        {money(Math.abs(check.difference))} {check.difference > 0 ? 'less than' : 'more than'} the total charged.
        {receipt?.gratuity_included ? ' Gratuity is marked as already included — check the tip is not counted twice.' : ''}{' '}
        The total is left as entered; correct whichever figure is wrong.
      </p>
    </div>
  )
}
