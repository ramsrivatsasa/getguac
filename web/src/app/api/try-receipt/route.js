import { rateKey, rateLimit } from '../../../lib/apiGuard'
import { parseReceiptFromFile } from '../../../lib/parse-receipt-engine'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BYTES = 8 * 1024 * 1024

function isSupported(type = '') {
  return type.startsWith('image/') || type === 'application/pdf'
}

export async function POST(request) {
  try {
    // This is deliberately anonymous, parse-only, and tightly capped. Nothing
    // from the trial is inserted into Supabase or uploaded to object storage.
    const limit = await rateLimit(rateKey(request, 'try-one-receipt'), {
      limit: 50,
      windowMs: 24 * 60 * 60 * 1000,
    })
    if (!limit.ok) {
      return Response.json(
        { error: 'This device has reached today’s fair-use scan limit. Sign up to keep going.' },
        { status: 429 }
      )
    }

    const form = await request.formData()
    const file = form.get('file')
    if (!file) return Response.json({ error: 'Take or choose a receipt first.' }, { status: 400 })
    if (!isSupported(file.type)) return Response.json({ error: 'Use a receipt photo or PDF.' }, { status: 415 })
    if (!file.size || file.size > MAX_BYTES) return Response.json({ error: 'Receipt must be smaller than 8 MB.' }, { status: 413 })

    const parsed = await parseReceiptFromFile({
      buffer: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type,
    })

    if (!parsed) return Response.json({ error: 'Receipt scanning is temporarily unavailable.' }, { status: 503 })
    if (parsed.is_receipt === false) {
      return Response.json({ error: 'That does not look like a receipt. Try a clear photo with the total visible.' }, { status: 422 })
    }

    // Return only parsed fields needed by the trial presentation. The original
    // file bytes are allowed to fall out of memory after this request.
    return Response.json({
      store_name: parsed.store_name || 'Receipt',
      date: parsed.date || null,
      total_amount: Number(parsed.total_amount || 0),
      tax_paid: Number(parsed.tax_paid || 0),
      // 🔑 The engine sets this (parse-receipt-engine.js:193) and the prompt is
      // explicit: "for returns, all money is negative AND is_return true". It
      // was NOT being passed on, so the trial rendered a refund as
      // "TOTAL SPEND $-6.50" — the model had it right and this route lost it.
      is_return: Boolean(parsed.is_return),
      payment_method: parsed.payment_method || null,
      payment_last4: parsed.payment_last4 || null,
      category: parsed.category || null,
      items: Array.isArray(parsed.items) ? parsed.items.slice(0, 40) : [],
      refund_policies: Array.isArray(parsed.refund_policies) ? parsed.refund_policies.slice(0, 10) : [],
    })
  } catch (error) {
    console.error('[try-receipt]', error)
    return Response.json({ error: 'We could not read that receipt. Try a brighter, straighter photo.' }, { status: 500 })
  }
}
