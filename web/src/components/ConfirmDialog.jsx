'use client'
// Branded replacement for window.alert() and window.confirm().
//
// Usage:
//   const confirm = useConfirm()
//   if (await confirm({ title: 'Delete?', body: '...', danger: true })) { ... }
//   await confirm({ title: 'Done', body: '...', cancelText: null })   // alert-style, single OK button
//
// Mount <ConfirmProvider> once near the root of the tree. Every child
// (dashboard or auth) shares the same singleton modal — no per-page
// state, no double-mounts, no overlap problems.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

const ConfirmContext = createContext(null)

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm must be used inside <ConfirmProvider>')
  }
  return ctx
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)
  // Resolver for the in-flight promise — captured when the modal opens
  // and called when the user picks OK or Cancel.
  const resolverRef = useRef(null)

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setState({
        title: opts?.title || 'Are you sure?',
        body: opts?.body || '',
        confirmText: opts?.confirmText || 'OK',
        // cancelText: null → alert-style (single OK button); default 'Cancel'
        cancelText: opts?.cancelText === undefined ? 'Cancel' : opts.cancelText,
        danger: !!opts?.danger,
        success: !!opts?.success,
      })
    })
  }, [])

  function handle(answer) {
    setState(null)
    if (resolverRef.current) {
      resolverRef.current(answer)
      resolverRef.current = null
    }
  }

  // ESC = cancel, Enter = confirm. Mirrors native dialog behavior.
  useEffect(() => {
    if (!state) return
    function onKey(e) {
      if (e.key === 'Escape') handle(false)
      else if (e.key === 'Enter') handle(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => handle(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                state.danger ? 'bg-rose-100 text-rose-600' :
                state.success ? 'bg-emerald-100 text-emerald-600' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {state.danger
                  ? <AlertTriangle size={20} />
                  : <CheckCircle2 size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900">{state.title}</h3>
                {state.body && (
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{state.body}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              {state.cancelText && (
                <button
                  type="button"
                  onClick={() => handle(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200"
                >
                  {state.cancelText}
                </button>
              )}
              <button
                type="button"
                autoFocus
                onClick={() => handle(true)}
                className={`px-4 py-2 rounded-xl text-sm font-bold text-white shadow ${
                  state.danger
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
