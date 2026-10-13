'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function usePromotions(params = {}) {
  const search = new URLSearchParams()
  if (params.status) search.set('status', params.status)
  if (params.q) search.set('q', params.q)
  return useQuery({
    queryKey: ['promotions', params],
    queryFn: async () => {
      const response = await fetch(`/api/promotions?${search}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Promotions unavailable')
      return data.promotions || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdatePromotion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const response = await fetch('/api/promotions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Promotion update failed')
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promotions'] }),
  })
}

