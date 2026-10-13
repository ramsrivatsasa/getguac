import { randomUUID } from 'node:crypto'

// All ingestion entry points share this durable claim, including manual sync
// and the legacy cron. Persist the result before releasing the claim.
export async function withInboxMessageClaim(sb, userId, messageId, processMessage) {
  if (!userId || !messageId) throw new Error('Receipt processing requires a saved user-scoped email')
  const token = randomUUID()
  const args = { p_user_id: userId, p_message_id: messageId, p_token: token }
  const { data: claimed, error } = await sb.rpc('claim_inbox_message', { ...args, p_lease_seconds: 120 })
  if (error) throw new Error('Inbox processing claim unavailable; apply the background-agent migration')
  if (!claimed) throw new Error('Email is already being processed or has a receipt')
  try {
    const result = await processMessage()
    const patch = {
      receipt_id: result.receipt_id || null,
      processed: Boolean(result.processed),
      ...(result.classification ? {
        email_classification: result.classification,
        classification_confidence: result.confidence ?? null,
        classification_reason: result.reason || null,
      } : {}),
    }
    const { data, error: writeError } = await sb.from('email_messages').update(patch)
      .eq('id', messageId).eq('user_id', userId).eq('processing_token', token)
      .gt('processing_lease_until', new Date().toISOString()).select('id').maybeSingle()
    if (writeError || !data) throw new Error('Inbox processing claim lost before receipt link was saved')
    return result
  } finally {
    const { error: releaseError } = await sb.rpc('release_inbox_message', args)
    if (releaseError) console.warn('[inbox] processing claim release failed; lease will expire')
  }
}
