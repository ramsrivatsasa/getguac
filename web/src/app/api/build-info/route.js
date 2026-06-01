// GET /api/build-info → { sha, ts }
//
// Returns the SHA of the deployment that's currently serving this
// request. The UpdatePrompt component on the client compares this
// to its baked-in NEXT_PUBLIC_BUILD_SHA and prompts a reload when
// they diverge — so users running a stale tab see the new version
// announce itself the moment a Vercel deploy lands.
//
// `force-dynamic` because we never want Vercel to cache the
// response — that would defeat the entire freshness check.

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || 'dev'
  return NextResponse.json({
    sha,
    ts: Date.now(),
  }, {
    headers: {
      // Belt-and-braces: explicit no-cache on top of force-dynamic.
      'Cache-Control': 'no-store, must-revalidate',
    },
  })
}
