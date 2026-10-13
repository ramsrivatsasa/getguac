// Shared provider budget: a fallback never receives a fresh full timeout after
// the preceding provider has consumed the job's remaining time.
export function remainingRequestTimeout(deadlineAt = Infinity, capMs = 30_000, now = Date.now) {
  const remaining = Math.min(capMs, Math.floor(deadlineAt - now()))
  if (!(remaining > 0)) {
    const error = new Error('Receipt processing deadline reached')
    error.code = 'RECEIPT_DEADLINE'
    throw error
  }
  return remaining
}
