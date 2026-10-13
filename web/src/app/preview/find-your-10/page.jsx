import { redirect } from 'next/navigation'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Find your 10% · Dashboard', robots: { index: false, follow: false } }
export default function Page() { redirect('/my-plan') }
