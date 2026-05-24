'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRewards, upsertReward, deleteReward } from '../lib/db'

export function useRewards() {
  return useQuery({
    queryKey: ['rewards'],
    queryFn: getRewards,
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpsertReward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: upsertReward,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rewards'] }),
  })
}

export function useDeleteReward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteReward,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rewards'] }),
  })
}
