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
const readString = (key, fallback) => {
  if (typeof window === 'undefined') return fallback
  const v = window.localStorage.getItem(key)
  return v ?? fallback
}
const writeString = (key, value) => {
  if (typeof window !== 'undefined') window.localStorage.setItem(key, value)
}

export const useStore = create((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Desktop sidebar collapse (persists in localStorage)
  sidebarCollapsed: readBool('sidebarCollapsed', false),
  setSidebarCollapsed: (collapsed) => { writeBool('sidebarCollapsed', collapsed); set({ sidebarCollapsed: collapsed }) },
  toggleSidebar: () => set((s) => { const next = !s.sidebarCollapsed; writeBool('sidebarCollapsed', next); return { sidebarCollapsed: next } }),

  // App-wide time-frame. Set on the dashboard and inherited by
  // every internal page that filters by date (GuacWizard, reports,
  // etc.). Persisted to localStorage so a refresh or navigation
  // keeps the same window. `spendingPeriod` is one of
  // daily|weekly|monthly|yearly; `spendingPeriodCount` is the unit
  // count (e.g. monthly + 3 = last 3 months).
  spendingPeriod: readString('spendingPeriod', 'monthly'),
  setSpendingPeriod: (period) => { writeString('spendingPeriod', period); set({ spendingPeriod: period }) },
  spendingPeriodCount: parseInt(readString('spendingPeriodCount', '3'), 10) || 3,
  setSpendingPeriodCount: (count) => { writeString('spendingPeriodCount', String(count)); set({ spendingPeriodCount: count }) },

  // Receipt upload modal
  receiptModalOpen: false,
  setReceiptModalOpen: (open) => set({ receiptModalOpen: open }),

  // Hand-off slot — when /bank receives a dropped file, it stashes the File
  // here and routes to /statements, which picks it up on mount and parses.
  pendingStatementFile: null,
  setPendingStatementFile: (file) => set({ pendingStatementFile: file }),
}))
