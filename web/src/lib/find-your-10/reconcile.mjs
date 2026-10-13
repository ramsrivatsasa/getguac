import {suggestionHidden,suggestionKey} from './suggestion-feedback.mjs'
import {evidenceAmount} from './evidence.mjs'
// Recompute displayed evidence from current source records. The saved ledger
// remains an audit trail; deleting/correcting a source never leaves stale Kept.
import { comparableItem, usableItem, usableReceipt } from './opportunities.mjs'
import { choiceRevision } from './lifecycle.mjs'
import { quickOpportunities, selectQuickAlternative } from './quick-plan.mjs'
const cents = value => Math.round(Number(value) * 100)
const key = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
const validBill = bill => bill && bill.statement_amount != null && Number.isFinite(Number(bill.statement_amount)) && Number(bill.statement_amount) >= 0 && bill.bill_series?.cadence === 'monthly' && !['needs_review', 'skipped', 'canceled'].includes(bill.status)

export function reconcileProgress(state, data, now = new Date().toISOString()) {
  if (!state) return null
  const next = structuredClone(state)
  if (next.quickPlan) {
    const current = quickOpportunities({ ...data, progress: state }, new Date(now))
    next.quickPlan.choices = next.quickPlan.choices.map(choice => {
      if(choice.decision==='keep')return {...choice,estimateCents:0,needsReview:false}
      if (suggestionHidden(state,suggestionKey('purchase',choice.itemKey,choice))) return {...choice,decision:'excluded'}
      // A completed snapshot is history, not a new quote. Ledger evidence is reconciled below.
      if (choice.completedAt || choice.lifecycleVersion) return choice
      const candidate = current.find(c => c.id === choice.id)
      if (candidate) {
        try {
          const updated=selectQuickAlternative(candidate, choice.selectedAlternative, choice.homeCost)
          if (updated.choice===choice.choice) return { ...choice, quoteChanged: choiceRevision(updated)!==choiceRevision({...choice,cadence:undefined,mode:undefined,occurrences:undefined}) }
        } catch { /* Changed baseline no longer supports this scenario. */ }
      }
      return { ...choice, estimateCents: 0, needsReview: true }
    })
    next.quickPlan.estimatedCents = next.quickPlan.choices.filter(c => c.decision === 'accept').reduce((sum,c) => sum + c.estimateCents, 0)
  }
  const receipts = new Map((data.receipts || []).map(r => [r.id, r]))
  const items = new Map((data.items || []).map(r => [r.id, r]))
  const bills = new Map((data.billCycles || []).map(r => [r.id, r]))
  const today = now.slice(0, 10)
  for (const action of next.actions || []) {
    if (action.type === 'shopping' && !comparableItem(items.get(action.sourceId))) {
      action.accepted = false
      action.estimateCents = 0
    }
  }
  for (const entry of next.ledger) {
    const action = next.actions.find(a => a.id === entry.actionId)
    // Preserve the originally claimed ceiling across repeated reconciliations.
    entry.recordedAmountCents ??= entry.amountCents
    const isBill = action && (!action.type || action.type === 'bill') && entry.type !== 'quick'
    let supported = isBill ? -(entry.feeCents || 0) : 0
    if(entry.type==='quick') {
      try {supported=evidenceAmount(entry.choiceSnapshot,{evidenceId:entry.evidenceId,refundId:entry.refundId,comparable:entry.comparable,fees:String((entry.feeCents||0)/100)},data,now).amountCents} catch {supported=0}
    } else if (action?.type === 'purchase') {
      const sources = (action.baselineIds || []).map(id => items.get(id))
      const rows = [...items.values()].filter(i => usableItem(i) && key(i.item_name) === action.itemKey && i.receipts.date.startsWith(entry.period))
      if (sources.length && sources.every(usableItem) && entry.coverageConfirmed && entry.period < now.slice(0, 7) && entry.evidenceIds?.every(id => rows.some(i => i.id === id))) {
        const baseline = Math.min(action.periodBaselineCents, sources.reduce((s, i) => s + cents(i.price), 0))
        supported = Math.min(action.estimateCents, baseline - rows.reduce((s, i) => s + cents(i.price), 0) - (entry.feeCents || 0))
      }
    } else if (action?.type === 'shopping') {
      const source = items.get(action.sourceId), evidence = items.get(entry.evidenceId)
      if (comparableItem(source) && comparableItem(evidence) && key(source.item_name) === action.itemKey && key(evidence.item_name) === action.itemKey && evidence.receipts.date > action.sourceDate && evidence.receipts.date <= today) {
        const baseline = Math.min(action.baselineCents, Math.round(cents(source.price) / Number(source.qty)))
        supported = Math.round(baseline * Number(evidence.qty)) - cents(evidence.price) - (entry.feeCents || 0)
      }
    } else if (action?.type === 'spending') {
      const baselineRows = [...receipts.values()].filter(r => usableReceipt(r) && r.category === action.category && r.date.startsWith(action.previousMonth))
      const rows = [...receipts.values()].filter(r => usableReceipt(r) && r.category === action.category && r.date.startsWith(entry.period))
      const originalEvidencePresent = entry.evidenceIds?.every(id => rows.some(r => r.id === id))
      if (entry.coverageConfirmed && originalEvidencePresent && baselineRows.length && rows.length && entry.period < now.slice(0, 7)) {
        const amount = rows => rows.reduce((sum, r) => sum + (r.is_return ? -Math.abs(cents(r.total_amount)) : cents(r.total_amount)), 0)
        supported = Math.min(action.estimateCents, Math.min(action.baselineCents, amount(baselineRows)) - amount(rows))
      }
    } else if (action) {
      const source = bills.get(action.sourceId || action.id), evidence = bills.get(entry.evidenceId)
      if (validBill(source) && validBill(evidence) && evidence.bill_series_id === action.seriesId && evidence.due_date > action.sourceDate && evidence.due_date <= today) {
        supported = Math.min(action.baselineCents, cents(source.statement_amount)) - cents(evidence.statement_amount) - (entry.feeCents || 0)
      }
    }
    const reconciled = Math.min(entry.recordedAmountCents, Number.isFinite(supported) ? supported : 0)
    entry.amountCents = isBill ? reconciled : Math.max(0, reconciled)
    entry.evidenceAdjusted = entry.amountCents !== entry.recordedAmountCents
    // A past transfer remains a recorded transfer; it does not become savings.
  }
  return next
}
