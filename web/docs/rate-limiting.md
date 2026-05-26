# Rate limiting

`web/src/lib/apiGuard.js` implements the rate-limiting helpers used by every
`/api` route. Two backends, runtime-detected:

| Backend            | When it runs                                  | Cross-instance? |
| ------------------ | --------------------------------------------- | --------------- |
| **Upstash Redis**  | When both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` env vars are present | ✅ yes |
| In-process `Map`   | Fallback when Upstash isn't configured OR a Redis call times out (>200ms) | ❌ per-instance |

## Why this matters

Vercel auto-scales function instances under load. A naive in-process limiter
can be defeated by traffic patterns that spin up new instances faster than
existing ones fill their bucket. Empirically, with the old in-process-only
limiter we measured **only 1 of 33 expected blocks firing** during 100
concurrent sign-ups from a single IP (load test: `scripts/load-test/concurrent-10.mjs`
at `N=100`). The cap was 5/min — Vercel's instance pool gave us
~9× the rated capacity.

Upstash uses a single shared Redis as the bucket store, so every instance
sees the same counters. Sliding-window algorithm (the most accurate — no
burst at window boundaries).

## Setup

1. **Create an Upstash Redis database**: https://console.upstash.com/redis
   - Pick a region near your Vercel deployment region (default Vercel is `iad-1` / Washington DC; pick `us-east-1` on Upstash).
   - The free tier (10k commands/day, 256 MB) covers about 7k requests/min indefinitely.

2. **Copy credentials**: Upstash dashboard → your DB → "REST API" tab. Copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

3. **Add to Vercel**: Project Settings → Environment Variables. Set both for **Production** (and Preview if you want load tests to count against the same buckets).

4. **Redeploy**. The next cold start picks up the env vars; `apiGuard.js`
   probes them lazily on first request and caches the client.

## Behaviour

- `rateLimit()` is now `async` — every caller must `await` it. All 23
  `/api` routes in this repo have been migrated.
- On Redis error or 200ms timeout, the limiter **falls back to in-process**
  rather than blocking the request. Logged once per cold start as
  `[apiGuard] Redis rate-limit failed, using in-process fallback: <msg>`.
- Bucket key prefix is `guac:rl:`. Counters auto-expire at the window end.
- `analytics: false` on the Upstash limiter — saves one Redis write per call.
  Turn on if you want a dashboard view of rate-limit hits at the cost of
  doubling Redis traffic.

## Verifying it's working

After deploy, re-run the load test:

```bash
N=100 node scripts/load-test/concurrent-10.mjs
```

With Upstash configured, the `sign-up` step should show **~95 of 100 failures**
(N − 5 = 95, matching the documented 5/min cap) instead of the ~33 we saw
with the in-process-only limiter. If the number is still low after deploy,
check `vercel logs` for the `[apiGuard] Redis rate-limit failed` warning.

## Cost model at scale

Each rate-limit check is 1-2 Redis commands. At 1M users averaging 5 limit
checks per session/day, that's ~5M commands/day. Upstash's pay-as-you-go
is $0.20 per 100k commands → ~$10/day at that scale. The "Pro" plan at
$0.20 / 1M commands kicks in around the 10M/day mark, so this scales
linearly to roughly $1/day per 100k DAU before you need to think about it.
