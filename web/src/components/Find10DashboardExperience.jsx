'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Find10DashboardCard from './Find10DashboardCard'

// The dashboard summarizes progress; the dedicated plan page holds the details.
export default function Find10DashboardExperience({ data }) {
  const router = useRouter()
  useEffect(() => {
    const refresh = () => router.refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [router])
  return <section id="find-your-10" className="scroll-mt-4 space-y-4" aria-label="Your integrated savings plan">
    <Find10DashboardCard data={data} href="/my-plan/details" />
  </section>
}
