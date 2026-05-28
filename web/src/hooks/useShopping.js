'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getShoppingList, upsertShoppingItem, deleteShoppingItem } from '../lib/db'
export function useShoppingList() {
  return useQuery({ queryKey: ['shopping'], queryFn: getShoppingList, staleTime: 1000 * 60 * 5 })
}

export function useUpsertShoppingItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: upsertShoppingItem,
    // Optimistic update: patch the cache the moment the user clicks
    // "Add to Smashlist" so the row leaves Buy Again instantly,
    // instead of waiting ~300ms for the round-trip + refetch.
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: ['shopping'] })
      const prev = qc.getQueryData(['shopping'])
      if (Array.isArray(prev) && next?.id) {
        qc.setQueryData(['shopping'], prev.map(it =>
          it.id === next.id ? { ...it, ...next } : it
        ))
      }
      return { prev }
    },
    onError: (_err, _next, ctx) => {
      // Server rejected — restore the prior cache so the UI snaps back.
      if (ctx?.prev) qc.setQueryData(['shopping'], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['shopping'] }),
  })
}

export function useDeleteShoppingItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteShoppingItem,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['shopping'] })
      const prev = qc.getQueryData(['shopping'])
      if (Array.isArray(prev)) {
        qc.setQueryData(['shopping'], prev.filter(it => it.id !== id))
      }
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['shopping'], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['shopping'] }),
  })
}
