'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getShoppingList, upsertShoppingItem, deleteShoppingItem } from '../lib/db'

export function useShoppingList() {
  return useQuery({ queryKey: ['shopping'], queryFn: getShoppingList, staleTime: 1000 * 60 * 5 })
}

export function useUpsertShoppingItem() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: upsertShoppingItem, onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping'] }) })
}

export function useDeleteShoppingItem() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deleteShoppingItem, onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping'] }) })
}
