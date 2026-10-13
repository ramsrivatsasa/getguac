import { loginCountry } from '../../../lib/login-region.mjs'

export const dynamic = 'force-dynamic'

export function GET(request) {
  return Response.json(
    { country: loginCountry(request.headers, process.env.VERCEL === '1') },
    { headers: { 'Cache-Control': 'private, no-store', Vary: 'x-vercel-ip-country' } },
  )
}
