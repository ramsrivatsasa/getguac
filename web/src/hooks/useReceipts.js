'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getReceipts, getReceipt, upsertReceipt, deleteReceipt, upsertReceiptItem,
  updateReceiptItem, uploadReceipt, upsertStore, upsertStoreLocation,
  replaceRefundPolicies, ensureStoreReward, upsertStoreItem,
} from '../lib/db'

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

export function useAddReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      receipt, file, userId, items = [], storeInfo = null,
      locationInfo = null, refundPolicies = [],
    }) => {
      let receipt_link = receipt.receipt_link || ''
      if (file) receipt_link = await uploadReceipt(file, userId)

      // 1. Upsert store (case-insensitive by name)
      let store_id = receipt.store_id || null
      if (storeInfo?.store_name) {
        try {
          const store = await upsertStore(storeInfo)
          store_id = store?.id || null
        } catch (e) {
          console.warn('Store upsert skipped:', e.message)
        }
      }

      // 2. Upsert physical location under that store (per-address, per-phone)
      let store_location_id = receipt.store_location_id || null
      if (store_id && locationInfo && (locationInfo.address || locationInfo.phone_no || locationInfo.store_no)) {
        try {
          const loc = await upsertStoreLocation({ ...locationInfo, store_id })
          store_location_id = loc?.id || null
        } catch (e) {
          console.warn('Store location upsert skipped:', e.message)
        }
      }

      // 3. Auto-generate placeholder reward_no if user hasn't given one
      let reward_no = receipt.reward_no || ''
      if (!reward_no && storeInfo?.store_name) {
        try { reward_no = await ensureStoreReward({ userId, storeName: storeInfo.store_name }) }
        catch (e) { console.warn('ensureStoreReward skipped:', e.message) }
      }

      // 4. Save the receipt
      const saved = await upsertReceipt({
        ...receipt,
        receipt_link,
        processed: items.length > 0,
        user_id: userId,
        store_id,
        store_location_id,
        reward_no,
        category: receipt.category || undefined,
      })

      // 5. Save line items, AND upsert each into the store's catalog (store_items).
      //    Each line gets a store_item_id FK pointing at the catalog row so we can
      //    pull warranty / manual / return-policy data on future receipts.
      if (items.length > 0) {
        const results = await Promise.allSettled(items.map(async (item) => {
          let store_item_id = null
          if (store_id) {
            try {
              const cat = await upsertStoreItem({
                store_id,
                sku: item.sku || null,
                item_name: item.item_name,
                price: Number(item.price || 0),
                warranty_info: item.warranty_info || null,
                item_manual: item.item_manual || null,
              })
              store_item_id = cat?.id || null
            } catch (e) { console.warn('store_items upsert skipped:', e.message) }
          }
          return upsertReceiptItem({ ...item, receipt_id: saved.id, store_item_id })
        }))
        const failed = results.filter(r => r.status === 'rejected')
        if (failed.length > 0) {
          console.error(`Items failed to save (${failed.length}/${items.length}):`, failed.map(r => r.reason?.message || r.reason))
        }
      }

      // 6. Save refund policies (replace-all on update)
      if (refundPolicies?.length > 0) {
        try { await replaceRefundPolicies(saved.id, refundPolicies) }
        catch (e) { console.warn('Refund policies skipped:', e.message) }
      }

      return saved
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receipts'] }),
  })
}

export function useUpdateReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (receipt) => upsertReceipt(receipt),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['receipts', data.id] })
    },
  })
}

export function useDeleteReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteReceipt,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receipts'] }),
  })
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
  return useMutation({
    mutationFn: ({ id, ...patch }) => updateReceiptItem(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receipts'] }),
  })
}
