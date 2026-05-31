'use client'
// Shared hook for the three bank-data fetches (statements / fees /
// transactions). Every surface that needs bank totals — the
// dashboard's GuacWizard tile, the GuacScore tile's bankBite, the
// 8-tile AllPaymentsScroll, the /guacwizard page — was running its
// own copy of these three useQuery blocks. Centralizing them here
// means three things stay in lockstep across pages:
//
//   1. Row order — explicit `.order()` clauses break ties on
//      period_end / date so bankAccountTotals picks the same
//      "latest" statement regardless of which page fetched first.
//      (Without this, dashboard and /guacwizard could compute
//      different GuacWizard scores from the same data.)
//   2. staleTime — 5 minutes; long enough that nav between pages
//      doesn't refetch, short enough that a new statement upload
//      lands within a few minutes.
//   3. isLoading — an aggregated flag so callers can show a
//      loading state until ALL three queries land, instead of
//      computing a misleading "baseline" score from partial data.
//
// Usage:
//   const { statements, fees, transactions, isLoading } = useBankData()
//
// TanStack Query dedups by queryKey, so importing this hook from
// multiple components on the same page does NOT fire duplicate
// fetches.

import { useQuery } from '@tanstack/react-query'
import { createClient } from './supabase/client'

const STALE_5_MIN = 5 * 60_000

export function useBankData() {
  const sb = createClient()
  const stm = useQuery({
    queryKey: ['bank_statements'],
    queryFn: async () => {
      const { data } = await sb
        .from('bank_statements')
        .select('*')
        .order('period_end', { ascending: false, nullsFirst: false })
        .order('id')
      return data || []
    },
    staleTime: STALE_5_MIN,
  })
  const fee = useQuery({
    queryKey: ['bank_fees'],
    queryFn: async () => {
      const { data } = await sb
        .from('bank_fees')
        .select('*')
        .order('date', { ascending: false, nullsFirst: false })
        .order('id')
      return data || []
    },
    staleTime: STALE_5_MIN,
  })
  const tx = useQuery({
    queryKey: ['bank_transactions'],
    queryFn: async () => {
      const { data } = await sb
        .from('bank_transactions')
        .select('*')
        .order('date', { ascending: false, nullsFirst: false })
        .order('id')
      return data || []
    },
    staleTime: STALE_5_MIN,
  })
  return {
    statements:   stm.data || [],
    fees:         fee.data || [],
    transactions: tx.data  || [],
    isLoading: stm.isLoading || fee.isLoading || tx.isLoading,
  }
}
