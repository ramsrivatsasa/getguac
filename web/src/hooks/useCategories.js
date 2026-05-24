'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUserCategories, createUserCategory, deleteUserCategory } from '../lib/db'
import { CATEGORIES as PRESETS, categoryClass } from '../lib/categories'

// Merges built-in presets with the user's custom categories.
export function useCategories() {
  const { data: custom = [] } = useQuery({
    queryKey: ['user_categories'],
    queryFn: getUserCategories,
    staleTime: 1000 * 60 * 5,
  })

  const all = [
    ...PRESETS.map(c => ({ ...c, custom: false })),
    ...custom.map(c => ({ slug: c.slug, label: c.label, emoji: c.emoji, color: c.color, custom: true, id: c.id })),
  ]
  const bySlug = Object.fromEntries(all.map(c => [c.slug, c]))
  return { categories: all, bySlug, custom }
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createUserCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_categories'] }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteUserCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_categories'] }),
  })
}

export { categoryClass }
