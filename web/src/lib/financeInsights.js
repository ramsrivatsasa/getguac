// Financial insight engine — turns raw bank_statements / bank_fees /
// bank_transactions / receipts into a curated list of human-readable
// insights for the GuacWizard page. Pure functions — no DB calls.
//
// Each insight has the shape:
//   { id, severity, emoji, title, body, metric?, action? }
// severity ∈ { 'good', 'neutral', 'watch', 'warning', 'urgent' }

const MS_DAY = 86400000

export const PERIODS = [
  { key: 'mtd',   label: 'This month',  fn: () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) } },
  { key: '30d',   label: '30 days',     fn: () => new Date(Date.now() - 30 * MS_DAY) },
  { key: '90d',   label: '90 days',     fn: () => new Date(Date.now() - 90 * MS_DAY) },
  { key: 'ytd',   label: 'Year-to-date', fn: () => new Date(new Date().getFullYear(), 0, 1) },
  { key: '12mo',  label: 'Last 12 mo',  fn: () => new Date(Date.now() - 365 * MS_DAY) },
  { key: 'all',   label: 'All time',    fn: () => null },
]

export function getPeriodStart(key) {
  return (PERIODS.find(p => p.key === key) || PERIODS[3]).fn()
}

const inRange = (dateStr, since) => !since || new Date(dateStr) >= since

// ─────────────────────────────────────────────────────────────────────────
// Per-bank-account roll-up over a period
// Returns:
//   [{ key, issuer, account_last4, totalInterest, totalFees, totalPayments,
//      totalPurchases, totalRefunds, statementCount, latestApr, latestDueDate,
//      latestBalance, latestPayoffMonths }]
// ─────────────────────────────────────────────────────────────────────────
export function bankAccountTotals({ statements, fees, transactions }, periodKey = 'ytd') {
  const since = getPeriodStart(periodKey)
  const m = new Map()

  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

  for (const s of statements) {
    const key = s.account_last4 ? `acct:${s.account_last4}` : `issuer:${norm(s.issuer) || 'unknown'}`
    if (!m.has(key)) m.set(key, {
      key,
      issuer: s.issuer || 'Unknown bank',
      account_last4: s.account_last4 || null,
      statementIds: new Set(),
      statementCount: 0,
      totalInterest: 0,
      totalFees: 0,
      totalPayments: 0,
      paymentCount: 0,
      totalPurchases: 0,
      totalRefunds: 0,
      latestApr: null,
      latestDueDate: null,
      latestBalance: null,
      latestPayoffMonths: null,
      latestPeriodEnd: null,
    })
    const b = m.get(key)
    b.statementIds.add(s.id)
    // Use period_end to decide if the statement falls in range. Statements
    // with no period_end are treated as in-range (better than dropping them).
    const stmtDate = s.period_end || s.uploaded_at?.slice(0, 10)
    if (!stmtDate || inRange(stmtDate, since)) {
      b.statementCount += 1
      const t = s.totals || {}
      b.totalInterest  += Number(t.interest || 0)
      b.totalFees      += Number(t.fees || 0)
      b.totalPayments  += Number(t.payments || 0)
      b.totalPurchases += Number(t.purchases || 0)
      b.totalRefunds   += Number(t.refunds || 0)
    }
    if (!b.latestPeriodEnd || (s.period_end && s.period_end > b.latestPeriodEnd)) {
      b.latestPeriodEnd      = s.period_end || b.latestPeriodEnd
      b.latestApr            = s.purchase_apr ?? b.latestApr
      b.latestDueDate        = s.payment_due_date ?? b.latestDueDate
      b.latestBalance        = s.new_balance ?? b.latestBalance
      b.latestPayoffMonths   = s.payoff_months_min ?? b.latestPayoffMonths
      if (s.issuer) b.issuer = s.issuer
    }
  }

  // Cross-check the totals against actual rows in the period — prefer the
  // larger of (AI total, row sum) so missing fields don't underreport.
  for (const b of m.values()) {
    const ids = b.statementIds
    const txnRows = transactions.filter(t => ids.has(t.statement_id) && inRange(t.date, since))
    const feeRows = fees.filter(f => ids.has(f.statement_id) && inRange(f.date, since))
    const sumAbs = (a) => a.reduce((n, x) => n + Math.abs(Number(x.amount || 0)), 0)
    const sumPos = (a) => a.reduce((n, x) => n + Number(x.amount || 0), 0)

    const paymentRows = txnRows.filter(t => t.is_payment)
    const cInterest = sumAbs(feeRows.filter(f => f.kind === 'interest')) + sumAbs(txnRows.filter(t => t.is_interest))
    const cFees     = sumAbs(feeRows.filter(f => f.kind === 'fee' || f.kind === 'penalty')) + sumAbs(txnRows.filter(t => t.is_fee))
    const cPayments = sumAbs(paymentRows)
    const cPaymentCount = paymentRows.length
    const cPurchases = sumPos(txnRows.filter(t => !t.is_payment && !t.is_fee && !t.is_interest && !t.is_refund && t.amount > 0))
    const cRefunds   = sumAbs(txnRows.filter(t => t.is_refund || (t.amount < 0 && !t.is_payment && !t.is_fee && !t.is_interest)))

    b.totalInterest  = Math.max(b.totalInterest,  cInterest)
    b.totalFees      = Math.max(b.totalFees,      cFees)
    b.totalPayments  = Math.max(b.totalPayments,  cPayments)
    b.paymentCount   = Math.max(b.paymentCount,   cPaymentCount)
    b.totalPurchases = Math.max(b.totalPurchases, cPurchases)
    b.totalRefunds   = Math.max(b.totalRefunds,   cRefunds)
  }

  return [...m.values()]
    .map(b => ({ ...b, statementIds: undefined }))
    .sort((a, b) => (b.totalInterest + b.totalFees) - (a.totalInterest + a.totalFees))
}

// ─────────────────────────────────────────────────────────────────────────
// GuacWizard insight generator
// ─────────────────────────────────────────────────────────────────────────
export function generateInsights({ statements = [], fees = [], transactions = [], receipts = [] }, periodKey = 'ytd') {
  const insights = []
  const since = getPeriodStart(periodKey)
  const periodLabel = (PERIODS.find(p => p.key === periodKey) || PERIODS[3]).label

  const accounts = bankAccountTotals({ statements, fees, transactions }, periodKey)

  const totalInterest = accounts.reduce((n, a) => n + a.totalInterest, 0)
  const totalFees     = accounts.reduce((n, a) => n + a.totalFees, 0)
  const totalPayments = accounts.reduce((n, a) => n + a.totalPayments, 0)
  const totalPurch    = accounts.reduce((n, a) => n + a.totalPurchases, 0)
  const totalRefunds  = accounts.reduce((n, a) => n + a.totalRefunds, 0)
  const netDebtChange = totalPurch - totalRefunds - totalPayments

  // ── Headline: total interest + fees combined ─────────────────────────
  if (totalInterest + totalFees > 0) {
    const combined = totalInterest + totalFees
    insights.push({
      id: 'cost-of-borrowing',
      severity: combined > 200 ? 'warning' : 'watch',
      emoji: combined > 200 ? '🔥' : '💸',
      title: `$${combined.toFixed(2)} lost to interest + fees`,
      body: `Across all your cards this ${periodLabel.toLowerCase()}. That's $${totalInterest.toFixed(2)} in interest and $${totalFees.toFixed(2)} in fees.`,
      action: combined > 200 ? 'Pay down the highest-APR balance first to cut the bleed.' : null,
    })
  } else if (statements.length > 0) {
    insights.push({
      id: 'no-finance-charges',
      severity: 'good',
      emoji: '🥑',
      title: 'No interest, no fees',
      body: `Clean ${periodLabel.toLowerCase()} — nothing extra paid to the banks.`,
    })
  }

  // ── Biggest interest payer ────────────────────────────────────────────
  const topInterest = [...accounts].filter(a => a.totalInterest > 0).sort((a, b) => b.totalInterest - a.totalInterest)[0]
  if (topInterest) {
    const label = topInterest.account_last4 ? `${topInterest.issuer} ••${topInterest.account_last4}` : topInterest.issuer
    insights.push({
      id: 'top-interest-card',
      severity: 'warning',
      emoji: '📈',
      title: `${label} is your most expensive card`,
      body: `Charged $${topInterest.totalInterest.toFixed(2)} in interest this ${periodLabel.toLowerCase()}${topInterest.latestApr ? ` at ${Number(topInterest.latestApr).toFixed(2)}% APR` : ''}.`,
      action: 'Target this card with extra payments before any other.',
    })
  }

  // ── Worst-fee card ───────────────────────────────────────────────────
  const topFees = [...accounts].filter(a => a.totalFees > 0).sort((a, b) => b.totalFees - a.totalFees)[0]
  if (topFees && topFees.totalFees >= 25) {
    const label = topFees.account_last4 ? `${topFees.issuer} ••${topFees.account_last4}` : topFees.issuer
    insights.push({
      id: 'top-fees-card',
      severity: 'watch',
      emoji: '⚠️',
      title: `${label} charged you $${topFees.totalFees.toFixed(2)} in fees`,
      body: 'Annual fees, foreign-tx, late, ATM — those add up.',
      action: 'Open this card on the Bank page and review the fee rows. Cards without annual fees exist.',
    })
  }

  // ── Upcoming / overdue payments ──────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = statements
    .filter(s => s.payment_due_date && s.minimum_payment_due)
    .map(s => ({ s, days: Math.round((new Date(s.payment_due_date) - new Date()) / MS_DAY) }))
    .filter(({ days }) => days >= -3 && days <= 14)
    .sort((a, b) => a.days - b.days)

  for (const { s, days } of upcoming.slice(0, 2)) {
    const label = s.account_last4 ? `${s.issuer || 'Card'} ••${s.account_last4}` : (s.issuer || 'Card')
    if (days < 0) {
      insights.push({
        id: `overdue-${s.id}`,
        severity: 'urgent',
        emoji: '🚨',
        title: `${label} payment is ${-days} day${-days === 1 ? '' : 's'} overdue`,
        body: `Minimum due was $${Number(s.minimum_payment_due).toFixed(2)} on ${s.payment_due_date}. Late fees + interest stack up fast.`,
        action: 'Pay this right now if you can.',
      })
    } else if (days <= 3) {
      insights.push({
        id: `due-soon-${s.id}`,
        severity: 'warning',
        emoji: '⏰',
        title: `$${Number(s.minimum_payment_due).toFixed(2)} due ${days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`} on ${label}`,
        body: `Statement period ${s.period_start} → ${s.period_end}.`,
        action: 'Schedule a payment now to dodge interest.',
      })
    }
  }

  // ── Minimum-only payoff warnings ─────────────────────────────────────
  for (const a of accounts) {
    if (a.latestBalance == null || a.latestPayoffMonths == null || a.latestBalance <= 0) continue
    if (a.latestPayoffMonths >= 60) {
      const label = a.account_last4 ? `${a.issuer} ••${a.account_last4}` : a.issuer
      const y = Math.floor(a.latestPayoffMonths / 12)
      insights.push({
        id: `slow-payoff-${a.key}`,
        severity: 'warning',
        emoji: '🐢',
        title: `${label} won't be paid off for ${y}+ years on minimums`,
        body: `Balance $${Number(a.latestBalance).toFixed(2)} · paying minimum only = ${a.latestPayoffMonths} months.`,
        action: 'Even +$50 above minimum cuts years off the payoff.',
      })
    }
  }

  // ── Net debt direction ───────────────────────────────────────────────
  if (totalPayments > 0 || totalPurch > 0) {
    if (netDebtChange > 100) {
      insights.push({
        id: 'debt-growing',
        severity: 'warning',
        emoji: '📈',
        title: `Card debt grew by ~$${netDebtChange.toFixed(2)} this ${periodLabel.toLowerCase()}`,
        body: `You spent $${totalPurch.toFixed(2)} but only paid back $${totalPayments.toFixed(2)} (and got $${totalRefunds.toFixed(2)} in refunds).`,
        action: 'Aim for payments ≥ purchases each period.',
      })
    } else if (netDebtChange < -100) {
      insights.push({
        id: 'debt-shrinking',
        severity: 'good',
        emoji: '🥑',
        title: `Crushing it — debt down ~$${Math.abs(netDebtChange).toFixed(2)}`,
        body: `You paid $${totalPayments.toFixed(2)} against $${totalPurch.toFixed(2)} in purchases.`,
      })
    }
  }

  // ── High APR alert (any card > 25%) ──────────────────────────────────
  const highApr = accounts.filter(a => a.latestApr != null && Number(a.latestApr) >= 25)
  if (highApr.length > 0) {
    const names = highApr.map(a => a.account_last4 ? `${a.issuer} ••${a.account_last4}` : a.issuer).join(', ')
    insights.push({
      id: 'high-apr',
      severity: 'watch',
      emoji: '🔥',
      title: `${highApr.length} card${highApr.length === 1 ? '' : 's'} above 25% APR`,
      body: names,
      action: 'A 0% balance-transfer offer (typically 12–18 months) could save you serious money.',
    })
  }

  // ── Statement upload health ──────────────────────────────────────────
  if (statements.length === 0) {
    insights.push({
      id: 'no-statements',
      severity: 'neutral',
      emoji: '📭',
      title: 'Upload your first statement',
      body: 'GuacWizard needs at least one credit-card or bank statement to start spotting patterns.',
      action: 'Open the Bank page and drop a statement.',
    })
  }

  // ── Reconciliation health ────────────────────────────────────────────
  if (transactions.length > 20) {
    const reconciled = transactions.filter(t => t.imported && t.receipt_id).length
    const ratio = reconciled / transactions.length
    if (ratio < 0.3) {
      insights.push({
        id: 'low-reconcile',
        severity: 'neutral',
        emoji: '🧩',
        title: 'Most statement rows aren\'t matched to receipts',
        body: `Only ${(ratio * 100).toFixed(0)}% of your statement transactions are reconciled.`,
        action: 'Hit the Reconcile button on the Receipts page to auto-pair what we can.',
      })
    }
  }

  // Sort by severity (urgent first, good last)
  const order = { urgent: 0, warning: 1, watch: 2, neutral: 3, good: 4 }
  insights.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9))

  return {
    insights,
    summary: {
      totalInterest, totalFees, totalPayments, totalPurch, totalRefunds, netDebtChange,
      accountCount: accounts.length,
      periodLabel,
    },
    accounts,
  }
}
