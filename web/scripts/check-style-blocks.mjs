/* Fails if any React <style> block contains a character React escapes.
 *
 * This has shipped broken to production three times. React's server renderer
 * HTML-escapes <, >, & and quotes in the text children of a <style> element;
 * the browser does not. Two consequences, both silent:
 *   1. Hydration mismatch — "Text content does not match server-rendered HTML"
 *      — and in dev the error overlay covers the whole page.
 *   2. <style> content is RAW TEXT, so &quot; is never decoded. The
 *      server-rendered rule is invalid CSS and simply does not apply until
 *      React rewrites the node on hydration.
 *
 * Neither shows up in a green build. Both are trivially detectable here.
 *
 * The rule for authors: inside a <style>, use flat selectors only (no > child
 * combinator), no quoted attribute selectors, no content:'', no emoji, and put
 * the explanation in a JS comment ABOVE the tag rather than inside it.
 *
 *   node scripts/check-style-blocks.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')

// < and > break selectors; & and quotes break attribute selectors and content;
// anything above ASCII (emoji, arrows, the ▾ caret) round-trips differently.
const HAZARD = /[<>&"']|[^\x00-\x7F]/

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { if (e.name !== 'node_modules' && !e.name.startsWith('.')) walk(p, out) }
    else if (/\.(jsx?|tsx?)$/.test(e.name)) out.push(p)
  }
  return out
}

// Matches <style>{`...`}</style> and <style>{SOME_CONST}</style>. The second
// form is resolved by looking up a same-file `const NAME = `...`` template.
//
// `<style jsx>` is EXCLUDED and must stay excluded: styled-jsx compiles that
// CSS at build time into a real stylesheet rather than rendering it as the text
// child of a style element, so nothing is escaped and > / quotes are fine there.
const STYLE_TAG = /<style(?![^>]*\bjsx\b)[^>]*>\s*\{([\s\S]*?)\}\s*<\/style>/g

let failures = 0
let checked = 0

for (const file of walk(SRC)) {
  const src = fs.readFileSync(file, 'utf8')
  if (!src.includes('<style')) continue
  for (const m of src.matchAll(STYLE_TAG)) {
    const expr = m[1].trim()
    // Collect every template literal the expression reaches: the inline one,
    // plus any `const NAME = \`...\`` it names. A concatenation of both is the
    // shape MarketingShell uses.
    const bodies = []
    for (const lit of expr.matchAll(/`([\s\S]*?)`/g)) bodies.push(lit[1])
    // A plain quoted string is a perfectly safe way to write a short rule, so
    // resolve it rather than reporting the block as unreadable.
    if (!bodies.length) {
      const q = expr.match(/^'([^']*)'$/) || expr.match(/^"([^"]*)"$/)
      if (q) bodies.push(q[1])
    }
    for (const id of expr.matchAll(/\b([A-Z][A-Z0-9_]{2,})\b/g)) {
      const def = src.match(new RegExp('const ' + id[1] + '\\s*=\\s*`([\\s\\S]*?)`'))
      if (def) bodies.push(def[1])
    }
    if (!bodies.length) {
      // An expression we cannot resolve statically (a function call into
      // another module, e.g. ggNavCss()). Report rather than pass silently.
      console.log(`?  ${path.relative(SRC, file)}: <style>{${expr.slice(0, 40)}} not statically resolvable`)
      continue
    }
    for (const body of bodies) {
      checked++
      const lines = body.split('\n')
      lines.forEach((line, i) => {
        if (HAZARD.test(line)) {
          failures++
          const chars = [...new Set([...line].filter((c) => HAZARD.test(c)))]
          console.log(`X  ${path.relative(SRC, file)} style line ${i + 1}: ${JSON.stringify(chars)}`)
          console.log(`      ${line.trim().slice(0, 100)}`)
        }
      })
    }
  }
}

console.log(failures
  ? `\n${failures} hazardous line(s) inside React <style> blocks`
  : `\n${checked} style block(s) checked, all safe`)
process.exit(failures ? 1 : 0)
