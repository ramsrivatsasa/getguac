'use client'
import { useEffect } from 'react'
import { showAppError } from '../../../lib/error-feedback.mjs'
export default function PlanError({ error, reset }) {
  useEffect(() => { const timer = setTimeout(() => showAppError(error, { tag: 'plan-render', message: 'Your plan could not be loaded. Please try again.', retry: reset }), 0); return () => clearTimeout(timer) }, [error, reset])
  return <section role="alert" className="rounded-2xl bg-amber-50 p-6"><h1 className="text-2xl font-black">Your plan could not be loaded</h1><p className="my-3">Your saved records are unchanged. Retry to load the latest progress.</p><button onClick={reset} className="min-h-11 rounded-full bg-violet-800 px-5 font-bold text-white">Retry</button></section>
}
