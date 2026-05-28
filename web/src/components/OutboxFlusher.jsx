'use client'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { flushOutbox, getOutboxSize } from '../lib/receipt-outbox'

// Invisible mount-only component that flushes the receipt outbox:
//   1. On mount (page reload / app open).
//   2. Whenever the browser fires `online` (network restored).
//
// Failure is silent — flushOutbox itself logs warnings on per-entry
// issues but never throws. UI never blocks on the sweep: we kick it
// off async and let it complete in the background. After a successful
// flush we invalidate the receipts cache so the list reflects the
// newly-sent rows.
export default function OutboxFlusher() {
  const qc = useQueryClient()

  useEffect(() => {
    let cancelled = false

    const tryFlush = () => {
      if (getOutboxSize() === 0) return
      flushOutbox().then((res) => {
        if (cancelled) return
        if (res.sent > 0) {
          qc.invalidateQueries({ queryKey: ['receipts'] })
          qc.invalidateQueries({ queryKey: ['reports'] })
        }
      })
    }

    tryFlush()
    window.addEventListener('online', tryFlush)
    return () => {
      cancelled = true
      window.removeEventListener('online', tryFlush)
    }
  }, [qc])

  return null
}
