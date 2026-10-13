import { notFound } from 'next/navigation'
import { find10Enabled } from '../../lib/find-your-10/integration'
export const metadata = { title: 'Local development setup', robots: { index: false, follow: false } }
export default function LocalSetup() {
  if (!find10Enabled()) notFound()
  return <main className="mx-auto max-w-2xl space-y-4 p-6"><h1 className="text-2xl font-black">Local account services are not configured</h1><p>Start the main application with its local development launcher to use the existing local database and saved account. Your production records are unchanged.</p></main>
}
