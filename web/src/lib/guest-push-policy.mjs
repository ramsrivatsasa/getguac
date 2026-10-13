import { createHash } from 'node:crypto'
export function guestRegistration(body) {
 if (!body || !/^[a-f0-9]{64}$/.test(body.installationSecret || '') || typeof body.token !== 'string' || body.token.length < 20 || body.token.length > 4096 || !['ios','android'].includes(body.platform) || typeof body.consent !== 'boolean') return null
 return { p_hash: createHash('sha256').update(body.installationSecret).digest('hex'), p_token: body.token, p_platform: body.platform, p_consent: body.consent }
}
export function guestEligible(row, now=Date.now()) {
 return row.consent === true && row.converted === false && Date.parse(row.updated_at) > now-30*86400000 && Date.parse(row.updated_at) <= now
}
