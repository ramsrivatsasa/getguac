// Issues the arithmetic challenge for DEMO-ACCOUNT sign-in.
//
// Replaces Cloudflare Turnstile on that one path. Turnstile measured
// 0.5–1.3 MB and ~2.2s desktop / ~6.0s mobile before the submit button
// unlocked; this is a single ~120-byte JSON response.
//
// 🔒 Demo path ONLY. Registration keeps Turnstile — see lib/demo-challenge.js.
import { createChallenge } from '../../../../lib/demo-challenge'

// Never cache: every visitor must get a fresh, separately-signed challenge,
// and a CDN copy would hand the same answer to everyone.
export const dynamic = 'force-dynamic'

export async function GET() {
  const { question, token } = createChallenge()
  return Response.json({ question, token }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}
