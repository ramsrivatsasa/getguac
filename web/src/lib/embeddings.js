// Embedding helpers — calls Google's text-embedding-004 model (free tier, no
// extra setup beyond the GEMINI_API_KEY you already have).
//
// One canonical text per receipt_item: "<item_name>. SKU: <sku>. Category: <category>"
// — gives the model context across all 3 fields so semantic search works on any of them.

const EMBED_MODEL = process.env.EMBED_MODEL || 'text-embedding-004'

export function buildItemEmbedText(item) {
  const parts = []
  if (item.item_name) parts.push(item.item_name)
  if (item.sku)       parts.push(`SKU: ${item.sku}`)
  if (item.model)     parts.push(`Model: ${item.model}`)
  if (item.category)  parts.push(`Category: ${item.category}`)
  return parts.join('. ')
}

export async function embedTexts(texts, apiKey) {
  if (!texts || texts.length === 0) return []
  if (!apiKey) throw new Error('GEMINI_API_KEY required for embeddings')

  // Gemini batch-embed endpoint
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents?key=${encodeURIComponent(apiKey)}`
  const body = {
    requests: texts.map(text => ({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text: text || ' ' }] },
    })),
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message || `Embed failed (${res.status})`)
  return (json.embeddings || []).map(e => e.values)
}

export async function embedOne(text, apiKey) {
  const [vec] = await embedTexts([text], apiKey)
  return vec || null
}
