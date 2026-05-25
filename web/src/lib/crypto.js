// AES-256-GCM helpers for at-rest encryption of mailbox passwords.
//
// EMAIL_ENCRYPTION_KEY env var: 32 raw bytes, base64-encoded. Generate once with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
// and add to Vercel env (Project Settings → Environment Variables).
//
// Format: <iv-base64>:<ciphertext-base64>:<auth-tag-base64>
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'

const ALGO = 'aes-256-gcm'

function getKey() {
  const raw = process.env.EMAIL_ENCRYPTION_KEY
  if (!raw) throw new Error('EMAIL_ENCRYPTION_KEY not set')
  const buf = Buffer.from(raw, 'base64')
  if (buf.length !== 32) throw new Error('EMAIL_ENCRYPTION_KEY must decode to 32 bytes')
  return buf
}

export function encryptSecret(plaintext) {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${enc.toString('base64')}:${tag.toString('base64')}`
}

export function decryptSecret(stored) {
  if (!stored || typeof stored !== 'string') throw new Error('decryptSecret: bad input')
  const [ivB64, ctB64, tagB64] = stored.split(':')
  if (!ivB64 || !ctB64 || !tagB64) throw new Error('decryptSecret: malformed payload')
  const key = getKey()
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  const dec = Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()])
  return dec.toString('utf8')
}

// Generate a strong random password suitable for a Migadu mailbox.
// 24 chars from URL-safe alphabet → ~143 bits entropy.
export function generateMailboxPassword() {
  const bytes = randomBytes(18)  // 18 bytes -> 24 base64 chars
  return bytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
