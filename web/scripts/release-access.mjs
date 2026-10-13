import {readFile} from 'node:fs/promises'

export async function releaseAccess(base) {
  const cookies = []
  if (process.env.RELEASE_COOKIE_JAR) {
    const host = new URL(base).hostname
    if (!/^getguac-[a-z0-9]+-getguac\.vercel\.app$/.test(host)) throw new Error('Release cookies are restricted to GetGuac candidates')
    const lines = (await readFile(process.env.RELEASE_COOKIE_JAR, 'utf8')).split(/\r?\n/)
    for (const line of lines) {
      const fields = line.replace(/^#HttpOnly_/, '').split('\t')
      if (fields.length === 7 && fields[0] === host) cookies.push({name: fields[5], value: fields[6], url: base, httpOnly: true, secure: true})
    }
    if (!cookies.length) throw new Error('No candidate access cookie found')
  }
  const header = cookies.map(c => `${c.name}=${c.value}`).join('; ')
  return {
    cookies,
    fetch: (url, options = {}) => {
      const headers = new Headers(options.headers)
      if (header && new URL(url).origin === new URL(base).origin) headers.set('cookie', header)
      return fetch(url, {...options, headers})
    },
  }
}
