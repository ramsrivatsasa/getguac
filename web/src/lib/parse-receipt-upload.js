// Browser-side helper for posting a file to /api/parse-receipt.
// Mirrors the mobile ReceiptParseService policy from v0.2.40:
//   1. If file.type is missing or application/octet-stream, set it from
//      the extension. iOS Safari + some Android browsers occasionally
//      hand back camera captures with no MIME, which makes the server
//      reject the upload with 415 "Unsupported file type".
//   2. Auto-retry up to 2 times on transient errors (network, 5xx,
//      timeout) with a 2-second pause before the second retry. Don't
//      retry "couldn't read anything", "unsupported file type", "not
//      signed in" — retrying those buys nothing.

const MIME_BY_EXT = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  gif: 'image/gif',
  pdf: 'application/pdf',
}

function mimeFromExtension(filename) {
  const dot = filename.lastIndexOf('.')
  if (dot < 0) return 'image/jpeg'
  const ext = filename.substring(dot + 1).toLowerCase()
  return MIME_BY_EXT[ext] || 'image/jpeg'
}

function looksTransient(message) {
  if (!message) return true
  const m = message.toLowerCase()
  if (m.includes("couldn't read") || m.includes('couldn’t read')) return false
  if (m.includes('unsupported file type')) return false
  if (m.includes('not signed in')) return false
  return (
    m.includes('timed out') ||
    m.includes('timeout') ||
    m.includes('network') ||
    m.includes('connection') ||
    m.includes('socket') ||
    m.includes('server error') ||
    m.includes('502') ||
    m.includes('503') ||
    m.includes('504')
  )
}

/// Wrap a File so it carries a sane Content-Type even if the browser left
/// .type empty. Returns either the original File or a new Blob with the
/// detected type. We use File for browsers that support the constructor
/// (everywhere modern) so the server still sees the original filename.
function ensureTyped(file) {
  if (file.type && file.type !== 'application/octet-stream') return file
  const mime = mimeFromExtension(file.name || '')
  try {
    return new File([file], file.name || 'receipt.jpg', {
      type: mime,
      lastModified: file.lastModified ?? Date.now(),
    })
  } catch {
    // Old browser without File constructor — fall back to Blob.
    return new Blob([file], { type: mime })
  }
}

async function doParse(file) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/parse-receipt', { method: 'POST', body: fd })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch {
    throw new Error('Server returned non-JSON')
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Server error (${res.status})`)
    err.status = res.status
    throw err
  }
  if (data.error) throw new Error(data.error)
  return data
}

/// Post `file` to /api/parse-receipt with MIME fix-up + up to 2 retries on
/// transient failure. Throws on permanent failure. Returns the parsed JSON.
export async function uploadReceiptForParse(file) {
  const typed = ensureTyped(file)
  try {
    return await doParse(typed)
  } catch (err) {
    if (!looksTransient(err.message)) throw err
    // Retry once immediately.
    try {
      return await doParse(typed)
    } catch (err2) {
      if (!looksTransient(err2.message)) throw err2
      // One more attempt after a short pause so the network can settle.
      await new Promise((r) => setTimeout(r, 2000))
      return await doParse(typed)
    }
  }
}

export const _internals = { mimeFromExtension, looksTransient, ensureTyped }
