'use client'
import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { usePathname, useRouter } from 'next/navigation'
// A browser observes completion, but it never executes the background jobs.
export default function GuacAgentRefresh() {
  const client = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const previous = useRef(new Map())
  const { data } = useQuery({ queryKey: ['guac-agents'], queryFn: async () => {
    const response = await fetch('/api/agents', { cache: 'no-store' })
    if (!response.ok) return null
    return response.json()
  }, refetchInterval: 15000, staleTime: 10000, retry: false })
  useEffect(() => {
    for (const snapshot of data?.snapshots || []) {
      const before = previous.current.get(snapshot.kind)
      previous.current.set(snapshot.kind, snapshot.refreshed_at)
      if (!before || before === snapshot.refreshed_at) continue
      client.invalidateQueries({ predicate: query => query.queryKey[0] !== 'guac-agents' })
      if (['/dashboard', '/my-plan'].includes(pathname)) router.refresh()
    }
  }, [data, client, pathname, router])
  return null
}
