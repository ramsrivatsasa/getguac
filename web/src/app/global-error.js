"use client"
import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import ErrorFeedback from '../components/ErrorFeedback'
export default function GlobalError({ error, reset }) {
  useEffect(() => { Sentry.captureException(error) }, [error])
  return <html lang="en"><body style={{margin:0,fontFamily:'system-ui',background:'#faf9ff'}}><main style={{maxWidth:440,margin:'15vh auto',padding:24}}><h1>This page could not load</h1><p>Try again, or report the error so we can investigate.</p><button onClick={reset} style={{minHeight:44,padding:'8px 24px'}}>Retry</button></main><ErrorFeedback initialError={error} onRetry={reset}/></body></html>
}
