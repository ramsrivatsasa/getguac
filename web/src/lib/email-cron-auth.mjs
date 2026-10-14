// Vercel uses a bearer header; the existing GitHub jobs use x-cron-secret.
export function emailCronAuthorized(request, secret = process.env.CRON_SECRET) {
  return Boolean(secret && (
    request.headers.get('x-cron-secret') === secret ||
    request.headers.get('authorization') === `Bearer ${secret}`
  ))
}
