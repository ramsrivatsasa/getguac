# Email Infrastructure Setup (Migadu)

Step-by-step to turn on real email for `@getguac.app`. Migadu Mini plan = **$19/year flat, unlimited mailboxes**.

> Total time: ~30 min of clicking, ~5 min of pasting DNS records to me.

## 1. Sign up at Migadu

1. Go to https://www.migadu.com/signup
2. Pick the **Mini** plan ($19/yr).
3. Add domain: `getguac.app`
4. Migadu shows a screen with DNS records (MX × 2, SPF, DKIM × 2 selectors, DMARC). **Paste those records to me** — I'll add them to Vercel DNS.

## 2. DNS records you'll get from Migadu (typical shape)

```
MX  @                10  aspmx1.migadu.com.
MX  @                20  aspmx2.migadu.com.
TXT @                "v=spf1 include:spf.migadu.com -all"
CNAME key1._domainkey  key1.<your-key>._domainkey.migadu.com.
CNAME key2._domainkey  key2.<your-key>._domainkey.migadu.com.
CNAME key3._domainkey  key3.<your-key>._domainkey.migadu.com.
TXT _dmarc           "v=DMARC1; p=quarantine; rua=mailto:dmarc@getguac.app"
```

I'll add all of these via the Vercel DNS REST API. (Or paste them into Vercel DNS yourself at https://vercel.com/<your-team>/domains/getguac.app.)

## 3. Verify the domain in Migadu

Once DNS propagates (~5–15 min), click **Verify** in Migadu's domain page. Green checkmarks across the board.

## 4. Generate a Migadu API key

1. https://admin.migadu.com → My Account → API
2. Click **Create new API key**
3. Copy the key (shown once — save it)

## 5. Generate the encryption key

Run locally (any machine with Node):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output.

## 6. Add env vars to Vercel

In Vercel dashboard → Project → Settings → Environment Variables, add:

| Name | Value |
|---|---|
| `MIGADU_ACCOUNT` | the email you signed up to Migadu with |
| `MIGADU_API_KEY` | the API key from step 4 |
| `MIGADU_DOMAIN` | `getguac.app` |
| `EMAIL_ENCRYPTION_KEY` | the random 32-byte key from step 5 |
| `CRON_SECRET` | another random string: `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"` |

Set them for **Production** (and Preview if you want previews to also process mail).

## 7. Add GitHub Actions secrets

In the repo → Settings → Secrets and variables → Actions → New repository secret, add:

| Name | Value |
|---|---|
| `CRON_SECRET` | **same value** as the Vercel `CRON_SECRET` above |
| `APP_URL` | `https://getguac.app` (no trailing slash) |

The `email-poll.yml` workflow uses both to hit the poll endpoint every 10 minutes.

## 8. Run the DB migration

In Supabase SQL editor, paste `web/supabase/migration_021_email_inbox.sql` and run.

## 9. Test it

1. Sign in to GetGuac, go to Profile, claim an alias (e.g. `ramtest`).
2. Backend provisions the Migadu mailbox automatically. **Important**: the password is generated server-side and stored encrypted — to log in to webmail, you need to reset it from Migadu's admin (or set the password manually via the Migadu API).
3. Send a test email to `ramtest+receipts@getguac.app` from any account (your Gmail works).
4. Wait up to 10 minutes (or trigger the `Email Inbox Poll` workflow manually from GitHub Actions).
5. Open `/receipts` — a new draft receipt should appear with the email subject and body preview.

## 10. (Optional) Send users their mailbox password

The `claim` API returns the generated password **once** in the response (`mailbox.password`). The current UI doesn't surface it — a future iteration will email it to the user's real address via SMTP. For now, the receipts forwarding flow doesn't require users to know the password (they just forward from whatever client they already use).

## Files I touched

- `web/supabase/migration_021_email_inbox.sql` — schema
- `web/src/lib/crypto.js` — AES-GCM helpers
- `web/src/lib/migadu.js` — Migadu API client (THE swap surface)
- `web/src/lib/imap-poll.js` — IMAP poller using imapflow + mailparser
- `web/src/app/api/email/claim/route.js` — extended to provision mailbox
- `web/src/app/api/email/poll/route.js` — cron-triggered poller
- `web/src/components/EmailAliasPicker.jsx` — shows personal + receipts addresses
- `mobile/lib/screens/profile/profile_screen.dart` — same on mobile
- `.github/workflows/email-poll.yml` — runs poller every 10 min

## When you outgrow Migadu

Swap `lib/migadu.js` for `lib/<new-provider>.js`. Everything else (the IMAP poller, the schema, the UI, the cron) is provider-agnostic. DNS swap + ~2 days of code.
