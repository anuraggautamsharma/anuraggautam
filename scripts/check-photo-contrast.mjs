// Text-on-photo legibility gate (SPEC_V2 §6). For every photo with a text zone in lib/photos.ts,
// composite the declared scrim (or paper veil) over the zone, then measure the text colour
// against the worst pixel: the 95th-percentile luminance for paper text ("photo" tone), the
// 5th-percentile for ink text ("photo-light"). Lines need 4.5:1, display text 3:1.
//
//   node scripts/check-photo-contrast.mjs            (exit 1 when any zone fails)
//   node scripts/check-photo-contrast.mjs --verbose  (print every zone)
//   node scripts/check-photo-contrast.mjs --strict   (also fail zones between 3:1 and 4.5:1)
//   node scripts/check-photo-contrast.mjs --only=hero-gtm,hero-about  (just these photos)
// A zone holds a beat's whole text block, so a 3–4.5:1 zone is reported as "display-only":
// legible for headlines (with --text-shadow-photo on top), not proven for small lines.
//
// Also checked:
//  - every hero-* photo must declare a zonePortrait (the copy box on the 4:5 mobile crop);
//  - photos without their own 4:5 file are cropped to 4:5 around the focal point, as
//    object-fit: cover does, and every portrait frame uses the scrim's aPortrait and
//    reachPortrait (CSS switches by viewport aspect, not by file);
//  - the header strip (top 9%) of every paper-text hero (basecamp-hero, hero-*), with the
//    clear header's own .42 → 0 scrim over 140px (chrome.css .site-header::before) on top
//    (.62 for headerScrim: 'strong'). The bar's text is bold and carries --text-shadow-photo,
//    so it follows the same rule as zones: 4.5:1 passes, 3:1 is the floor.
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const verbose = process.argv.includes('--verbose')
const strict = process.argv.includes('--strict')
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',') // e.g. --only=hero-gtm,hero-about

const PAPER = [0xf7, 0xf2, 0xe8]
const INK = [0x0e, 0x1d, 0x15]
const LINE_MIN = 4.5
const DISPLAY_MIN = 3
const SAMPLE_W = 960 // analyse a downscale; percentiles are stable well above this
const HEADER_STRIP = { x: 0, y: 0, w: 1, h: 0.09 }
const HEADER_SCRIM = { rgb: [16, 20, 32], a: 0.42, px: 140, frame: 900 } // 1440×900: the strip is ~81px of a 140px fade
const HEADER_SCRIM_STRONG = 0.62 // headerScrim: 'strong' (chrome.css --hd-scrim-a)

// ── Read the photo table out of lib/photos.ts (the TS module imports .jpg, so it can't be loaded) ──
const src = await readFile(path.join(root, 'lib/photos.ts'), 'utf8')
const imports = Object.fromEntries([...src.matchAll(/^import (\w+) from '@\/(assets\/nature\/[^']+)'/gm)].map((m) => [m[1], m[2]]))
const table = src.slice(src.indexOf('export const photos'))
const blocks = [...table.matchAll(/^ {2}'([a-z0-9-]+)': \{([\s\S]*?)^ {2}\},/gm)]
if (!blocks.length) throw new Error('No photo entries found in lib/photos.ts')

const num = (s) => Number(s)
const zoneOf = (body, key) => {
  const m = body.match(new RegExp(`\\b${key}: \\{ x: ([\\d.]+), y: ([\\d.]+), w: ([\\d.]+), h: ([\\d.]+) \\}`))
  return m ? { x: num(m[1]), y: num(m[2]), w: num(m[3]), h: num(m[4]) } : null
}

const entries = blocks.map(([, id, body]) => {
  const sb = body.match(/\bscrim: \{([^}]*)\}/)?.[1]
  const key = (k) => sb?.match(new RegExp(`\\b${k}: '?([\\w. ]+?)'?(?:,|$)`))?.[1]?.trim()
  return {
    id,
    focal: (body.match(/focal: '([\d.]+)% ([\d.]+)%'/) ?? []).slice(1).map((v) => num(v) / 100),
    src: imports[body.match(/\bsrc: (\w+)/)?.[1]],
    portrait: imports[body.match(/\bportrait: (\w+)/)?.[1]],
    tone: body.match(/tone: '([\w-]+)'/)?.[1],
    veil: body.match(/\bveil: ([\d.]+)/) ? num(body.match(/\bveil: ([\d.]+)/)[1]) : 0,
    scrim: sb
      ? {
          side: key('side'),
          rgb: key('rgb').split(' ').map(Number),
          a: num(key('a')),
          aPortrait: key('aPortrait') ? num(key('aPortrait')) : undefined,
          reach: key('reach') ? num(key('reach')) : undefined,
          reachPortrait: key('reachPortrait') ? num(key('reachPortrait')) : undefined,
        }
      : null,
    zone: zoneOf(body, 'zone'),
    zonePortrait: zoneOf(body, 'zonePortrait'),
    headerScrim: body.match(/headerScrim: '(\w+)'/)?.[1],
  }
})

// ── Colour maths (WCAG 2.2 relative luminance) ──
const lin = (c) => {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

// The .photo-scrim stops from globals.css: alpha multipliers by distance from the scrim's edge.
const SCRIM_STOPS = [[0, 1], [0.1, 0.98], [0.2, 0.88], [0.32, 0.7], [0.46, 0.46], [0.6, 0.22], [0.72, 0.07], [0.82, 0]]
const VEIL_STOPS = [[0, 1], [0.3, 0.6], [0.62, 0]]
const along = (stops, t) => {
  if (t <= stops[0][0]) return stops[0][1]
  for (let i = 1; i < stops.length; i++) {
    const [t1, v1] = stops[i]
    const [t0, v0] = stops[i - 1]
    if (t <= t1) return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0)
  }
  return stops[stops.length - 1][1]
}

/** Pixels of the frame as rendered: the file itself, or a 4:5 cover-crop around the focal point. */
async function frameOf(file, crop45, focal) {
  let img = sharp(path.join(root, file))
  if (crop45) {
    const meta = await img.metadata()
    const W = meta.width
    const H = meta.height
    if (W / H > 4 / 5) {
      const cw = Math.round((H * 4) / 5)
      img = img.extract({ left: Math.round((W - cw) * (focal[0] ?? 0.5)), top: 0, width: cw, height: H })
    } else {
      const ch = Math.round((W * 5) / 4)
      img = img.extract({ left: 0, top: Math.round((H - ch) * (focal[1] ?? 0.5)), width: W, height: ch })
    }
  }
  return img.resize({ width: SAMPLE_W, withoutEnlargement: true }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
}

async function measure(file, zone, photo, portraitFrame, opts = {}) {
  const { data, info } = await frameOf(file, portraitFrame && !photo.portrait, photo.focal)
  const { width: W, height: H } = info
  const x0 = Math.floor(zone.x * W)
  const y0 = Math.floor(zone.y * H)
  const x1 = Math.min(W, Math.ceil((zone.x + zone.w) * W))
  const y1 = Math.min(H, Math.ceil((zone.y + zone.h) * H))
  const paperText = photo.tone === 'photo'
  const s = photo.scrim
  const sa = s ? (portraitFrame ? (s.aPortrait ?? s.a) : s.a) : 0
  const reach = s ? (portraitFrame ? (s.reachPortrait ?? 1) : (s.reach ?? 1)) : 1
  const hs = opts.headerScrim
  const lums = []
  // 'left' is a left-to-right fade on wide frames and a top fade on the 4:5 crop (Photo.tsx).
  const side = s?.side === 'left' && portraitFrame ? 'top' : s?.side
  for (let y = y0; y < y1; y++) {
    const ty = y / (H - 1)
    const rowA = s && side !== 'left' ? sa * along(SCRIM_STOPS, (side === 'top' ? ty : 1 - ty) / reach) : 0
    const veilA = !paperText && photo.veil ? photo.veil * along(VEIL_STOPS, ty) : 0
    for (let x = x0; x < x1; x++) {
      const scrimA = side === 'left' ? sa * along(SCRIM_STOPS, x / (W - 1) / reach) : rowA
      const i = (y * W + x) * 3
      let r = data[i]
      let g = data[i + 1]
      let b = data[i + 2]
      if (scrimA) {
        r = r * (1 - scrimA) + s.rgb[0] * scrimA
        g = g * (1 - scrimA) + s.rgb[1] * scrimA
        b = b * (1 - scrimA) + s.rgb[2] * scrimA
      }
      if (hs) {
        // Fade over 140px of a 900px-tall frame, expressed in image fractions.
        const ha = hs.a * Math.max(0, 1 - (ty * hs.frame) / hs.px)
        r = r * (1 - ha) + hs.rgb[0] * ha
        g = g * (1 - ha) + hs.rgb[1] * ha
        b = b * (1 - ha) + hs.rgb[2] * ha
      }
      if (veilA) {
        r = r * (1 - veilA) + PAPER[0] * veilA
        g = g * (1 - veilA) + PAPER[1] * veilA
        b = b * (1 - veilA) + PAPER[2] * veilA
      }
      lums.push(lum(r, g, b))
    }
  }
  if (!lums.length) return null
  lums.sort((a, b) => a - b)
  const worst = paperText ? lums[Math.floor(lums.length * 0.95)] : lums[Math.floor(lums.length * 0.05)]
  const text = paperText ? lum(...PAPER) : lum(...INK)
  return ratio(text, worst)
}

let failed = 0
const rows = []
const isHero = (p) => p.id === 'basecamp-hero' || p.id.startsWith('hero-')
for (const p of entries) {
  if (only && !only.includes(p.id)) continue
  if (p.id.startsWith('hero-') && !(p.zonePortrait && p.zonePortrait.w && p.zonePortrait.h)) {
    failed++
    rows.push({ id: p.id, frame: 'portrait', text: '-', contrast: '-', status: 'FAIL (no zonePortrait)' })
  }
  const checks = [
    ['desktop', p.src, p.zone, false],
    ['portrait', p.portrait ?? p.src, p.zonePortrait, true],
  ]
  for (const [frame, file, zone, portraitFrame] of checks) {
    if (!zone || !zone.w || !zone.h || !file) continue
    const c = await measure(file, zone, p, portraitFrame)
    if (c == null) continue
    const status = c >= LINE_MIN ? 'pass' : c >= DISPLAY_MIN ? 'display-only' : 'FAIL'
    if (status === 'FAIL') failed++
    rows.push({ id: p.id, frame, text: p.tone === 'photo' ? 'paper' : 'ink', contrast: c.toFixed(2), status })
  }
  // The clear header sits on every paper-text hero.
  if (isHero(p) && p.tone === 'photo' && p.src) {
    for (const [frame, file, portraitFrame] of [['header', p.src, false], ['header-portrait', p.portrait ?? p.src, true]]) {
      const hs = p.headerScrim === 'strong' ? { ...HEADER_SCRIM, a: HEADER_SCRIM_STRONG } : HEADER_SCRIM
      const c = await measure(file, HEADER_STRIP, p, portraitFrame, { headerScrim: hs })
      if (c == null) continue
      const status = c >= LINE_MIN ? 'pass' : c >= DISPLAY_MIN ? 'display-only' : 'FAIL'
      if (status === 'FAIL') failed++
      rows.push({ id: p.id, frame, text: 'paper', contrast: c.toFixed(2), status })
    }
  }
}

const show = verbose ? rows : rows.filter((r) => r.status !== 'pass')
if (show.length) console.table(show)
const warn = rows.filter((r) => r.status === 'display-only').length
console.log(
  `photo contrast: ${rows.length} zones, ${rows.length - failed - warn} pass ≥ ${LINE_MIN}:1, ${warn} display-only (≥ ${DISPLAY_MIN}:1, keep lines out), ${failed} fail`,
)
if (failed || (strict && warn)) process.exit(1)
