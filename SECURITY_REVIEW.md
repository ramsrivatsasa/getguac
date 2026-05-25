# GetGuac Security Review

A focused, honest pass over the security model. Done by Claude as part of the
"honest hardening + explainer" track on 2026-05-25.

This is **not** a substitute for an independent audit before production scale,
but it captures the current state and an actionable punch-list.

---

## 1. Threat model (in scope)

| Threat | Mitigated? |
|---|---|
| Credential stuffing / weak passwords | ⚠️ Partial — Supabase enforces min 6 chars. Should bump to 10 + breached-password check |
| Session hijack via XSS | ✅ HttpOnly + Secure cookies, CSP added |
| Cross-user data leak via app bug | ✅ RLS enforces at DB layer, not just app code |
| Mailbox password disclosure if Postgres breached | ✅ AES-256-GCM with server-only key |
| Rate-abuse of expensive endpoints (AI, email) | ⚠️ Rate-limited per IP+session — should add per-user limits too |
| Email-as-merchant-auth signup spam | ⚠️ No CAPTCHA — could automate alias squatting |
| Phishing of users into +receipts processing | ✅ Only the user's own forwards land in their inbox; we filter by `Delivered-To` |
| Lost device → biometric creds left on phone | ✅ Biometric service wipes on logout; Android Keystore is hardware-backed |
| Supply chain (npm dep compromise) | ⚠️ No `npm audit` enforcement in CI. Should add |

## 2. What's good today

### Transport
- TLS 1.3 everywhere (Vercel + Supabase + mobile HTTPS-only)
- HSTS now set via `next.config.mjs` security headers (1-yr max-age, preload eligible)

### Storage
- Postgres encrypted at rest (Supabase default)
- AES-256-GCM for mailbox passwords with key in `EMAIL_ENCRYPTION_KEY` env var (32-byte random)
- Auth password is bcrypt-hashed by Supabase Auth — even we can't read it back

### Access control
- Row-Level Security on every user-data table (`receipts`, `rewards`, `bank_*`, `email_messages`, etc.)
- RLS enforced at DB level, not app — bypassing the app via direct SQL still hits the same policies
- Service role key kept server-side only, never exposed to client

### Auth flow
- Supabase Auth — battle-tested
- Username login via dedicated RPC `auth_resolve_username` (security definer)
- Biometric on mobile uses `local_auth` + `flutter_secure_storage` (Android Keystore)
- Sign-out wipes biometric stash so next device user can't replay

### Headers
- Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP all set in `next.config.mjs`
- `connect-src` allow-list limits where the browser can call out to (Supabase + Migadu + dns.google)

## 3. Real gaps (do these next)

### High priority
1. **Stronger password policy** — Bump min length to 10, integrate `haveibeenpwned` k-anonymity check on signup. (~1 hr)
2. **Per-user rate limits, not just IP** — Current `rateLimit(rateKey)` keys on IP+route; user with rotating IPs can bypass. Add user-id-keyed limits for AI/email endpoints. (~2 hrs)
3. **CAPTCHA on /register and /api/email/claim** — Cheap to automate alias-squatting today. Cloudflare Turnstile is free. (~1 hr)
4. **CSP nonces for inline scripts** — Currently using `'unsafe-inline'` and `'unsafe-eval'` because Next.js inlines styles + needs eval. Migrate to nonce-based CSP. (~3 hrs)
5. **Encrypted columns for high-sensitivity profile fields** — `alternative_email`, `mobile_no`, `birth_date` are stored in plaintext. Move to AES-GCM with the same scheme as mailbox passwords, or drop them entirely if not used. (~3 hrs)

### Medium
6. **Audit log writes** — `migration_022_audit_log.sql` added. Wire the RPC into: signin/signout, alias claim, mailbox provision, account delete, data export, email poll. (~2 hrs)
7. **CSRF tokens on state-changing endpoints** — Supabase SSR uses cookies + Next.js Server Actions; Server Actions have built-in CSRF protection. Audit the manual `/api/*` POSTs to confirm they require an authenticated session (which makes CSRF moot for those). (~1 hr)
8. **CI npm audit** — Add `npm audit --audit-level=high` to GitHub Actions. Fail build if new high-severity dep vuln. (~30 min)
9. **Mobile cert pinning** — Right now mobile trusts any cert in the system store. A rogue WiFi captive portal could MITM. Pin Supabase + Migadu certs. (~2 hrs)
10. **Account lockout after N failed logins** — Supabase doesn't do this by default. Track failed-login count, throttle/lock after 5. (~2 hrs)

### Lower priority (defense in depth)
11. **Encrypted backups separate from primary** — Currently Supabase manages backups. For real production, push WAL to a separate, encrypted bucket.
12. **2FA via TOTP** — Supabase has it; surface it in the profile UI.
13. **Notification on new sign-in from new device** — Email user when an unknown user-agent signs in.
14. **Data-retention policy** — Auto-delete `email_messages` rows older than N days unless tied to a receipt.

## 4. Things explicitly NOT done (and why)

- **"End-to-end encryption" for receipts/statements**: incompatible with the Guac-AI feature set. See `/security` page on the live app for the honest explainer.
- **HIPAA / PCI compliance**: out of scope — GetGuac doesn't store health data and never holds raw card numbers (only last-4 from receipts).

## 5. Quick wins shippable today

If you only do five things from this list, do these:

```text
[ ] Password length min 10 + breached-password check on signup
[ ] CAPTCHA (Turnstile) on /register + /api/email/claim
[ ] Per-user rate limit on AI endpoints (parse-receipt, parse-statement)
[ ] Wire the audit log RPC into 7 actions (sign in/out, claim, provision, delete, export, poll)
[ ] Encrypt alternative_email + mobile_no + birth_date columns
```

All ~10 hours total. Each ships independently.

## 6. How to use this doc

- Pin it in the repo
- Re-run the review before every milestone (paid launch, public beta, etc.)
- When a new feature ships, add a row to the "What's good" or "Real gaps" section
- The `/security` page on the live site is the user-facing equivalent — keep them in sync
