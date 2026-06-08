'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSavedSearches, addSavedSearch, deleteSavedSearch } from '../lib/savedSearches'

export function useSavedSearches() {
  return useQuery({ queryKey: ['saved_searches'], queryFn: getSavedSearches, staleTime: 1000 * 60 * 5 })
}

export function useAddSavedSearch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: addSavedSearch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved_searches'] }),
  })
}

export function useDeleteSavedSearch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteSavedSearch,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['saved_searches'] })
      const prev = qc.getQueryData(['saved_searches'])
      if (Array.isArray(prev)) qc.setQueryData(['saved_searches'], prev.filter(s => s.id !== id))
      return { prev }
    },
    onError: (_e, _id, ctx) => { if (ctx?.prev) qc.setQueryData(['saved_searches'], ctx.prev) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['saved_searches'] }),
  })
}
