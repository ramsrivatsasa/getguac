'use client'
import { create } from 'zustand'

// Client-only UI state — server state lives in TanStack Query
const readBool = (key, fallback = false) => {
  if (typeof window === 'undefined') return fallback
  const v = window.localStorage.getItem(key)
  return v === null ? fallback : v === 'true'
}
const writeBool = (key, value) => {
  if (typeof window !== 'undefined') window.localStorage.setItem(key, value ? 'true' : 'false')
}

export const useStore = create((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Desktop sidebar collapse (persists in localStorage)
  sidebarCollapsed: readBool('sidebarCollapsed', false),
  setSidebarCollapsed: (collapsed) => { writeBool('sidebarCollapsed', collapsed); set({ sidebarCollapsed: collapsed }) },
  toggleSidebar: () => set((s) => { const next = !s.sidebarCollapsed; writeBool('sidebarCollapsed', next); return { sidebarCollapsed: next } }),

  // Dashboard time period tab
  spendingPeriod: 'monthly',
  setSpendingPeriod: (period) => set({ spendingPeriod: period }),

  // Receipt upload modal
  receiptModalOpen: false,
  setReceiptModalOpen: (open) => set({ receiptModalOpen: open }),

  // Hand-off slot — when /bank receives a dropped file, it stashes the File
  // here and routes to /statements, which picks it up on mount and parses.
  pendingStatementFile: null,
  setPendingStatementFile: (file) => set({ pendingStatementFile: file }),
}))
