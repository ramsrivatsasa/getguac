import { classifyCommerceEmail } from './email-classification.js'
import { hasSeparateEmailOffer } from './email-promotion.js'

async function defaultDependencies() {
  const modules = await Promise.all([
    import('./crypto'), import('./imap-poll'), import('./report-error'), import('./mailbox-reauth'),
  ])
  return {
    ...Object.assign({}, ...modules),
    draftReceiptFromEmail: async (...args) => (await import('./email-to-receipt')).draftReceiptFromEmail(...args),
    verifyRetailerReceiptConnection: async (...args) => (await import('./retailer-connections')).verifyRetailerReceiptConnection(...args),
    saveEmailPromotionCandidate: async (...args) => (await import('./email-promotion.js')).saveEmailPromotionCandidate(...args),
  }
}

// Shared on-demand inbox synchronization; scheduled polling stays in /api/email/poll.
export async function syncInboxMessages({ sb, userId, deadlineAt = Infinity, allowReprovision = false, allowReceiptParsing = false, requireReceiptProvider = true }, dependencies) {
  if (!sb || !userId) throw new Error('Inbox sync requires a scoped user and database client')
  const deps = dependencies || await defaultDependencies()
  const { decryptSecret, pollMailbox, isReceiptsAddress, draftReceiptFromEmail, reportServerError,
    isImapAuthFailure, reprovisionMailbox, autoReauthedRecently, recordAutoReauth, describeImapError,
    verifyRetailerReceiptConnection, saveEmailPromotionCandidate } = deps
  const env = deps.env || process.env
  const now = deps.now || Date.now
  const parsingRequested = allowReceiptParsing
  const providerAvailable = Boolean(env.GROQ_API_KEY || env.GEMINI_API_KEY)
  allowReceiptParsing = allowReceiptParsing && (!requireReceiptProvider || providerAvailable)
  const blocked = reason => ({ ok: false, status: 'blocked', reason, skipped: reason, inserted: 0 })
  if (!env.MIGADU_API_KEY || !env.EMAIL_ENCRYPTION_KEY) {
    return blocked('email not configured')
  }

  const admin = sb
  const { data: prof, error: profileError } = await admin
    .from('profiles')
    .select('email_alias, email_inbox_password_enc, email_inbox_provisioned, email_processing_enabled')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) throw new Error('Mailbox profile lookup failed')
  if (!prof?.email_inbox_provisioned || !prof.email_inbox_password_enc || !prof.email_alias) {
    return blocked('no mailbox')
  }
  if (prof.email_processing_enabled === false) {
    return blocked('processing disabled')
  }

  let password
  try { password = decryptSecret(prof.email_inbox_password_enc) }
  catch (e) { return { ok: false, status: 'blocked', error: 'Mailbox credentials unavailable.', httpStatus: 500 } }

  // Per-folder cursor = highest UID we've already stored, so we only fetch new
  // messages (UIDs are unique within a folder). Same shape the cron uses.
  const { data: cursorRows, error: cursorError } = await admin
    .from('email_messages')
    .select('imap_folder, uid')
    .eq('user_id', userId)
    .order('uid', { ascending: false })
  if (cursorError) throw new Error('Mailbox cursor lookup failed')
  const lastUidByFolder = {}
  for (const r of cursorRows || []) {
    const f = r.imap_folder || 'INBOX'
    if (lastUidByFolder[f] == null || r.uid > lastUidByFolder[f]) lastUidByFolder[f] = r.uid
  }

  if (now() >= deadlineAt) return blocked('deadline reached')
  let result
  try {
    result = await pollMailbox({ localPart: prof.email_alias, password, lastUidByFolder, deadlineAt })
  } catch (e) {
    // Desynced mailbox password → self-heal (rotate on Migadu + retry once)
    // instead of just telling the user to reconnect. Throttled; falls back to a
    // 502 reconnect hint only if healing is throttled or itself fails.
    if (allowReprovision && isImapAuthFailure(e) && !(await autoReauthedRecently(admin, userId))) {
      try {
        const { password: newPw } = await reprovisionMailbox(admin, { userId: userId, alias: prof.email_alias })
        await recordAutoReauth(admin, { userId: userId, alias: prof.email_alias, via: 'sync' })
        result = await pollMailbox({ localPart: prof.email_alias, password: newPw, lastUidByFolder, deadlineAt })
      } catch (healErr) {
        await reportServerError({ tag: 'email_sync', action: 'email_failure', level: 'error', userId: userId, platform: 'server', message: `imap heal failed: ${describeImapError(e)} → ${healErr.message}` }, admin)
        return { ok: false, status: 'blocked', error: 'imap', detail: describeImapError(e), hint: 'reconnect', httpStatus: 502 }
      }
    } else {
      await reportServerError({ tag: 'email_sync', action: 'email_failure', level: 'error', userId: userId, platform: 'server', message: `imap: ${describeImapError(e)}` }, admin)
      return { ok: false, status: 'blocked', error: 'imap', detail: describeImapError(e), hint: 'reconnect', httpStatus: 502 }
    }
  }

  // Finish messages mirrored by the background worker when an explicitly
  // authorized parsing run occurs. Never advance receipt state in mirror mode.
  let pendingCount = 0
  let pendingLookupError = false
  {
    const { data: pending, error } = await admin.from('email_messages')
      .select('id, uid, imap_folder, subject, from_addr, body_text, body_html, preview, received_at, receipt_id')
      .eq('user_id', userId).eq('is_receipts_hook', true).eq('processed', false)
      .eq('email_classification', 'purchase_receipt').limit(20)
    pendingLookupError = Boolean(error)
    pendingCount = allowReceiptParsing ? (pending || []).filter(row => row.receipt_id).length : (pending || []).length
    if (!error && allowReceiptParsing) {
      result.messages.push(...(pending || []).filter(row => !row.receipt_id).map(row => ({
        storedId: row.id, uid: row.uid, imapFolder: row.imap_folder,
        subject: row.subject, fromAddr: row.from_addr, bodyText: row.body_text,
        bodyHtml: row.body_html, preview: row.preview, receivedAt: row.received_at,
      })))
    }
  }
  const pendingOffers = await admin.from('email_messages')
    .select('id,uid,imap_folder,subject,from_addr,body_text,body_html,preview,received_at')
    .eq('user_id', userId).eq('email_classification', 'promotion').eq('processed', false).limit(20)
  if (!pendingOffers.error) result.messages.push(...(pendingOffers.data || []).map(row => ({ storedId: row.id, uid: row.uid, imapFolder: row.imap_folder, subject: row.subject, fromAddr: row.from_addr, bodyText: row.body_text, bodyHtml: row.body_html, preview: row.preview, receivedAt: row.received_at })))
  const summary = { ok: true, status: 'succeeded', fetched: 0, inserted: 0, drafted: 0, pendingReceipts: pendingCount, offerImports: { added: 0, duplicates: 0, expired: 0, ignored: 0, requiringReview: 0 }, errors: pendingLookupError ? [{ error: 'Pending receipt lookup failed' }] : [] }
  if (pendingOffers.error) summary.errors.push({ error: 'Pending offer lookup failed' })
  async function importOffer(message, storedId, classification) {
    try {
      const promotion = await saveEmailPromotionCandidate(admin, userId, storedId, message, classification)
      for (const key of Object.keys(summary.offerImports)) summary.offerImports[key] += promotion.importResult?.[key] || 0
      const patch = { promotion_id: promotion.id }
      if (classification.classification === 'promotion') Object.assign(patch, { processed: true, email_classification: 'promotion', offer_candidate: true })
      const { error } = await admin.from('email_messages').update(patch).eq('id', storedId).eq('user_id', userId)
      if (error) throw Error('Offer source link could not be saved')
    } catch { summary.errors.push({ uid: message.uid, error: 'Offer import incomplete; the original email is retained.' }) }
  }
  for (const m of result.messages) {
    if (now() >= deadlineAt) { summary.errors.push({ error: 'deadline reached; remaining messages deferred' }); break }
    const isHook = Boolean(m.storedId) || isReceiptsAddress(m, prof.email_alias)
    const classification = classifyCommerceEmail(m, m.bodyText || m.bodyHtml || '')
    const TEXT_CAP = 256 * 1024, HTML_CAP = 512 * 1024
    const bodyText = (m.bodyText || '').length > TEXT_CAP ? m.bodyText.slice(0, TEXT_CAP) + '\n\n[truncated]' : m.bodyText
    const bodyHtml = (m.bodyHtml || '').length > HTML_CAP ? m.bodyHtml.slice(0, HTML_CAP) : m.bodyHtml

    const { data: insertedMsg, error: insertErr } = m.storedId ? { data: { id: m.storedId } } : await admin.from('email_messages').insert({
      user_id: userId,
      uid: m.uid,
      imap_folder: m.imapFolder || 'INBOX',
      message_id: m.messageId,
      from_addr: m.fromAddr,
      to_addr: m.toAddr,
      delivered_to: m.deliveredTo,
      subject: m.subject,
      received_at: m.receivedAt,
      preview: m.preview,
      body_text: bodyText,
      body_html: bodyHtml,
      has_attachments: m.hasAttachments,
      attachments_summary: m.attachments,
      is_receipts_hook: isHook,
      folder: 'inbox',
      ...{
        email_classification: classification.classification,
        classification_confidence: classification.confidence,
        classification_reason: classification.reason,
        offer_candidate: classification.classification === 'promotion',
      },
    }).select('id').single()

    if (!m.storedId) summary.fetched++
    if (insertErr) {
      if (!/duplicate key/i.test(insertErr.message)) summary.errors.push({ uid: m.uid, error: insertErr.message })
      continue
    }
    if (!m.storedId) summary.inserted++

    if (classification.classification === 'promotion' && saveEmailPromotionCandidate) {
      await importOffer(m, insertedMsg.id, classification)
      continue
    }

    if (isHook && !allowReceiptParsing && classification.classification === 'purchase_receipt') summary.pendingReceipts++
    if (isHook && allowReceiptParsing) {
      try {
        const draft = await draftReceiptFromEmail(admin, userId, { ...m, storedId: insertedMsg.id }, { deadlineAt })
        const { receipt_id, processed } = draft
        if (receipt_id) {
          await verifyRetailerReceiptConnection(admin, userId, m, receipt_id)
            .catch(error => console.warn('[email/sync] retailer verification failed:', error.message))
          const { error: updateError } = await admin.from('email_messages')
            .update({ receipt_id, processed: Boolean(processed) }).eq('id', insertedMsg.id).eq('user_id', userId)
          if (updateError) throw new Error('Receipt link write failed')
          if (processed) summary.drafted++
          else summary.pendingReceipts++
        } else if (processed) {
          const { error: updateError } = await admin.from('email_messages').update({
            processed: true,
            email_classification: draft.classification || 'unknown',
            classification_confidence: draft.confidence ?? null,
            classification_reason: draft.reason || null,
          }).eq('id', insertedMsg.id).eq('user_id', userId)
          if (updateError) throw new Error('Receipt classification write failed')
        } else summary.pendingReceipts++
      } catch (e) {
        summary.pendingReceipts++
        summary.errors.push({ uid: m.uid, error: `draft: ${e.message}` })
        await reportServerError({ tag: 'email_draft', action: 'email_failure', level: 'warn', userId: userId, platform: 'server', message: `draft: ${e.message}`, meta: { uid: m.uid } }, admin)
      }
    }
    if (classification.classification === 'purchase_receipt' && saveEmailPromotionCandidate && hasSeparateEmailOffer(m)) await importOffer(m, insertedMsg.id, classification)
  }

  for (const item of result.skipped || []) summary.errors.push({ error: 'unreadable message', uid: item.uid })
  for (const item of result.folderErrors || []) summary.errors.push({ error: 'folder failed', folder: item.folder })
  if (!summary.errors.length) {
    const { error } = await admin.from('profiles').update({ email_last_poll_at: new Date(now()).toISOString() }).eq('id', userId)
    if (error) summary.errors.push({ error: 'Mailbox heartbeat write failed' })
  }
  if (summary.pendingReceipts > 0) {
    summary.ok = false
    summary.status = parsingRequested && !providerAvailable ? 'blocked' : 'partial'
    summary.reason = parsingRequested && !providerAvailable
      ? 'receipt parsing provider not configured'
      : allowReceiptParsing ? 'receipt extraction incomplete; review pending receipts'
        : 'receipt parsing disabled; imported receipts await processing'
  }
  if (summary.errors.length) { summary.ok = false; summary.status = 'partial' }
  return summary
}
