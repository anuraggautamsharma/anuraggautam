import { CAMP_ORDER, CAMP_XZ, TERRAIN, heightAt } from '@/lib/terrain'

// The 3D surface: the one heightfield from lib/terrain.ts (so the poster, the pins and the
// route all agree on where things are), sharpened and carved for the WebGL map. Erosion only
// ever cuts down, so no ridge can rise above the summit camp.

/** World height of the tallest point (the poster's relief, exaggerated for the 3D view). */
export const RELIEF = 2.5
/** Shapes the gaussian domes into peaks: valleys flatten, summits sharpen. */
const SHARPEN = 1.18
/** Deepest gully cut at full mask, world units. */
const CARVE = 0.42
/** The direction the light comes from: low, from the south-west, behind the viewer's left. */
export const SUN: readonly [number, number, number] = (() => {
  const v = [-0.72, 0.5, 0.6]
  const l = Math.hypot(v[0], v[1], v[2])
  return [v[0] / l, v[1] / l, v[2] / l] as const
})()

// ── Noise (deterministic, allocation-free) ─────────────────────────────────────────────────
const hash = (x: number, y: number) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
function vnoise(x: number, y: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const u = fade(x - xi)
  const v = fade(y - yi)
  const a = hash(xi, yi)
  const b = hash(xi + 1, yi)
  const c = hash(xi, yi + 1)
  const d = hash(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

/** Ridged multifractal, 0–1 (1 on a ridge crest). Each octave is weighted by the last, so ridges stay crisp. */
function ridged(x: number, y: number) {
  let sum = 0
  let amp = 0.5
  let norm = 0
  let w = 1
  let f = 1
  for (let o = 0; o < 3; o++) {
    // A rounded crest (smooth |v|), so ridges don't saw-tooth between grid vertices.
    const v = vnoise(x * f + o * 17.3, y * f + o * 9.1) * 2 - 1
    let n = 1 - Math.sqrt(v * v + 0.012)
    n *= n
    n *= w
    w = Math.min(1, n * 1.6)
    sum += n * amp
    norm += amp
    amp *= 0.45
    f *= 2.07
  }
  return sum / norm
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

const CAMPS_XZ = CAMP_ORDER.map((id) => CAMP_XZ[id])

/** Analytic surface height (world y) at (x, z). The mesh samples this; everything else samples the mesh. */
export function surfaceY(x: number, z: number) {
  const t = heightAt(x, z)
  const base = Math.pow(Math.max(0, t), SHARPEN)

  // Domain-warped ridges: branching spurs and gullies, the way water would cut them.
  const wx = vnoise(x * 0.8 + 3.1, z * 0.8 - 1.7) - 0.5
  const wz = vnoise(x * 0.8 - 7.4, z * 0.8 + 2.9) - 0.5
  const ridge = ridged(x * 1.25 + wx * 1.6, z * 1.25 + wz * 1.6)

  // Carve gullies on the mountain, keep the valleys and every camp's ground gentle.
  let flat = 0
  for (const [cx, cz] of CAMPS_XZ) {
    const ex = x - cx
    const ez = z - cz
    flat = Math.max(flat, Math.exp(-(ex * ex + ez * ez) / 0.07))
  }
  const mask = (0.22 + 0.78 * smooth(0.12, 0.62, t)) * (1 - flat)
  const gully = (1 - ridge) * CARVE * mask
  // A little tree-scale roughness on the lowlands.
  const rough = ((vnoise(x * 3.4, z * 3.4) - 0.5) * 0.04 + (vnoise(x * 1.6 + 5, z * 1.6) - 0.5) * 0.13) * (1 - smooth(0.25, 0.55, t)) * (1 - flat)
  return base * RELIEF - gully + rough
}

// ── The world around the island ─────────────────────────────────────────────────────────

/** Half-size of the world square (world units). The island is the central 10 × 10. */
export const WORLD = 72

function fbm2(x: number, y: number) {
  let s = 0
  let a = 0.5
  let f = 1
  for (let o = 0; o < 4; o++) {
    s += a * vnoise(x * f + o * 31.7, y * f - o * 12.3)
    a *= 0.5
    f *= 2.03
  }
  return s / 0.9375
}

/**
 * Beyond the island: rolling foothills near it, rising into great ranges towards the horizon
 * (a ring of peaks 18–60 units out), so every view is land to the edges with a skyline.
 */
function outerY(x: number, z: number) {
  const r = Math.hypot(x + 0.2, z - 0.3)
  const hills = fbm2(x * 0.16 + 4.1, z * 0.16 - 2.7)
  const wx = vnoise(x * 0.05 + 9.2, z * 0.05) - 0.5
  const wz = vnoise(x * 0.05, z * 0.05 - 6.6) - 0.5
  const range = ridged(x * 0.11 + wx * 2.2, z * 0.11 + wz * 2.2)
  const rise = smooth(16, 40, r)
  // Valleys around the island stay low and green (and meet its rim level); the skyline ranges
  // rise far off, where the haze turns them into blue silhouettes.
  const near = smooth(5, 12, r)
  // Forested ridges ring the valley the mountain stands in.
  const ridges = ridged(x * 0.24 + wx * 1.4 + 3.3, z * 0.24 + wz * 1.4 - 1.9) * smooth(6, 13, r) * (1 - smooth(22, 36, r))
  return 0.12 + hills * (0.12 + 0.45 * near) + ridges * 1.05 + rise * (range * 5.2 - 0.4) + smooth(40, 70, r) * 1.6
}

/** Land-cover mottling (broad patches), baked per vertex. */
export const mottleAt = (x: number, z: number) => fbm2(x * 2.2, z * 2.2)

/** World height anywhere: the island (exactly as before) blended into the outer world at its rim. */
export function worldY(x: number, z: number) {
  // A rounded-square rim with a ragged edge, so no straight seam shows where the two meet.
  const ax = Math.abs(x)
  const az = Math.abs(z)
  const edge = Math.pow(Math.pow(ax, 6) + Math.pow(az, 6), 1 / 6) + (vnoise(x * 0.7, z * 0.7) - 0.5) * 0.5
  if (edge <= 3.1) return surfaceY(x, z)
  const w = smooth(3.1, 4.9, edge)
  return surfaceY(Math.max(-5, Math.min(5, x)), Math.max(-5, Math.min(5, z))) * (1 - w) + outerY(x, z) * w
}

/**
 * Grid coordinates along one axis: uniform over the island (`segments` cells across 10 units),
 * then cells growing outward (4 % through the valley, 9 % beyond) to the world's edge, so detail sits where the climb is.
 */
export function axisCoords(segments: number) {
  const half = TERRAIN.size / 2
  const cell = TERRAIN.size / segments
  const out: number[] = []
  let step = cell
  let x = half
  while (x < WORLD) {
    // Gentle growth through the valley and its ridges, faster towards the hazy horizon.
    step *= x < 16 ? 1.04 : 1.09
    x += step
    out.push(Math.min(x, WORLD))
  }
  const inner = Array.from({ length: segments + 1 }, (_, i) => -half + cell * i)
  return Float64Array.from([...out.map((v) => -v).reverse(), ...inner, ...out])
}

/** Bilinear height on the (non-uniform) grid: what the triangles show. */
export function gridSampler(xs: Float64Array, y: Float32Array) {
  const n = xs.length
  const lo = xs[0]
  const hi = xs[n - 1]
  const find = (v: number) => {
    let a = 0
    let b = n - 1
    while (b - a > 1) {
      const m = (a + b) >> 1
      if (xs[m] <= v) a = m
      else b = m
    }
    return a
  }
  return (x: number, z: number) => {
    const cx = Math.min(hi - 1e-6, Math.max(lo, x))
    const cz = Math.min(hi - 1e-6, Math.max(lo, z))
    const i = find(cx)
    const j = find(cz)
    const u = (cx - xs[i]) / (xs[i + 1] - xs[i])
    const v = (cz - xs[j]) / (xs[j + 1] - xs[j])
    const o = j * n + i
    const a = y[o]
    const b = y[o + 1]
    const c = y[o + n]
    const d = y[o + n + 1]
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
  }
}

/**
 * Soft sun shadow for one grid vertex: march towards the sun and keep the steepest
 * occluder angle. 1 = lit, 0 = in shadow, with a penumbra that widens with distance.
 * `cell` is the local grid spacing: steps (and the reach) scale with it.
 */
export function shadowAt(sample: (x: number, z: number) => number, x: number, y0: number, z: number, cell: number) {
  const hl = Math.hypot(SUN[0], SUN[2])
  const sx = SUN[0] / hl
  const sz = SUN[2] / hl
  const rise = SUN[1] / hl // ray climb per unit of horizontal travel
  const far = cell > 0.06
  let step = cell * 0.9
  let d = step
  let worst = -1
  for (let k = 0; k < (far ? 18 : 64) && d < (far ? 14 : 9); k++) {
    const px = x + sx * d
    const pz = z + sz * d
    if (Math.abs(px) > WORLD || Math.abs(pz) > WORLD) break
    const h = sample(px, pz)
    const ray = y0 + 0.012 + d * rise
    const occ = (h - ray) / d
    if (occ > worst) worst = occ
    d += step
    step *= far ? 1.18 : 1.07
  }
  return 1 - smooth(-0.035, 0.07, worst)
}

/** Ambient occlusion from the height difference to rings of neighbours (cavities darken, crests open up). */
export function occlusionAt(sample: (x: number, z: number) => number, x: number, y0: number, z: number, cell: number) {
  let occ = 0
  const k = Math.max(1, cell / 0.039)
  const radii = [0.09 * k, 0.24 * k, 0.55 * k]
  for (let ri = 0; ri < radii.length; ri++) {
    const r = radii[ri]
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2 + ri * 0.4
      const h = sample(x + Math.cos(ang) * r, z + Math.sin(ang) * r)
      occ += Math.max(0, Math.atan2(h - y0, r)) / (Math.PI / 2)
    }
  }
  return Math.max(0, 1 - (occ / 24) * 2.6)
}
