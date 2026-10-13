// Source: the owner's /find-your-10 page, reviewed 2026-09-26.
// Targets run together. Their numbers are navigation order, never waiting periods.
export const PLAN_TARGETS = [
  { id: 'cut', number: 1, title: 'Cut spending', href: '/my-plan/actions', tools: ['/receipts', '/reports', '/budget', '/guacanomics', '/validate'] },
  { id: 'cheaper', number: 2, title: 'Find cheaper options', href: '/my-plan', tools: ['/shopping', '/steals', '/promotions', '/coupons', '/marketplace', '/stores', '/car-miles', '/stash'] },
  { id: 'bills', number: 3, title: 'Lower bills', href: '/my-plan/bills/results', tools: ['/bills', '/bank', '/inbox', '/connections'] },
  { id: 'earn', number: 4, title: 'Make your money work', href: '/my-plan/build-wealth', tools: ['/wealth', '/calculators'] },
  { id: 'learn', number: 5, title: 'Learn to build wealth', href: '/my-plan/learn/results', tools: ['/learn', '/articles'] },
]
// Keep legacy target IDs for saved records and routes, but expose one combined entry.
export const PLAN_NAV_TARGETS=PLAN_TARGETS.filter(t=>t.id!=='bills').map((t,index)=>({...t,title:t.id==='cut'?'Expenses & bills':t.title,number:index+1}))
export const GOAL_PERCENTAGES = Array.from({ length: 11 }, (_, index) => index + 10)
export function goalPercentage(value) { return GOAL_PERCENTAGES.includes(value) ? value : 10 }
export function targetForPath(pathname) {
  return PLAN_TARGETS.find(target => target.tools.some(path => pathname === path || pathname.startsWith(`${path}/`))) || null
}

