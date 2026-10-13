const SITE = 'https://getguac.app'

// Keep each public page's search result and share preview about that page.
// A complete child Open Graph object avoids inheriting the homepage URL.
export function publicMetadata(path, title, description) {
  const branded = `${title} | GetGuac`
  return {
    title: { absolute: branded }, description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website', siteName: 'GetGuac', url: path,
      title: branded, description,
      images: [{ url: '/og.png', width: 1200, height: 630, alt: 'GetGuac money planning and purchase records' }],
    },
    twitter: { card: 'summary_large_image', title: branded, description, images: ['/og.png'] },
  }
}

export const FEATURE_SEARCH = {
  'capture/income': ['Income Tracker & Budget Planning', 'Record income sources and payment schedules in GetGuac. Use your saved income records to plan a budget and review upcoming household costs.'],
  'capture/accounts': ['Account Records & Bank Statement Reader', 'Organize account records and upload supported bank statements in GetGuac. Review extracted fees, interest and balances without a required bank connection.'],
  'capture/email': ['Email Receipt Organizer & Shopping Inbox', 'Organize receipt emails in your GetGuac shopping inbox. Review supported purchase records while keeping promotions separate from recorded spending.'],
  'capture/receipts': ['Receipt Scanner & Searchable Purchase History', 'Scan paper receipts and add digital receipts with GetGuac. Review stores, dates, items, tax and totals, then search your saved purchase history.'],
  'understand/dashboard': ['Spending Dashboard & Money Overview', 'Review recorded spending, budget information and reminders in the GetGuac dashboard. Open the purchase records behind your money overview.'],
  'understand/budget': ['Budget Planner & Income and Expense Tracker', 'Plan income, bills, spending and savings with GetGuac. Compare your budget with recorded activity and adjust your plan as the month changes.'],
  'understand/reports': ['Spending Reports & Expense Categories', 'Explore spending reports by category and time period in GetGuac. Review the purchases and item details behind your recorded expense totals.'],
  'understand/guac-ai': ['Guac AI: Questions About Your Spending Records', 'Ask Guac AI about saved stores, categories and spending periods. Review the records supporting its answers before making a money decision.'],
  'protect/goals': ['Savings Goal Tracker & Progress Planning', 'Set a savings goal, target amount and timeframe in GetGuac. Record contributions and review your progress toward the goals that matter to you.'],
  'protect/bills': ['Bill Tracker & Subscription Organizer', 'Keep bill due dates and subscriptions visible in GetGuac. Review recurring costs and decide which payments still belong in your household budget.'],
  'protect/returns': ['Return Deadline Tracker & Refund Records', 'Track purchase return windows and refund status with GetGuac. Keep receipt records, refundable amounts and deadlines together after checkout.'],
}

export function featureMetadata(group, tool, detail) {
  const [title, description] = FEATURE_SEARCH[`${group}/${tool}`] || [detail.name, detail.summary]
  return publicMetadata(`/features/${group}/${tool}`, title, description)
}

export const GROUP_SEARCH = {
  capture: ['Receipt Scanning, Email Receipts & Money Records', 'Capture paper receipts, shopping emails, income records and supported statements with GetGuac. Review your records before using them in your money plan.'],
  understand: ['Expense Tracking, Budgets & Spending Insights', 'Understand recorded spending with GetGuac budgets, expense categories and purchase reports. Review the items behind your totals and plan your next step.'],
  protect: ['Savings Goals, Bill Tracking & Return Reminders', 'Track savings goals, recurring bills, return deadlines and refund records with GetGuac. Keep useful purchase information close when you need to act.'],
}
export function groupMetadata(group) {
  const [title, description] = GROUP_SEARCH[group.slug] || [group.name, group.summary]
  return publicMetadata(`/features/${group.slug}`, title, description)
}

export function featureBreadcrumbs(group, detail, tool) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      ['Features', '/features'], [group.name, `/features/${group.slug}`],
      [detail.name, `/features/${group.slug}/${tool}`],
    ].map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + path })),
  }
}

const RELATED = {
  capture: [['capture/receipts', 'Receipt scanner'], ['capture/email', 'Email receipt organizer'], ['understand/reports', 'Spending reports']],
  understand: [['understand/budget', 'Budget planner'], ['understand/reports', 'Spending reports'], ['capture/receipts', 'Receipt scanner']],
  protect: [['protect/goals', 'Savings goal tracker'], ['protect/bills', 'Bill tracker'], ['protect/returns', 'Return and refund tracker']],
}
export function relatedFeatureLinks(group, tool) {
  return (RELATED[group] || []).filter(([key]) => key !== `${group}/${tool}`)
    .map(([key, label]) => ({ href: `/features/${key}`, label }))
}
