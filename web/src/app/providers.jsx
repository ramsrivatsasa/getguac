'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { initClientDebugLog } from '../lib/client-debug-log'

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
    // Capture window errors + unhandled promise rejections and forward them
    // to /api/client-logs so they land in audit_log alongside mobile events.
    initClientDebugLog()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" toastOptions={{ className: 'text-sm' }} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
