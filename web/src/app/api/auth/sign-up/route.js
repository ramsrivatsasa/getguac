// Sign-up route that creates an auth user AND claims their chosen username
// (email_alias) atomically. If username is taken or invalid, returns 409/400
// before creating any auth user.
//
// POST /api/auth/sign-up
//   body: { username, email, password, first_name?, last_name?, ... }

import { createClient } from '../../../../lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'
import { createMailbox, mailboxExists } from '../../../../lib/migadu'
import { encryptSecret, generateMailboxPassword } from '../../../../lib/crypto'
import { validatePassword } from '../../../../lib/passwordStrength'
import { isDisposableEmail } from '../../../../lib/disposable-emails'
import { verifyChallenge, MIN_FORM_SECONDS } from '../../../../lib/demo-challenge'
export const runtime = 'nodejs'

// Best-effort: provision the Migadu mailbox at signup so the user's
// ram@getguac.app + ram+receipts@getguac.app are live immediately.
// Failures don't block the account creation — the alias is already claimed
// in the DB and provisioning will retry on next visit to /profile.
async function provisionMailboxAtSignup(sbAdmin, userId, username, displayName) {
  if (!process.env.MIGADU_API_KEY || !process.env.EMAIL_ENCRYPTION_KEY) {
    return { provisioned: false, reason: 'not_configured' }
  }
  try {
    if (await mailboxExists(username)) {
      return { provisioned: true, reason: 'already_existed' }
    }
    const password = generateMailboxPassword()
    await createMailbox({ localPart: username, password, name: displayName || username })
    await sbAdmin.from('profiles')
      .update({
        email_inbox_provisioned: true,
        email_inbox_password_enc: encryptSecret(password),
      })
      .eq('id', userId)
    return { provisioned: true }
  } catch (e) {
    console.error('[auth/sign-up] mailbox provisioning failed:', e.message)
    return { provisioned: false, error: e.message }
  }
}

const VALID_USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request) {
  try {
    const rl = await rateLimit(rateKey(request, 'sign-up'), { limit: 5, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ error: 'Too many sign-up attempts.' }, { status: 429 })

    const body = await request.json().catch(() => null)
    if (!body) return Response.json({ error: 'Invalid request' }, { status: 400 })

    // ── Bot prevention layer ────────────────────────────────────────
    // Honeypot: hidden form field real users never see. Any non-empty
    // value = a bot auto-filling every field on the page. Returns a
    // generic 400 so the bot can't fingerprint the gate.
    if (body.website && String(body.website).trim() !== '') {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }
    // Disposable email blocklist: most spam signups use throwaway
    // inboxes since they don't intend to confirm the email anyway.
    if (isDisposableEmail(body.email)) {
      return Response.json({
        error: 'Please use a permanent email address (disposable inboxes are not allowed).',
        status: 'disposable_email',
      }, { status: 400 })
    }
    // Arithmetic challenge, replacing Cloudflare Turnstile (2026-08-03).
    //
    // 🔴 WHY (measured on /register, 2026-08-02): Turnstile pulled 0.5-1.3 MB
    // and took ~2,227 ms on a fast connection / ~5,996 ms on a mid-tier
    // Android over 4G, with the submit button DISABLED the whole time. Ram's
    // own code comment already recorded the failure mode this caused once:
    // "the submit button just sits disabled with no explanation".
    //
    // ⚠️ Registration is a harder target than the demo login — a bot that
    // gets through creates a real account, provisions a Migadu mailbox
    // against a paid quota, and triggers a confirmation email. So sign-up
    // enforces THREE gates, not one:
    //   1. the signed sum        (HMAC; operands never on the wire)
    //   2. the honeypot field    (CSS-hidden; scripts fill it, people do not)
    //   3. MIN_FORM_SECONDS      (a human cannot complete this form in <3s;
    //                             the issued-at is inside the signed token so
    //                             the client cannot backdate it)
    // 🔑 If fake signups ever appear, raise MIN_FORM_SECONDS first; putting
    // Turnstile back on /register alone is the fallback.
    const challenge = verifyChallenge(body.demo_token, body.demo_answer, body.website, {
      minSeconds: MIN_FORM_SECONDS,
    })
    if (!challenge.ok) {
      return Response.json({
        error: challenge.reason === 'too-fast'
          ? 'That was submitted a little too quickly — please try again.'
          : challenge.reason === 'wrong-answer'
            ? 'That answer was not right. Try the new one.'
            : 'Check expired — please try again.',
        status: 'captcha_failed',
      }, { status: 400 })
    }

    const username = String(body.username || '').toLowerCase().trim()
    const email    = String(body.email || '').trim()
    const password = String(body.password || '')
    const first_name = body.first_name || null
    const last_name  = body.last_name  || null

    if (!username || !email || !password) {
      return Response.json({ error: 'username, email, and password are required' }, { status: 400 })
    }
    if (!VALID_USERNAME_RE.test(username)) {
      return Response.json({ error: 'Username must be 3–32 chars, lowercase letters/numbers, optional . _ -', status: 'invalid' }, { status: 400 })
    }
    const pwCheck = await validatePassword(password)
    if (!pwCheck.ok) {
      return Response.json({ error: pwCheck.error, status: 'weak_password' }, { status: 400 })
    }

    // ── Age gate: adults (18+) only. Enforced server-side so the mobile app
    //    and any direct API caller hit the same wall as the web form. ──
    const birthRaw = String(body.birth_date || '').trim()
    const dob = birthRaw ? new Date(birthRaw) : null
    if (!dob || Number.isNaN(dob.getTime())) {
      return Response.json({ error: 'Please enter your birth date — GetGuac is for adults 18 and older.', status: 'birth_date_required' }, { status: 400 })
    }
    const today = new Date()
    let years = today.getFullYear() - dob.getFullYear()
    const mDiff = today.getMonth() - dob.getMonth()
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < dob.getDate())) years--
    if (years < 18) {
      return Response.json({ error: 'You must be at least 18 years old to create a GetGuac account.', status: 'underage' }, { status: 400 })
    }
    if (years > 120) {
      return Response.json({ error: 'That birth date doesn’t look right — please check it.', status: 'invalid_birth_date' }, { status: 400 })
    }

    const sbAdmin = admin()

    // ── Pre-flight: username availability ──
    const [{ data: reserved }, { data: taken }] = await Promise.all([
      sbAdmin.from('reserved_email_aliases').select('alias').eq('alias', username).maybeSingle(),
      sbAdmin.from('profiles').select('id').eq('email_alias', username).maybeSingle(),
    ])
    if (reserved) return Response.json({ error: 'That username is reserved', status: 'reserved' }, { status: 409 })
    if (taken)    return Response.json({ error: 'That username is already taken', status: 'taken' },  { status: 409 })

    // ── Create the auth user ──
    // Required: Supabase Auth project setting "Confirm email" must be ENABLED
    // (Dashboard → Authentication → Email → Enable email confirmations). When
    // enabled, signUp() returns a user with id but session=null, AND Supabase
    // sends the confirmation email automatically. We rely on that signal to
    // decide whether to claim the username now or stash it for post-confirm.
    //
    // For security, we ALWAYS stash the username in user_metadata so a
    // logged-in unverified user can't claim a different one mid-flight. The
    // actual claim happens after email confirmation, in /auth/confirm.
    const sb = createClient()
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://getguac.app'
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        // Where Supabase sends the user after they click the confirm link.
        // Our /auth/confirm page claims the username + provisions the mailbox
        // once the session is real.
        emailRedirectTo: `${baseUrl}/auth/confirm`,
        data: {
          first_name,
          last_name,
          pending_username:  username,
          birth_date:        body.birth_date        || null,
          age:               body.age               || null,
          mobile_no:         body.mobile_no         || null,
        },
      },
    })

    if (error) {
      // Common: "User already registered" — surface it
      return Response.json({ error: error.message }, { status: 400 })
    }

    const userId = data?.user?.id
    if (!userId) {
      // Some GoTrue/SDK combinations return { user: null, session: null }
      // with no error when "Confirm email" is on, even though the user WAS
      // created and the confirmation email sent (observed in prod 2026-07-09
      // right after enabling confirmations). Treat it as confirmation-pending
      // instead of failing a signup that actually succeeded.
      console.warn('[auth/sign-up] signUp returned no user object — assuming confirmation email sent for', email)
      return Response.json({
        ok: true,
        needs_email_confirmation: true,
        email,
        pending_username: username,
        message: `We've sent a confirmation email to ${email}. Click the link to activate your account — your @getguac.app handle "${username}" is reserved while you confirm.`,
      })
    }

    // ── Confirmation required? (Supabase returns session=null when "Confirm
    //    email" is enabled in the project's Auth settings.) ──
    if (!data.session) {
      return Response.json({
        ok: true,
        needs_email_confirmation: true,
        email,
        pending_username: username,
        message: `We've sent a confirmation email to ${email}. Click the link to activate your account — your @getguac.app handle "${username}" is reserved while you confirm.`,
      })
    }

    // ── Auto-confirmed by Supabase (only happens if "Confirm email" is OFF
    //    in the Auth settings — INSECURE for production). We still go ahead
    //    and claim the username + provision the mailbox so the user lands
    //    fully set up. Log a warning so an operator notices the unsafe config.
    console.warn('[auth/sign-up] User auto-confirmed without email verification. ENABLE "Confirm email" in Supabase Auth settings for production security.')
    const { error: upErr } = await sbAdmin
      .from('profiles')
      .upsert({ id: userId, email_alias: username, alias_set_at: new Date().toISOString(), first_name, last_name }, { onConflict: 'id' })

    if (upErr) {
      console.error('[auth/sign-up] username claim failed:', upErr.message)
      // Don't fail the signup — they can claim it later from /profile
      return Response.json({ ok: true, username_claim_failed: upErr.message })
    }

    const displayName = [first_name, last_name].filter(Boolean).join(' ') || username
    const mailbox = await provisionMailboxAtSignup(sbAdmin, userId, username, displayName)

    return Response.json({ ok: true, username, mailbox })
  } catch (err) {
    console.error('[auth/sign-up]', err)
    return Response.json({ error: 'Sign-up failed' }, { status: 500 })
  }
}
