// Visible-word budgets (SPEC_V2 §1): words in <main>, minus [data-wb-exclude] subtrees and
// aria-only text. A word is any whitespace token containing a letter, a digit, "$" or "~"
// (so "·" and "/" don't count).
//
// Per-path presets (PLAN_V3 §10, WP3): the homepage warns over 425 and fails over 450; the v3
// pages fail over their cap. --max overrides the fail cap, --warn the warning line.
//
//   node scripts/word-budget.mjs                                  (reads .next/server/app/index.html, after `next build`)
//   node scripts/word-budget.mjs http://localhost:3005/           (a running server; the path picks the preset)
//   node scripts/word-budget.mjs http://localhost:3005/start
//   node scripts/word-budget.mjs path/to/page.html --max 600 [--warn 550] [--path /community]
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const PRESETS = {
  '/': { warn: 425, max: 450 },
  '/start': { max: 180 },
  '/subscribe': { max: 200 },
  '/scorecard': { max: 260 },
  '/community': { max: 350 },
  '/privacy': { max: 150 },
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const VALUED = new Set(['--max', '--warn', '--path'])
const flag = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const target =
  args.find((a, i) => !a.startsWith('--') && !VALUED.has(args[i - 1])) ?? path.join(root, '.next/server/app/index.html')
const isUrl = /^https?:\/\//.test(target)

// The page path picks the preset: --path, else the URL's path, else the built file's route
// (.next/server/app/index.html is "/", .next/server/app/start.html is "/start").
const builtRoute = (file) => {
  const m = file.replace(/\\/g, '/').match(/\/server\/app\/(.+)\.html$/)
  return m ? (m[1] === 'index' ? '/' : `/${m[1]}`) : ''
}
const pagePath = (flag('--path') ?? (isUrl ? new URL(target).pathname : builtRoute(target))).replace(/(.)\/$/, '$1')
const preset = PRESETS[pagePath] ?? { max: 450 }
const MAX = flag('--max') != null ? Number(flag('--max')) : preset.max
const WARN = flag('--warn') != null ? Number(flag('--warn')) : (preset.warn ?? null)
if (!Number.isFinite(MAX) || (WARN != null && !Number.isFinite(WARN))) {
  console.error('word-budget: --max and --warn take a number')
  process.exit(2)
}

const html = isUrl ? await (await fetch(target)).text() : await readFile(target, 'utf8')

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'])
const SKIP = new Set(['script', 'style', 'template', 'noscript', 'svg', 'title'])
const WORD = /[\p{L}\p{N}$~]/u

const decode = (s) =>
  s
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))

const attr = (raw, name) => {
  const m = raw.match(new RegExp(`(?:^|\\s)${name}(?:\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+))?(?=\\s|/?$)`, 'i'))
  if (!m) return null
  return m[1] ? m[1].replace(/^["']|["']$/g, '') : ''
}

// A small streaming walk: a stack of open elements, each marked excluded or not.
const stack = [] // { tag, excluded, beat }
let inMain = false
let mainDepth = -1
let total = 0
const perBeat = new Map()
const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)/g
let m
while ((m = re.exec(html))) {
  const [, closing, rawTag, rawAttrs = '', selfClose, text] = m
  if (text != null) {
    const top = stack[stack.length - 1]
    if (!inMain || top?.excluded) continue
    const words = decode(text).split(/\s+/).filter((t) => WORD.test(t))
    if (!words.length) continue
    total += words.length
    const beat = top?.beat ?? '(main)'
    perBeat.set(beat, (perBeat.get(beat) ?? 0) + words.length)
    continue
  }
  if (!rawTag) continue // comment
  const tag = rawTag.toLowerCase()
  if (closing) {
    // Pop to the matching open tag (tolerates unclosed <p>/<li>).
    let i = stack.length - 1
    while (i >= 0 && stack[i].tag !== tag) i--
    if (i >= 0) stack.length = i
    if (inMain && stack.length <= mainDepth) {
      inMain = false
      break // only the first <main>
    }
    continue
  }
  const parent = stack[stack.length - 1]
  const cls = attr(rawAttrs, 'class') ?? ''
  const excluded =
    !!parent?.excluded ||
    SKIP.has(tag) ||
    attr(rawAttrs, 'data-wb-exclude') != null ||
    attr(rawAttrs, 'hidden') != null ||
    /(?:^|\s)(?:sr-only|visually-hidden)(?:\s|$)/.test(cls)
  let beat = parent?.beat
  if (inMain && stack.length === mainDepth + 1) beat = attr(rawAttrs, 'id') ?? tag
  const isVoid = VOID.has(tag) || !!selfClose
  if (tag === 'main' && !inMain) {
    inMain = true
    mainDepth = stack.length
  }
  if (!isVoid) stack.push({ tag, excluded, beat })
  // Raw-text elements: skip straight to their end tag.
  if (!isVoid && (tag === 'script' || tag === 'style')) {
    const end = html.indexOf(`</${tag}`, re.lastIndex)
    re.lastIndex = end < 0 ? html.length : end
  }
}

if (mainDepth < 0) {
  console.error(`word-budget: no <main> found in ${target}`)
  process.exit(1)
}

console.table([...perBeat].map(([beat, words]) => ({ beat, words })))
const label = pagePath || target
const over = total > MAX
const warn = !over && WARN != null && total > WARN
const verdict = over ? '(OVER BUDGET)' : warn ? `(over the ${WARN} target)` : '(ok)'
console.log(`word budget ${label}: ${total} / ${MAX} visible words in <main>${WARN != null ? ` (target ${WARN})` : ''} ${verdict}`)
if (warn) console.warn(`word-budget: warning, ${label} is ${total - WARN} words over its ${WARN}-word target`)
if (over) process.exit(1)
