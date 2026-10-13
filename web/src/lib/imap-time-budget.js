// IMAP timeouts are bounded per socket phase and by a wall-clock deadline.
// The close callback aborts the actual connection; this is not a Promise.race
// that leaves network work running after the caller's request has ended.
export function createImapTimeBudget(deadlineAt = Infinity, clock = Date.now) {
  const remaining = Math.min(35_000, deadlineAt - clock())
  if (!(remaining > 0)) throw new Error('Mailbox deadline reached')
  const end = clock() + remaining
  return {
    options: {
      connectionTimeout: Math.min(10_000, remaining),
      greetingTimeout: Math.min(10_000, remaining),
      socketTimeout: Math.min(15_000, remaining),
    },
    expired: () => clock() >= end,
    arm(close) {
      const timer = setTimeout(close, remaining)
      timer.unref?.()
      return () => clearTimeout(timer)
    },
  }
}
