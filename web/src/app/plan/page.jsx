import { redirect } from 'next/navigation'

// /plan was renamed to /calculators — the nav, the resources hub and the page
// itself all called it Calculators while the route said Plan. This permanent
// redirect keeps every existing link, bookmark and indexed URL working.
export const metadata = { alternates: { canonical: '/calculators' } }

export default function PlanRedirect() {
  redirect('/calculators')
}
