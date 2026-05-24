'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTrips, upsertTrip, deleteTrip } from '../lib/db'

export function useTrips() {
  return useQuery({ queryKey: ['trips'], queryFn: getTrips, staleTime: 1000 * 60 * 5 })
}

export function useUpsertTrip() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: upsertTrip, onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }) })
}

export function useDeleteTrip() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deleteTrip, onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }) })
}
