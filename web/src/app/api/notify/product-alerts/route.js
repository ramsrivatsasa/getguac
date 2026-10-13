import { NextResponse } from 'next/server'
import { createApiClient } from '../../../../lib/supabase/server'
import { fetchRecallNotices } from '../../../../lib/product-recalls.mjs'
import { purchaseAlertsForUser } from '../../../../lib/purchase-alerts'

export const dynamic = 'force-dynamic'
export async function GET() {
  const db = await createApiClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const { notices, unavailable } = await fetchRecallNotices()
    const alerts = await purchaseAlertsForUser(db, user.id, notices)
    return NextResponse.json({ alerts, unavailable }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unable to check product alerts. Please try again.' }, { status: 503 })
  }
}
