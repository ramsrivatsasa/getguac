'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  getReceipts, getReceipt, upsertReceipt, deleteReceipt, upsertReceiptItem, updateReceiptItem, uploadReceipt, ensureStoreReward, getBankStatements
} from '../lib/db'
import { saveReceiptViaOutbox } from '../lib/receipt-outbox'
export function useReceipts(filters = {}) {
  return useQuery({
    queryKey: ['receipts', filters],
    queryFn: () => getReceipts(filters),
    staleTime: 1000 * 60 * 2, // 2 min cache
  })
}

export function useReceipt(id) {
  return useQuery({
    queryKey: ['receipts', id],
    queryFn: () => getReceipt(id),
    enabled: !!id,
  })
}

// Bank statements indexed for badge rendering on the receipts list.
// Returns a Map keyed by statement_import_id so callers can do an O(1)
// lookup when rendering each row. Empty Map for users who never imported.
export function useBankStatementMap() {
  return useQuery({
    queryKey: ['bank_statements'],
    queryFn: async () => {
      const rows = await getBankStatements()
      const m = new Map()
      for (const r of rows) {
        if (r.statement_import_id) m.set(r.statement_import_id, r)
      }
      return m
    },
    staleTime: 1000 * 60 * 5,
  })
}

// useAddReceipt — CREATE path only. Now a thin wrapper around the
// /api/receipts/save endpoint via the outbox, so web / mobile / iOS all
// hit the SAME save pipeline (dedup, Tier 2, store resolve, items,
// refund policies, store_items catalog). For edits, useUpdateReceipt
// continues to direct-upsert below.
//
// What this still does on the client:
//   - Upload the receipt image to Supabase Storage (browser → Storage is
//     more efficient than browser → API → Storage; saves a hop).
//   - Auto-create the placeholder reward_no (web-only UI affordance).
// Everything else is server-side.
//
// Offline path: if the network fails, saveReceiptViaOutbox queues the
// save in localStorage and returns { queued: true }. The next flush
// (app reload / explicit call) replays it with the same Idempotency-Key.
export function useAddReceipt() {
  const qc = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: async ({
      receipt, file, userId, items = [], storeInfo = null,
      locationInfo = null, refundPolicies = [],
    }) => {
      // Edit path — keep direct-upsert. saveReceipt is CREATE-only.
      if (receipt.id) {
        const saved = await upsertReceipt({ ...receipt, user_id: userId })
        return saved
      }

      // 1. Upload image (browser → Supabase Storage, single hop).
      let receipt_link = receipt.receipt_link || ''
      if (file) receipt_link = await uploadReceipt(file, userId)

      // 2. Build the "parsed" shape the save endpoint expects. Flattens
      //    the form-style storeInfo / locationInfo into the nested store
      //    object the parser produces, so save-receipt.js can resolve
      //    stores + locations identically across all callers.
      const parsed = {
        store_name:     receipt.store_name,
        date:           receipt.date,
        total_amount:   receipt.total_amount,
        tax_paid:       receipt.tax_paid,
        payment_method: receipt.payment_method,
        payment_last4:  receipt.payment_last4,
        is_return:      receipt.is_return,
        category:       receipt.category,
        items,
        refund_policies: refundPolicies,
        store: {
          location_name: locationInfo?.location_name || null,
          address:       locationInfo?.address || storeInfo?.address || null,
          city:          locationInfo?.city || null,
          state:         locationInfo?.state || null,
          zip:           locationInfo?.zip || null,
          phone_no:      locationInfo?.phone_no || storeInfo?.phone_no || null,
          website:       storeInfo?.website || null,
          store_no:      locationInfo?.store_no || null,
        },
      }

      // 3. POST via outbox — handles online + offline + retry. Never
      //    hangs the UI: returns within 30s either as success or queued.
      const result = await saveReceiptViaOutbox({
        parsed,
        receipt_link,
        business_purchase: Boolean(receipt.business_purchase),
        user_category: receipt.category || undefined,
      })

      // 4. Queued (offline) — return a synthetic shape; the row will exist
      //    after the next flush. Callers that need the real id should wait
      //    for the flush listener or just refresh the list.
      if (result.queued) {
        return { id: null, queued: true, idempotency_key: result.idempotency_key }
      }

      // 5. Online — web-only post-step: ensure the placeholder reward_no
      //    exists for this store. Not parity-critical (web rewards UI only).
      if (storeInfo?.store_name) {
        try { await ensureStoreReward({ userId, storeName: storeInfo.store_name }) }
        catch (e) { console.warn('ensureStoreReward skipped:', e.message) }
      }

      return { id: result.receipt_id, merged: Boolean(result.merged) }
    },
    onSuccess: () => {
      _invalidateAllReceiptQueries(qc)
      router.refresh()
    },
  })
}

export function useUpdateReceipt() {
  const qc = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: (receipt) => upsertReceipt(receipt),
    onSuccess: (data) => {
      _invalidateAllReceiptQueries(qc)
      qc.invalidateQueries({ queryKey: ['receipts', data.id] })
      router.refresh()
    },
  })
}

export function useDeleteReceipt() {
  const qc = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: deleteReceipt,
    onSuccess: () => {
      _invalidateAllReceiptQueries(qc)
      router.refresh()
    },
  })
}

/// Invalidate every TanStack Query whose data is derived from the receipts
/// table. Add a key here whenever a new page caches receipts under a
/// different name — otherwise stale receipts hang around in that page until
/// the user reloads. Currently:
///   ['receipts', ...]   — useReceipts (receipts list, guacanomics)
///   ['reports', ...]    — /reports page aggregates
///   ['bank_fees']       — guacanomics also reads bank_fees but those don't
///                          depend on receipts; left out intentionally.
function _invalidateAllReceiptQueries(qc) {
  qc.invalidateQueries({ queryKey: ['receipts'] })
  qc.invalidateQueries({ queryKey: ['reports'] })
}

export function useAddReceiptItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: upsertReceiptItem,
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['receipts', vars.receipt_id] }),
  })
}

export function useUpdateReceiptItem() {
  const qc = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: ({ id, ...patch }) => updateReceiptItem(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receipts'] })
      router.refresh()
    },
  })
}
