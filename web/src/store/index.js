'use client'
import { create } from 'zustand'
// Client-only UI state — server state lives in TanStack Query
const readBool = (key, fallback = false) => {
  if (typeof window === 'undefined') return fallback
  try { const v = window.localStorage.getItem(key); return v === null ? fallback : v === 'true' } catch { return fallback }
}
const writeBool = (key, value) => {
  try { if (typeof window !== 'undefined') window.localStorage.setItem(key, value ? 'true' : 'false') } catch {}
}
const readString = (key, fallback) => {
  if (typeof window === 'undefined') return fallback
  try { return window.localStorage.getItem(key) ?? fallback } catch { return fallback }
}
const writeString = (key, value) => {
  try { if (typeof window !== 'undefined') window.localStorage.setItem(key, value) } catch {}
}

export const useStore = create((set, get) => ({
  // Keep getInitialState identical on server and browser. Preferences are
  // restored by Providers after hydration, without rewriting stored values.
  preferencesHydrated: false,
  hydratePreferences: () => {
    if (typeof window === 'undefined' || get().preferencesHydrated) return
    set({
      sidebarCollapsed: readBool('sidebarCollapsed', false),
      spendingPeriod: readString('spendingPeriod', 'monthly'),
      spendingPeriodCount: parseInt(readString('spendingPeriodCount', '1'), 10) || 1,
      preferencesHydrated: true,
    })
  },
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Desktop sidebar collapse (persists in localStorage)
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => { writeBool('sidebarCollapsed', collapsed); set({ sidebarCollapsed: collapsed }) },
  toggleSidebar: () => set((s) => { const next = !s.sidebarCollapsed; writeBool('sidebarCollapsed', next); return { sidebarCollapsed: next } }),

  // App-wide time-frame. Set on the dashboard and inherited by
  // every internal page that filters by date (GuacWizard, reports,
  // etc.). Persisted to localStorage so a refresh or navigation
  // keeps the same window. `spendingPeriod` is one of
  // daily|weekly|monthly|yearly; `spendingPeriodCount` is the unit
  // count (e.g. monthly + 3 = last 3 months).
  spendingPeriod: 'monthly',
  setSpendingPeriod: (period) => { writeString('spendingPeriod', period); set({ spendingPeriod: period }) },
  spendingPeriodCount: 1,
  setSpendingPeriodCount: (count) => { writeString('spendingPeriodCount', String(count)); set({ spendingPeriodCount: count }) },

  // Receipt upload modal
  receiptModalOpen: false,
  setReceiptModalOpen: (open) => set({ receiptModalOpen: open }),

  // Hand-off slot — when /bank receives a dropped file, it stashes the File
  // here and routes to /statements, which picks it up on mount and parses.
  pendingStatementFile: null,
  setPendingStatementFile: (file) => set({ pendingStatementFile: file }),
}))
