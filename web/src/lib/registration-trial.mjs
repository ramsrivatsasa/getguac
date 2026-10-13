const DAY_MS = 24 * 60 * 60 * 1000
export const TRIAL_DAYS = 30

// Auth's server-owned registration timestamp is the only trial origin.
// This status does not grant premium, charge money, or restrict features.
export function registrationTrial(createdAt, now = new Date()) {
  const start = typeof createdAt === 'string' && createdAt.trim() ? Date.parse(createdAt) : NaN
  const current = now.getTime()
  if (!Number.isFinite(start) || !Number.isFinite(current) || start > current) {
    return { status: 'unknown', startsAt: null, endsAt: null, daysRemaining: null }
  }
  const end = start + TRIAL_DAYS * DAY_MS
  return {
    status: current < end ? 'active' : 'ended',
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(end).toISOString(),
    daysRemaining: Math.max(0, Math.ceil((end - current) / DAY_MS)),
  }
}
