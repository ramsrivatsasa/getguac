// Migadu Admin API client — the ONE file containing provider-specific logic.
// When you migrate off Migadu (Stalwart, SES, whatever), only this file changes.
//
// Env vars (set in Vercel Project Settings):
//   MIGADU_ACCOUNT    Migadu account email (the one you signed up with)
//   MIGADU_API_KEY    API key from https://admin.migadu.com → My Account → API Key
//   MIGADU_DOMAIN     'getguac.app'
//
// Docs: https://migadu.com/api

const BASE = 'https://api.migadu.com/v1'

function authHeader() {
  const account = process.env.MIGADU_ACCOUNT
  const key = process.env.MIGADU_API_KEY
  if (!account || !key) throw new Error('Migadu API credentials not configured')
  return 'Basic ' + Buffer.from(`${account}:${key}`).toString('base64')
}

function domain() {
  const d = process.env.MIGADU_DOMAIN || 'getguac.app'
  return d
}

async function migaduFetch(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Authorization': authHeader(),
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(init.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Migadu ${init.method || 'GET'} ${path} → ${res.status}: ${text.slice(0, 240)}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// Create a real mailbox: <localPart>@<domain>
// localPart: e.g. 'ram' (the user's chosen alias)
// password:  strong random string, also stored encrypted in our DB
// name:      display name shown in webmail/headers
export async function createMailbox({ localPart, password, name }) {
  return migaduFetch(`/domains/${domain()}/mailboxes`, {
    method: 'POST',
    body: JSON.stringify({
      local_part: localPart,
      password,
      name: name || localPart,
      // Migadu defaults for a new mailbox — explicit so the behaviour is locked in.
      is_internal: false,
      may_send: true,
      may_receive: true,
      may_access_imap: true,
      may_access_pop3: false,
      may_access_managesieve: false,
      spam_action: 'folder',     // spam goes to Junk, not bounced
    }),
  })
}

export async function deleteMailbox(localPart) {
  return migaduFetch(`/domains/${domain()}/mailboxes/${encodeURIComponent(localPart)}`, {
    method: 'DELETE',
  })
}

// List every mailbox on the domain. Used by scripts/bulk-delete-mailboxes.mjs
// to clean up load-test / abandoned accounts. Returns an array of objects
// with { local_part, address, name, ... } — full Migadu mailbox records.
export async function listMailboxes() {
  const data = await migaduFetch(`/domains/${domain()}/mailboxes`)
  return data?.mailboxes ?? []
}

export async function mailboxExists(localPart) {
  try {
    await migaduFetch(`/domains/${domain()}/mailboxes/${encodeURIComponent(localPart)}`)
    return true
  } catch (e) {
    if (/→ 404/.test(e.message)) return false
    throw e
  }
}

export async function updatePassword(localPart, password) {
  return migaduFetch(`/domains/${domain()}/mailboxes/${encodeURIComponent(localPart)}`, {
    method: 'PUT',
    body: JSON.stringify({ password }),
  })
}

// Endpoints the rest of the app uses for IMAP/SMTP and webmail links.
// Keeping these in one place makes a future provider swap trivial.
export const ENDPOINTS = {
  imap:    { host: 'imap.migadu.com',    port: 993, secure: true },
  smtp:    { host: 'smtp.migadu.com',    port: 465, secure: true },
  webmail: 'https://webmail.migadu.com',
}

export function fullEmail(localPart) {
  return `${localPart}@${domain()}`
}

// The short, brand-friendly default. '+receipts' is also accepted by the
// poller for back-compat (see RECEIPT_TAGS in lib/imap-poll.js).
export function receiptsAddress(localPart) {
  return `${localPart}+g@${domain()}`
}
