'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

async function getAliases() {
  const res = await fetch('/api/smashlist/aliases')
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to load aliases')
  const { aliases } = await res.json()
  return aliases
}

async function updateAliasStatus({ alias_key, status }) {
  const res = await fetch('/api/smashlist/aliases', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alias_key, status }),
  })
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to update alias')
  return res.json()
}

export function useAliases() {
  return useQuery({ queryKey: ['aliases'], queryFn: getAliases, staleTime: 1000 * 60 * 5 })
}

export function useUpdateAliasStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateAliasStatus,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aliases'] }),
  })
}
