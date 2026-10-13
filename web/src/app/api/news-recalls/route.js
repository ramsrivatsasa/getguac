import { NextResponse } from 'next/server'
import { fetchRecallNotices } from '../../../lib/product-recalls.mjs'
export async function GET() {
  try {
    const data = await fetchRecallNotices()
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=300' } })
  } catch { return NextResponse.json({ error: 'Recall notices are temporarily unavailable' }, { status: 503 }) }
}
