# Cron Setup & Secrets

GetGuac runs scheduled jobs from **two** places. Both are driven off one shared
secret (`CRON_SECRET`). Get that secret and `ALERT_SMTP_PASS` right and every
cron works; miss them and you get silent stale data or red workflow runs.

---

## 1. Where the crons live

### A. Vercel native crons — [`web/vercel.json`](../web/vercel.json)
Vercel invokes these on schedule and auto-sends `Authorization: Bearer $CRON_SECRET`
(from the Vercel env var). GetGuac is on **Vercel Hobby**, so every schedule must be
**daily-granular** (`<min> <hour> * * *`) — sub-daily expressions fail the whole deploy.

| Endpoint | Schedule (UTC) |
|---|---|
| `/api/embeddings/refresh` | `30 5 * * *` (05:30) |
| `/api/smashlist/predict` | `0 6 * * *` (06:00) |
| `/api/cron/normalize-stores` | `0 4 * * *` (04:00) |
| `/api/cron/shopping-cache` | `0 7 * * *` (07:00) |
| `/api/cron/usage-snapshot` | `0 8 * * *` (08:00) |
| `/api/notify/dispatch` | `0 14 * * *` (14:00) |

### B. GitHub Actions crons — [`.github/workflows/`](./workflows/)
Sub-daily jobs Hobby can't run. Each `curl`s its endpoint with `x-cron-secret: $CRON_SECRET`.

| Workflow | File | Schedule (UTC) | Endpoint |
|---|---|---|---|
| Email Inbox Poll | [`email-poll.yml`](./workflows/email-poll.yml) | `*/10 * * * *` (every 10 min) | `POST /api/email/poll` |
| Email Pull Health Check | [`email-health.yml`](./workflows/email-health.yml) | `5,35 * * * *` | `POST /api/email/health` |
| Crash Digest | [`crash-digest.yml`](./workflows/crash-digest.yml) | `15,45 * * * *` | `POST /api/admin/crash-digest` |

---

## 2. Required secrets

Every cron endpoint accepts `CRON_SECRET` as **either** `x-cron-secret: <secret>`
**or** `Authorization: Bearer <secret>`. It must be **byte-identical** in both places.

| Secret | GitHub repo Secrets | Vercel env (Production) | Purpose |
|---|:---:|:---:|---|
| `CRON_SECRET` | ✅ required | ✅ required | Authenticates **all** crons. Mismatch → GitHub crons 401; unset in Vercel → native crons + GitHub crons all fail. |
| `ALERT_SMTP_PASS` | ✅ required | ✅ required | Password for `noreply@getguac.app`. Arms the watchdog + crash-digest **alert emails**. Unset → health check hard-fails (red) on any outage instead of emailing. |
| `APP_URL` | ✅ required | — | `https://getguac.app`. Read by the GitHub workflows only. |
| `ALERT_SMTP_USER` | optional | optional | Sender mailbox. Default `noreply@getguac.app`. |
| `ADMIN_ALERT_EMAIL` | optional | optional | Alert recipient. Default `admin@getguac.app`. |

- **GitHub:** repo → Settings → Secrets and variables → **Actions** → New repository secret.
- **Vercel:** project → Settings → **Environment Variables** → scope **Production** → then **redeploy** (env changes only take effect on a new deployment).

---

## 3. First-time / after-rotation checklist

1. Pick/rotate a `CRON_SECRET` value (any long random string).
2. Set it in **GitHub Secrets** and **Vercel (Production)** — identical.
3. Set `ALERT_SMTP_PASS` in **both** places.
4. Confirm `APP_URL = https://getguac.app` in GitHub Secrets.
5. **Redeploy on Vercel** so the new env is live.
6. Verify (below).

---

## 4. Verify it's working

- **GitHub crons:** Actions tab → run each of the 3 workflows via **Run workflow**
  (they all support `workflow_dispatch`). Green = good.
  - `Email Inbox Poll` → expect `Email poll OK (HTTP 200)`.
  - `Email Pull Health Check` → green when polling is fresh; it only alerts/fails when stale.
  - `Crash Digest` → HTTP 200 (or a `::warning::` 503 if `ALERT_SMTP_PASS` is unset).
- **Vercel crons:** project → **Crons** tab shows last-run status per job.

---

## 5. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| GitHub workflow **HTTP 401** | `CRON_SECRET` differs between GitHub and Vercel (often rotated on a redeploy) | Re-sync the secret in both places, redeploy Vercel |
| GitHub workflow **HTTP 000** | Can't connect | Check `APP_URL` and that the site is up |
| `Email Pull Health Check` **red / exit 1** | Polling was stale **and** no `ALERT_SMTP_PASS`, so it couldn't email → last-resort loud failure | Fix the underlying poll (usually the 401 above); set `ALERT_SMTP_PASS` so future outages email **and** the run goes green |
| `Crash Digest` **503 (warning, not failure)** | New crashes found but `ALERT_SMTP_PASS` unset in Vercel | Set `ALERT_SMTP_PASS` in Vercel |
| Vercel **deploy fails** → redirect to `cron-jobs/usage-and-pricing` | A `vercel.json` cron uses a sub-daily schedule (Hobby limit) | Make every schedule `<min> <hour> * * *` (once/day) |

**Note:** the health check *failing red during a real outage is by design* — a red
Actions run (which emails repo admins) is the backstop alert channel when the app
itself can't send email. Setting `ALERT_SMTP_PASS` upgrades that to a proper email
alert **and** a green run.
