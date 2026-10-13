'use client'
import { useQuery } from '@tanstack/react-query'

export default function RegistrationTrial({ userId }) {
  const { data, isError } = useQuery({
    queryKey: ['registration-trial', userId],
    enabled: Boolean(userId),
    refetchInterval: 60000,
    queryFn: async () => {
      const response = await fetch('/api/me/trial', { cache: 'no-store' })
      if (!response.ok) throw new Error('Unable to load trial dates')
      return response.json()
    },
  })
  if (!userId) return null
  const date = value => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return <section className="rounded-2xl border border-guac-line2 bg-white p-4" aria-label="Free trial">
    <h2 className="text-base font-bold">30-day free trial</h2>
    <p className="mt-1 text-sm text-slate-700" aria-live="polite">{isError ? 'Trial dates could not load. Try refreshing.' : !data ? 'Loading trial dates…' : data.status === 'unknown' ? 'Registration date unavailable.' : data.status === 'active' ? `${data.daysRemaining} ${data.daysRemaining === 1 ? 'day' : 'days'} remaining · Ends ${date(data.endsAt)}` : `Trial ended ${date(data.endsAt)}`}</p>
    {data?.startsAt && <p className="mt-1 text-xs text-slate-600">Started at registration: {date(data.startsAt)}</p>}
  </section>
}
