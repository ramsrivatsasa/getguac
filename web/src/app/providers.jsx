'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { initClientDebugLog } from '../lib/client-debug-log'
import ErrorFeedback from '../components/ErrorFeedback'
import {useStore} from '../store'

export function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60, // 1 min default
        retry: 1,
      },
    },
  }))

  useEffect(() => {
    useStore.getState().hydratePreferences()
    // Capture window errors + unhandled promise rejections and forward them
    // to /api/client-logs so they land in audit_log alongside mobile events.
    initClientDebugLog()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ErrorFeedback />
      <Toaster position="top-right" toastOptions={{ className: 'text-sm' }} />
      {process.env.NEXT_PUBLIC_REACT_QUERY_DEVTOOLS === '1' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
