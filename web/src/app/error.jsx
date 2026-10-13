'use client'
import { useEffect } from 'react'
import { showAppError } from '../lib/error-feedback.mjs'
export default function PageError({ error, reset }) {
  useEffect(() => { const timer = setTimeout(() => showAppError(error, { tag: 'render', message: 'This page could not load. Try loading it again.', retry: reset }), 0); return () => clearTimeout(timer) }, [error, reset])
  return <section className="mx-auto max-w-md p-6"><h1 className="font-display text-2xl font-bold">This page could not load</h1><p className="my-3">Please retry. If the problem continues, report it so we can investigate.</p><button onClick={reset} className="min-h-11 rounded-xl bg-violet-700 px-4 text-white">Retry</button></section>
}
