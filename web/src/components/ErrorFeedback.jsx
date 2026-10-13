'use client'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ERROR_EVENT, errorPath, errorReportDescription, safeErrorText, showAppError } from '../lib/error-feedback.mjs'

export default function ErrorFeedback({ initialError, onRetry }) {
  const [issue, setIssue] = useState(null), [sending, setSending] = useState(false), [result, setResult] = useState(''), [note, setNote] = useState('')
  const dialog = useRef(null), seen = useRef(new Map()), nativeFetch = useRef(null), dismissed = useRef(new Set()), active = useRef(null), lastError = useRef(null)
  useEffect(() => {
    const original = window.fetch.bind(window)
    nativeFetch.current = original
    const receive = event => {
      const incoming = event.detail || {}, key = `${incoming.tag}:${incoming.message}:${incoming.url}`
      if (!incoming.manual) lastError.current = incoming
      if (Date.now() - (seen.current.get(key) || 0) < 60000) return
      if (seen.current.size > 100) seen.current.clear()
      seen.current.set(key, Date.now())
      // Record additional failures without queuing a succession of blocking dialogs.
      if (!incoming.background) {
        if (active.current) dismissed.current.add(key)
        else if (!dismissed.current.has(key)) { active.current = incoming; setIssue(incoming); setResult(''); setNote(errorReportDescription(incoming)) }
      }
      // Unexpected failures are recorded automatically. Reporting failures never recurse.
      if (!incoming.manual) original('/api/report-error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...incoming, message: safeErrorText(incoming.message), stack: safeErrorText(incoming.stack, 2000), url: errorPath(incoming.url) }) }).catch(() => {})
    }
    const uncaught = event => showAppError(event.error || event.message, { tag: 'uncaught' })
    const rejected = event => { if (event.reason?.name !== 'AbortError') showAppError(event.reason, { tag: 'unhandled-promise' }) }
    window.addEventListener(ERROR_EVENT, receive); window.addEventListener('error', uncaught); window.addEventListener('unhandledrejection', rejected)
    const openReport = () => { active.current = { ...(lastError.current || { tag: 'user-report', message: 'Tell us what went wrong.' }), manual: true }; setIssue(active.current); setResult(''); setNote(errorReportDescription(active.current)) }
    window.addEventListener('guac-open-error-report', openReport)
    const observedFetch = async (input, options) => {
      let url
      try { url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, window.location.origin) } catch { return original(input, options) }
      const tracked = (url.origin === window.location.origin && url.pathname.startsWith('/api/') && !/^\/api\/(report-error|client-logs|visits|analytics|health)/.test(url.pathname)) || /\/auth\/v1\/(token|signup|recover)/.test(url.pathname)
      try {
        const response = await original(input, options)
        // Forms/pages own expected 4xx feedback. A toast alone is not proof
        // of an application fault; report server failures, network failures
        // and uncaught/render errors instead.
        if (tracked && response.status >= 500) showAppError(new Error(`Request failed (${response.status})`), { tag: 'request', status: response.status, endpoint: url.pathname, method: options?.method || input?.method || 'GET', background: url.pathname === '/api/agents' && (options?.method || input?.method || 'GET').toUpperCase() === 'GET', message: 'We could not complete this request. Please try again shortly.' })
        return response
      } catch (error) {
        if (tracked && error?.name !== 'AbortError') showAppError(error, { tag: 'network', endpoint: url.pathname, background: url.pathname === '/api/agents' && (options?.method || input?.method || 'GET').toUpperCase() === 'GET', message: 'Connection interrupted. Check your connection and try again.' })
        throw error
      }
    }
    window.fetch = observedFetch
    return () => { window.removeEventListener('guac-open-error-report', openReport); window.removeEventListener(ERROR_EVENT, receive); window.removeEventListener('error', uncaught); window.removeEventListener('unhandledrejection', rejected); if (window.fetch === observedFetch) window.fetch = original }
  }, [])
  useEffect(() => { if (initialError) showAppError(initialError, { tag: 'render', message: 'This page could not load. Try loading it again.' }) }, [initialError])
  useEffect(() => { if (issue && dialog.current && !dialog.current.open) dialog.current.showModal() }, [issue])
  function dismiss() {
    if (active.current) dismissed.current.add(`${active.current.tag}:${active.current.message}:${active.current.url}`)
    dialog.current?.close(); active.current = null; setIssue(null); setResult(''); setNote('')
  }
  async function report() {
    setSending(true); setResult('')
    try {
      const response = await (nativeFetch.current || fetch)('/api/report-error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...issue, manual: true, message: safeErrorText(note || issue.message), stack: safeErrorText(issue.stack, 2000), url: errorPath(window.location.pathname) }) })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error('Report could not be saved. Please try again.')
      dismiss()
      toast.success('Report saved.')
    } catch { setResult('Report could not be sent. Check your connection and try again. Your description is still here.') }
    finally { setSending(false) }
  }
  return <>
    <dialog ref={dialog} onCancel={event => { event.preventDefault(); dismiss() }} aria-labelledby="error-feedback-title" className="max-h-[calc(100dvh_-_2rem)] overflow-y-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-violet-100 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-950/40">
      <div className="sticky -top-5 -mx-5 -mt-5 mb-2 flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-3">
        <h2 id="error-feedback-title" className="font-display text-xl font-bold">{issue?.manual ? 'Report an error' : 'Something went wrong'}</h2>
        <button type="button" onClick={dismiss} aria-label="Close error report" className="min-h-11 shrink-0 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-600">Close <span aria-hidden="true">×</span></button>
      </div>
      <p className="mt-2 text-sm leading-6">{issue?.manual ? 'Describe the problem so we can investigate.' : issue?.message}</p>
      {issue?.endpoint && <p className="mt-2 break-all text-xs text-slate-500">{issue.endpoint}{issue.status ? ` · Error ${issue.status}` : ''}</p>}
      <label htmlFor="error-description" className="mt-4 block text-sm font-semibold">What happened? (optional)</label>
      {issue?.errorDetail && <p className="mt-1 text-xs text-slate-500">Error details are included automatically. You can add what you were doing.</p>}
      <textarea id="error-description" maxLength={1000} value={note} onChange={e => setNote(e.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 p-2 text-sm"/>
      <p className="mt-2 text-xs text-slate-500">Do not include passwords, payment details, or other sensitive information.</p>
      {result && <p role="status" className="mt-3 text-sm">{result}</p>}
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={sending || result.startsWith('Report saved')} onClick={report} className="min-h-11 rounded-xl bg-violet-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{sending ? 'Sending…' : 'Report error'}</button>{(onRetry || issue?.retry) && <button type="button" onClick={() => { const retry = onRetry || issue.retry; dismiss(); retry() }} className="min-h-11 rounded-xl border px-4 text-sm font-semibold">Retry</button>}<button type="button" onClick={dismiss} className="min-h-11 rounded-xl px-4 text-sm font-semibold">Dismiss</button></div>
    </dialog>
  </>
}
