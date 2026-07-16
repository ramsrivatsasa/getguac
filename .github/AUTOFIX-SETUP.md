# Crash Auto-Fix — setup & how it works

An AI engine that **detects production crashes and drafts fixes automatically**.
It builds on the crash pipeline already in the app (`audit_log` → `/admin/crashes`
→ crash-digest). This adds the "→ fix" half.

Autonomy level: **auto-merge safe fixes only.** The AI opens a PR for every fix;
low-risk ones auto-merge once Vercel's build passes; anything touching money / auth /
infra / native code, or any large diff, waits for a human.

---

## The loop

```
 hourly cron
   │
   ▼
 GET /api/admin/autofix-queue         ← next un-triaged, web/server crash (native + money/auth excluded)
   │
   ▼
 anthropics/claude-code-action        ← Claude reads the stack trace, writes the smallest fix, runs `npm run lint`
   │
   ▼
 classify the diff                    ← safe? (only web/, not a protected path, ≤150 lines)
   │
   ├─ safe        → open PR (label ai-autofix:safe)  → enable auto-merge → Vercel build gates it → merges
   └─ not safe    → open PR (label ai-autofix:needs-human) → waits for you
   │
   ▼
 POST /api/admin/autofix-queue        ← mark the fingerprint handled so it isn't re-opened
```

Files: [`crash-autofix.yml`](./workflows/crash-autofix.yml) ·
[`autofix-queue/route.js`](../web/src/app/api/admin/autofix-queue/route.js)

---

## 1. Required secrets (GitHub → Settings → Secrets → Actions)

| Secret | Required | Value |
|---|:---:|---|
| `ANTHROPIC_API_KEY` | ✅ | Anthropic API key. This is the only new secret. Get one at console.anthropic.com. |
| `APP_URL` | ✅ (already set) | `https://getguac.app` |
| `CRON_SECRET` | ✅ (already set) | Same value as Vercel — see [CRON-SETUP.md](./CRON-SETUP.md) |
| `AUTOFIX_PAT` | ⭐ recommended | A fine-grained PAT with **Contents: write** + **Pull requests: write**. Used to push the branch + open the PR. **Why it matters:** a PR opened with the default `GITHUB_TOKEN` won't kick off other GitHub Actions, and can't be auto-merged in some org configs. A PAT avoids both. Falls back to `GITHUB_TOKEN` if unset. |

No new Vercel env vars are needed — the queue endpoint reuses `CRON_SECRET` and the
existing Supabase service-role key.

## 2. Repo settings (so auto-merge is actually gated)

Auto-merge only merges once the **required** checks pass. Without a required check,
"auto-merge" merges immediately — which defeats the safety. So:

1. **Settings → General → Pull Requests → enable "Allow auto-merge".**
2. **Settings → Branches → Branch protection rule for `main`:**
   - ✅ Require status checks to pass before merging
   - Add the **Vercel** check (e.g. `Vercel – getguac` / the preview deployment) as required.
   - (Vercel builds every PR branch via its Git integration, so the AI fix gets a
     real `next build` before it can merge. A build error = no merge.)
3. First run auto-creates the labels `ai-autofix`, `ai-autofix:safe`,
   `ai-autofix:needs-human` — nothing to do.

> If you skip step 2, a "safe" fix can merge on a green mergeability check without a
> build. Don't skip it.

## 3. Turn it on

The workflow is scheduled hourly. To test immediately:
**Actions → Crash Auto-Fix → Run workflow.** With no crash in the queue it exits
green in seconds. Seed a test crash (any error in `audit_log`) to see it open a PR.

---

## Safety model — what it will and won't touch

**Detection already excludes** (server-side, in the queue endpoint): mobile/native
crashes (`ios`/`android`), warnings, and ops noise. Only `web`/`server` errors are offered.

**A fix can only auto-merge if ALL of these hold** (in `crash-autofix.yml`):
- every changed file is under `web/`, AND
- none match the protected `DENYLIST_REGEX`, AND
- the diff is ≤ `MAX_CHANGED_LINES` (default **150**), AND
- Vercel's PR build passes (branch protection).

**Protected paths (never auto-merge — always human):**
`web/src/app/api/iap`, `web/src/app/api/account`, `web/src/app/api/admin`,
`web/src/lib/supabase`, `web/src/middleware*`, `web/supabase/migrations`,
`web/vercel.json`, anything matching `guac[-_]?money`, any `.env`, `mobile/`, `.github/`.

Anything failing a check still gets a PR — just labelled `ai-autofix:needs-human`
for you to review and merge manually.

---

## Tuning the autonomy dial

All in [`crash-autofix.yml`](./workflows/crash-autofix.yml):

| Want to… | Change |
|---|---|
| **Draft-only (no auto-merge at all)** | Delete the `gh pr merge … --auto` block in the "Open PR" step. Every fix then waits for you. |
| **Allow bigger auto-merges** | Raise `MAX_CHANGED_LINES` (env, top of file). |
| **Protect more/less code** | Edit `DENYLIST_REGEX` (env, top of file). |
| **Run more/less often** | Change the `schedule: cron`. It fixes one crash per run. |
| **Use a stronger model** | In `claude_args`, set `--model claude-opus-4-8` (pricier, better on gnarly fixes). Default `claude-sonnet-5`. |
| **Let it fix >1 crash/run** | Raise `?max=` in the "Pick" step and loop — not recommended (PR spam, cost). |

---

## Honest limitations (v1)

- **It won't fix everything.** If the root cause is unclear or needs a protected
  path, the agent makes no change and writes an `AUTOFIX_NOTE.md` (recorded as
  `no_fix`); a human still gets the crash via the digest.
- **No unit-test gate** — the repo has no jest/vitest harness, so the merge gate is
  Vercel's `next build` + lint, not a test suite. The agent adds a `scripts/*.mjs`
  regression check when one fits, but many fixes ship test-less. Reviewing
  `needs-human` PRs matters.
- **Cost** — each fix run makes Anthropic API calls (bounded by `--max-turns 30`).
  One-per-hour keeps it cheap; watch `/admin/cost` if you widen it.
- **Not fully autonomous by design** — detect→fix→**merge-with-a-build-gate**, never
  detect→fix→deploy-unreviewed. For a money app that last gate is the point.
