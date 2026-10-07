// Generates the route map's data from the one heightfield in lib/terrain.ts (Node strips its
// types, so the poster and the WebGL scene share the exact same code). Run: `npm run gen:topo`
// (node scripts/gen-topo.mjs). Outputs are committed:
//   components/topo/topo-data.generated.ts     poster paths (server only: inlined into the SVG)
//   components/topo/route-data.generated.ts    small tables for the client (tw, samples, profile)
//   components/topo/scene/route-3d.generated.ts  the dense route for the lazy WebGL chunk
//
// Contours are traced with marching squares (no d3-contour dependency): isolines for the 40
// contour levels, and closed rings of {t ≥ threshold} (outside the grid counts as below) for
// the six hypsometric bands. Everything is RDP-simplified at 1.2 map units and rounded to 0.5.
// Fails (exit 1) when the terrain range drifts, the camp heights stop climbing, or the poster
// grows past its budget.

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { CatmullRomCurve3, Vector3 } from 'three'
import { CAMP_ORDER, CAMP_XZ, H_MAX, H_MIN, ROUTE_XZ, TERRAIN, TRAILHEAD, heightAt, makeHeight, toMap } from '../lib/terrain.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = (p) => path.join(root, p)
const fail = (msg) => {
  console.error(`gen-topo: ${msg}`)
  process.exit(1)
}

// ── Tuning ──────────────────────────────────────────────────────────────────────────────
/** Island mask (map units): an ellipse, opaque inside (1 − feather), dissolving to paper at its rim. */
const MASK = { cx: 450, cy: 580, rx: 640, ry: 470, feather: 0.16 }
/** Generation domain (map units): a square around the island, so it never meets a hard edge. */
const DOMAIN = (() => {
  const size = Math.ceil(2 * Math.max(MASK.rx, MASK.ry) + 16)
  return { x0: Math.round(MASK.cx - size / 2), y0: Math.round(MASK.cy - size / 2), size }
})()
const CELLS = 300 // marching-squares cells across the domain (≈ 4 map units each)
const LEVELS = 40 // contour interval = 1/40 of the relief; every 5th is major
const SNOW = 0.88 // contours above this height switch to glacier
/** Hypsometric band thresholds (normalised height); band 0 is the island itself. */
const BANDS = [0.14, 0.35, 0.48, 0.64, 0.86]
const BAND_FILLS = ['#2C6E45', '#6FA862', '#A9C27C', '#D3CB98', '#B4A797', '#E6F0F3']
const EPS = 1.2 // RDP tolerance, map units
const EPS_ROUTE = 0.6
const MIN_LOOP = 24 // drop closed contour loops shorter than this (map units)
const MIN_RING_AREA = 60 // drop band specks smaller than this (map units²)
const SAMPLES = 240 // route samples for the DOM route head (SVG mode)
const PROFILE = 64 // elevation profile samples (rail)
const ROUTE_3D = 600 // ribbon samples (WebGL)
const BUDGET = { raw: 24 * 1024, gz: 9 * 1024 }

// ── 1. The field is the one in lib/terrain.ts ──────────────────────────────────────────
{
  const h = makeHeight(TERRAIN.seed)
  const N = 1024
  let mn = Infinity
  let mx = -Infinity
  for (let j = 0; j <= N; j++)
    for (let i = 0; i <= N; i++) {
      const v = h(i / N, j / N)
      if (v < mn) mn = v
      if (v > mx) mx = v
    }
  if (Math.abs(mn - H_MIN) > 1e-12 || Math.abs(mx - H_MAX) > 1e-12)
    fail(`terrain range drifted: H_MIN=${mn} H_MAX=${mx}. Update lib/terrain.ts.`)
}

const heights = ROUTE_XZ.map(([x, z]) => heightAt(x, z))
for (let i = 1; i < heights.length; i++)
  if (heights[i] < heights[i - 1]) fail(`camp heights must climb: ${heights.map((h) => h.toFixed(3)).join(' → ')}`)
if (heights[heights.length - 1] < 0.97) fail(`Team must sit on the summit (t ≥ .97), got ${heights[heights.length - 1].toFixed(3)}`)

// ── 2. Height grid over the domain (map units → world) ───────────────────────────────────
const cell = DOMAIN.size / CELLS
const W = CELLS + 1
const grid = new Float64Array(W * W)
for (let j = 0; j < W; j++)
  for (let i = 0; i < W; i++) {
    const mx = DOMAIN.x0 + i * cell
    const my = DOMAIN.y0 + j * cell
    grid[j * W + i] = heightAt(mx / 100 - 5, my / 100 - 5)
  }

// ── 3. Marching squares ───────────────────────────────────────────────────────────────────
/**
 * Isolines of `F` (n × n cells, (n+1)² values) at level `t`, as polylines in grid units.
 * Segments are joined through shared cell edges; saddles resolve by the cell-centre value.
 */
function isolines(F, n, t) {
  const w = n + 1
  const at = (i, j) => F[j * w + i]
  const points = new Map()
  const segs = []
  const eH = (i, j) => (j * w + i) * 2
  const eV = (i, j) => (j * w + i) * 2 + 1
  const hit = (id, p, q, x0, y0, x1, y1) => {
    if (!points.has(id)) {
      const s = q === p ? 0.5 : (t - p) / (q - p)
      points.set(id, [x0 + (x1 - x0) * s, y0 + (y1 - y0) * s])
    }
    return id
  }
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const a = at(i, j)
      const b = at(i + 1, j)
      const c = at(i + 1, j + 1)
      const d = at(i, j + 1)
      const k = (a >= t ? 8 : 0) | (b >= t ? 4 : 0) | (c >= t ? 2 : 0) | (d >= t ? 1 : 0)
      if (k === 0 || k === 15) continue
      const T = () => hit(eH(i, j), a, b, i, j, i + 1, j)
      const R = () => hit(eV(i + 1, j), b, c, i + 1, j, i + 1, j + 1)
      const B = () => hit(eH(i, j + 1), d, c, i, j + 1, i + 1, j + 1)
      const L = () => hit(eV(i, j), a, d, i, j, i, j + 1)
      const mid = (a + b + c + d) / 4 >= t
      switch (k) {
        case 1: case 14: segs.push([L(), B()]); break
        case 2: case 13: segs.push([B(), R()]); break
        case 3: case 12: segs.push([L(), R()]); break
        case 4: case 11: segs.push([T(), R()]); break
        case 6: case 9: segs.push([T(), B()]); break
        case 7: case 8: segs.push([T(), L()]); break
        case 5: // b, d inside
          if (mid) segs.push([T(), L()], [R(), B()])
          else segs.push([T(), R()], [L(), B()])
          break
        case 10: // a, c inside
          if (mid) segs.push([T(), R()], [L(), B()])
          else segs.push([T(), L()], [R(), B()])
          break
      }
    }
  const byEdge = new Map()
  segs.forEach((s, idx) => {
    for (const e of s) {
      const list = byEdge.get(e)
      if (list) list.push(idx)
      else byEdge.set(e, [idx])
    }
  })
  const used = new Uint8Array(segs.length)
  const lines = []
  for (let s0 = 0; s0 < segs.length; s0++) {
    if (used[s0]) continue
    used[s0] = 1
    const chain = [segs[s0][0], segs[s0][1]]
    for (const forward of [true, false]) {
      for (;;) {
        const end = forward ? chain[chain.length - 1] : chain[0]
        const next = (byEdge.get(end) ?? []).find((idx) => !used[idx])
        if (next === undefined) break
        used[next] = 1
        const [p, q] = segs[next]
        const other = p === end ? q : p
        if (forward) chain.push(other)
        else chain.unshift(other)
      }
    }
    const closed = chain.length > 2 && chain[0] === chain[chain.length - 1]
    lines.push({ pts: chain.map((e) => points.get(e)), closed })
  }
  return lines
}

/** The field with a −∞ border, so every {t ≥ level} region closes inside the grid. */
function padded(F, n) {
  const w = n + 1
  const pw = n + 3
  const P = new Float64Array(pw * pw).fill(-1e9)
  for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) P[(j + 1) * pw + (i + 1)] = F[j * w + i]
  return P
}

// ── 4. Geometry helpers ───────────────────────────────────────────────────────────────────
function rdp(pts, eps) {
  if (pts.length < 3) return pts
  const keep = new Uint8Array(pts.length)
  keep[0] = keep[pts.length - 1] = 1
  const stack = [[0, pts.length - 1]]
  while (stack.length) {
    const [s, e] = stack.pop()
    const [ax, ay] = pts[s]
    const [bx, by] = pts[e]
    const dx = bx - ax
    const dy = by - ay
    const len = Math.hypot(dx, dy)
    let dm = 0
    let id = -1
    for (let i = s + 1; i < e; i++) {
      const [px, py] = pts[i]
      const d = len > 1e-9 ? Math.abs(dy * px - dx * py + bx * ay - by * ax) / len : Math.hypot(px - ax, py - ay)
      if (d > dm) {
        dm = d
        id = i
      }
    }
    if (dm > eps && id > 0) {
      keep[id] = 1
      stack.push([s, id], [id, e])
    }
  }
  return pts.filter((_, i) => keep[i])
}

const r05 = (v) => Math.round(v * 2) / 2
const num = (v) => {
  const s = String(r05(v))
  return s.startsWith('0.') ? s.slice(1) : s.startsWith('-0.') ? '-' + s.slice(2) : s
}
const perimeter = (pts) => pts.reduce((acc, p, i) => (i ? acc + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0)
const area = (pts) => {
  let a = 0
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1])
  return Math.abs(a / 2)
}

/** Polylines (map units) → compact path data: absolute M, relative l, numbers at 0.5 steps. */
function toD(lines, closeRings) {
  let d = ''
  for (const { pts, closed } of lines) {
    const p = pts.map(([x, y]) => [r05(x), r05(y)])
    const q = p.filter((pt, i) => i === 0 || pt[0] !== p[i - 1][0] || pt[1] !== p[i - 1][1])
    if (q.length < 2) continue
    d += `M${num(q[0][0])} ${num(q[0][1])}l`
    let seq = ''
    for (let i = 1; i < q.length; i++) {
      if (closed && closeRings && i === q.length - 1 && q[i][0] === q[0][0] && q[i][1] === q[0][1]) break
      const dx = num(q[i][0] - q[i - 1][0])
      const dy = num(q[i][1] - q[i - 1][1])
      seq += (seq && !dx.startsWith('-') ? ' ' : '') + dx + (dy.startsWith('-') ? '' : ' ') + dy
    }
    d += seq + (closed && closeRings ? 'z' : '')
  }
  return d
}

const toMapPts = (pts, offset) => pts.map(([gi, gj]) => [DOMAIN.x0 + (gi - offset) * cell, DOMAIN.y0 + (gj - offset) * cell])
/** Inside the island ellipse, grown by `pad` map units. */
const inMask = ([x, y], pad = 0) => Math.hypot((x - MASK.cx) / (MASK.rx + pad), (y - MASK.cy) / (MASK.ry + pad)) <= 1

/** Split polylines into the runs that fall inside the island mask (the rest is invisible). */
function clipToMask(lines) {
  const outLines = []
  for (const { pts, closed } of lines) {
    if (closed && pts.every((p) => inMask(p, 6))) {
      outLines.push({ pts, closed })
      continue
    }
    let run = []
    for (const p of pts) {
      if (inMask(p, 6)) run.push(p)
      else {
        if (run.length > 1) outLines.push({ pts: run, closed: false })
        run = []
      }
    }
    if (run.length > 1) outLines.push({ pts: run, closed: false })
  }
  return outLines
}

// ── 5. Contours ───────────────────────────────────────────────────────────────────────────
const contour = { minor: [], major: [], minorSnow: [], majorSnow: [] }
for (let k = 1; k < LEVELS; k++) {
  const t = k / LEVELS
  const lines = clipToMask(isolines(grid, CELLS, t).map(({ pts, closed }) => ({ pts: toMapPts(pts, 0), closed })))
    .map(({ pts, closed }) => ({ pts: rdp(pts, EPS), closed }))
    .filter(({ pts, closed }) => (closed ? perimeter(pts) >= MIN_LOOP : perimeter(pts) >= MIN_LOOP / 2))
  const major = k % 5 === 0
  const key = t > SNOW ? (major ? 'majorSnow' : 'minorSnow') : major ? 'major' : 'minor'
  contour[key].push(...lines)
}

// ── 6. Hypsometric bands: closed rings of {t ≥ threshold}, filled even-odd ─────────────────
const pad = padded(grid, CELLS)
const bands = [
  // Band 0 is the whole island; the mask shapes it.
  `M${num(DOMAIN.x0)} ${num(DOMAIN.y0)}h${num(DOMAIN.size)}v${num(DOMAIN.size)}h-${num(DOMAIN.size)}z`,
  ...BANDS.map((t) =>
    toD(
      isolines(pad, CELLS + 2, t)
        .map(({ pts }) => ({ pts: rdp(toMapPts(pts, 1), EPS), closed: true }))
        .filter(({ pts }) => pts.length > 3 && area(pts) >= MIN_RING_AREA && pts.some((p) => inMask(p, 4))),
      true,
    ),
  ),
]

// ── 7. The route ──────────────────────────────────────────────────────────────────────────
// CatmullRomCurve3 (centripetal) through trailhead + camps, as the WebGL scene draws it.
const H = TERRAIN.H
const curve = new CatmullRomCurve3(
  ROUTE_XZ.map(([x, z]) => new Vector3(x, heightAt(x, z) * H + 0.03, z)),
  false,
  'centripetal',
)
const LEGS = ROUTE_XZ.length - 1
const PER_LEG = 400
/** Dense plan-view polyline in world (x, z); camps are exact vertices at leg boundaries. */
const dense = []
const legStart = []
for (let leg = 0; leg < LEGS; leg++) {
  legStart.push(dense.length)
  for (let s = 0; s < PER_LEG; s++) {
    const p = curve.getPoint((leg + s / PER_LEG) / LEGS)
    dense.push(s === 0 ? [...ROUTE_XZ[leg]] : [p.x, p.z])
  }
}
legStart.push(dense.length)
dense.push([...ROUTE_XZ[LEGS]])

// SVG polyline: each leg simplified on its own so the camps stay vertices.
const svgPts = []
for (let leg = 0; leg < LEGS; leg++) {
  const legPts = dense.slice(legStart[leg], legStart[leg + 1] + 1).map(([x, z]) => toMap(x, z))
  const simple = rdp(legPts, EPS_ROUTE).map(([x, y]) => [r05(x), r05(y)])
  svgPts.push(...(leg ? simple.slice(1) : simple))
}
const cum = [0]
for (let i = 1; i < svgPts.length; i++) cum.push(cum[i - 1] + Math.hypot(svgPts[i][0] - svgPts[i - 1][0], svgPts[i][1] - svgPts[i - 1][1]))
const routeLength = cum[cum.length - 1]
const campVertex = ROUTE_XZ.slice(1).map(([x, z]) => {
  const [mx, my] = toMap(x, z).map(r05)
  const idx = svgPts.findIndex(([px, py]) => px === mx && py === my)
  if (idx < 0) fail(`camp at ${mx},${my} is not a vertex of the route path`)
  return idx
})
const tw = campVertex.map((idx) => cum[idx] / routeLength)
tw[tw.length - 1] = 1

/** Point at arc fraction u of the SVG polyline (map units). */
function svgAt(u) {
  const target = Math.min(1, Math.max(0, u)) * routeLength
  let lo = 0
  let hi = cum.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (cum[mid] <= target) lo = mid
    else hi = mid
  }
  const seg = cum[hi] - cum[lo] || 1
  const f = (target - cum[lo]) / seg
  return [svgPts[lo][0] + (svgPts[hi][0] - svgPts[lo][0]) * f, svgPts[lo][1] + (svgPts[hi][1] - svgPts[lo][1]) * f]
}
const mapToWorld = ([mx, my]) => [mx / 100 - 5, my / 100 - 5]

const samples = Array.from({ length: SAMPLES }, (_, i) => {
  const [x, y] = svgAt(i / (SAMPLES - 1))
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10]
})
const profile = Array.from({ length: PROFILE }, (_, i) => {
  const [x, z] = mapToWorld(svgAt(i / (PROFILE - 1)))
  return Math.round(heightAt(x, z) * 1000) / 1000
})

// 3D ribbon: uniform in u, where each leg maps linearly onto the dense curve's own arc so the
// ribbon tip reaches camp i exactly at u = tw[i] (the same u that draws the SVG path).
const denseCum = [0]
for (let i = 1; i < dense.length; i++) denseCum.push(denseCum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]))
function denseAt(arc) {
  let lo = 0
  let hi = denseCum.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (denseCum[mid] <= arc) lo = mid
    else hi = mid
  }
  const f = (arc - denseCum[lo]) / (denseCum[hi] - denseCum[lo] || 1)
  return [dense[lo][0] + (dense[hi][0] - dense[lo][0]) * f, dense[lo][1] + (dense[hi][1] - dense[lo][1]) * f]
}
const legU = [0, ...tw]
const route3d = []
for (let j = 0; j < ROUTE_3D; j++) {
  const u = j / (ROUTE_3D - 1)
  let leg = 0
  while (leg < LEGS - 1 && u > legU[leg + 1]) leg++
  const f = (u - legU[leg]) / (legU[leg + 1] - legU[leg])
  const a = denseCum[legStart[leg]]
  const b = denseCum[legStart[leg + 1]]
  const [x, z] = denseAt(a + (b - a) * Math.min(1, Math.max(0, f)))
  route3d.push(Math.round(x * 1e4) / 1e4, Math.round(z * 1e4) / 1e4)
}

const camps = CAMP_ORDER.map((id) => {
  const [x, z] = CAMP_XZ[id]
  const [mx, my] = toMap(x, z)
  return { id, x: r05(mx), y: r05(my), h: Math.round(heightAt(x, z) * 1000) / 1000 }
})
const [tx, ty] = toMap(...TRAILHEAD)

// The route layer gets its own tight viewBox (route + trailhead flag + stroke room), so its
// per-frame repaint while the route draws stays small.
const ROUTE_PAD = 34
const routeBox = (() => {
  const xs = [...svgPts.map((p) => p[0]), tx]
  const ys = [...svgPts.map((p) => p[1]), ty - 30]
  const x0 = Math.floor(Math.min(...xs) - ROUTE_PAD)
  const y0 = Math.floor(Math.min(...ys) - ROUTE_PAD)
  return [x0, y0, Math.ceil(Math.max(...xs) + ROUTE_PAD) - x0, Math.ceil(Math.max(...ys) + ROUTE_PAD) - y0]
})()

// ── 8. Write ──────────────────────────────────────────────────────────────────────────────
const routeD = toD([{ pts: svgPts, closed: false }], false)
const poster = {
  bands,
  minor: toD(contour.minor, true),
  major: toD(contour.major, true),
  minorSnow: toD(contour.minorSnow, true),
  majorSnow: toD(contour.majorSnow, true),
  route: routeD,
}
const svgBytes = Object.values(poster).join('').length + 1400 // + markup around the paths
const gz = gzipSync(Object.values(poster).join('\n')).length + 500
const header = '// Generated by scripts/gen-topo.mjs from lib/terrain.ts. Do not edit; run `npm run gen:topo`.\n'
const round3 = (v) => Math.round(v * 1000) / 1000

writeFileSync(
  out('components/topo/topo-data.generated.ts'),
  `${header}// Poster geometry, map units (viewBox 0 0 1000 1000 = world x, z ∈ [−5, 5]; north up).
// Server only: these strings are inlined into the SVG, never shipped as JS.

export const TOPO = {
  viewBox: [${DOMAIN.x0}, ${DOMAIN.y0}, ${DOMAIN.size}, ${DOMAIN.size}],
  mask: ${JSON.stringify(MASK)},
  fills: ${JSON.stringify(BAND_FILLS)},
  /** Six hypsometric bands, lowest first; each is {t ≥ threshold}, filled even-odd. */
  bands: ${JSON.stringify(poster.bands)},
  minor: ${JSON.stringify(poster.minor)},
  major: ${JSON.stringify(poster.major)},
  /** Contours above t ${SNOW} (the snow line). */
  minorSnow: ${JSON.stringify(poster.minorSnow)},
  majorSnow: ${JSON.stringify(poster.majorSnow)},
  route: ${JSON.stringify(poster.route)},
  /** The route layer's own viewBox: x, y, w, h. */
  routeBox: ${JSON.stringify(routeBox)},
  /** Length of the route path, for dash patterns on the normalised (pathLength 1) path. */
  routeLength: ${round3(routeLength)},
} as const
`,
)

writeFileSync(
  out('components/topo/route-data.generated.ts'),
  `${header}// Client-safe route tables (map units, viewBox 0 0 1000 1000). Kept apart from the poster
// paths so the client bundle only carries these numbers.

/** Arc-length fraction u of each camp along the route (trailhead u = 0, Team u = 1). */
export const TW = ${JSON.stringify(tw.map((v) => Math.round(v * 1e5) / 1e5))} as const

/** ${SAMPLES} points at uniform u along the route: x0, y0, x1, y1, … */
export const SAMPLES = ${JSON.stringify(samples.flat())} as const

/** Normalised elevation at ${PROFILE} uniform steps of u (the rail's profile). */
export const PROFILE = ${JSON.stringify(profile)} as const

export const CAMPS = ${JSON.stringify(camps)} as const

export const TRAILHEAD_MAP = { x: ${r05(tx)}, y: ${r05(ty)} } as const
`,
)

writeFileSync(
  out('components/topo/scene/route-3d.generated.ts'),
  `${header}// ${ROUTE_3D} plan-view route points in world units (x0, z0, x1, z1, …) at uniform u = i / ${ROUTE_3D - 1}.

export const ROUTE_3D: readonly number[] = ${JSON.stringify(route3d)}
`,
)

const kb = (n) => (n / 1024).toFixed(1) + ' KB'
console.log(`gen-topo: poster ≈ ${kb(svgBytes)} raw / ${kb(gz)} gz (budget ${kb(BUDGET.raw)} / ${kb(BUDGET.gz)})`)
console.log(`gen-topo: camps t = ${heights.map((h) => h.toFixed(3)).join(' → ')}; tw = ${tw.map((v) => v.toFixed(3)).join(', ')}`)
console.log(`gen-topo: route ${routeLength.toFixed(1)} map units, ${svgPts.length} vertices`)
if (svgBytes > BUDGET.raw || gz > BUDGET.gz) fail('poster over budget: raise EPS / MIN_LOOP or narrow the mask')
