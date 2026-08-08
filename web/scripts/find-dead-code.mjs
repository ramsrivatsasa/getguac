/* Lists tracked source files that nothing imports.
 *
 * Not a linter — it answers one question: is this file reachable? A component
 * nobody imports still gets read, edited and kept in step with the rest of the
 * codebase by whoever touches it next, for no benefit. Same for a build script
 * no other script or doc calls.
 *
 * Reports; never deletes. A file can be unreferenced and still wanted (a script
 * you run by hand), so the judgement is yours — but an unreferenced COMPONENT
 * is almost always dead.
 *
 *   node scripts/find-dead-code.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPO = path.resolve(WEB, '..')
const ls = (p) => execSync(`git ls-files ${p}`, { cwd: REPO, maxBuffer: 1e8 })
  .toString().split('\n').map((s) => s.trim()).filter(Boolean)

const candidates = ls('web/src/components web/src/lib').filter((f) => /\.(jsx?|tsx?)$/.test(f))
// Search EVERYTHING that could reference them, including the static pages and
// the PowerShell builder — a component referenced only from generated HTML is
// still live.
const corpus = ls('web/src web/scripts web/public')
  .filter((f) => /\.(jsx?|mjs|cjs|tsx?|html|ps1|css|json)$/.test(f))
  .map((f) => { try { return fs.readFileSync(path.join(REPO, f), 'utf8') } catch { return '' } })
  .join('\n')

const dead = []
for (const f of candidates) {
  const base = path.basename(f).replace(/\.(jsx?|tsx?)$/, '')
  // An index file is imported by its DIRECTORY name, never its own — the
  // components/animated barrel is pulled in as `from '../../components/
  // animated'` and looking for the string "index" found nothing. Match on the
  // directory instead, or every barrel in the tree reports as dead.
  const name = base === 'index' ? path.basename(path.dirname(f)) : base
  const uses = [...corpus.matchAll(new RegExp(`[/'"\`]${name}['"\`]|<${name}[\\s/>]`, 'g'))].length
  if (uses === 0) dead.push(f)
}

console.log(dead.length
  ? `${dead.length} tracked file(s) nothing imports:\n  ${dead.join('\n  ')}`
  : `all ${candidates.length} tracked components and libs are imported somewhere`)
