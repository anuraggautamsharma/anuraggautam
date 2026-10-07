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
  const v = [-0.72, 0.36, 0.6]
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

/** The baked mesh data: a (segments + 1)² grid over the 10 × 10 plane. */
export type SurfaceGrid = {
  n: number
  size: number
  y: Float32Array
  /** Bilinear height on the grid (what the triangles show), world units. */
  sample: (x: number, z: number) => number
}

export function gridSampler(n: number, y: Float32Array) {
  const size = TERRAIN.size
  const half = size / 2
  const seg = n - 1
  return (x: number, z: number) => {
    const fx = Math.min(seg - 1e-6, Math.max(0, ((x + half) / size) * seg))
    const fz = Math.min(seg - 1e-6, Math.max(0, ((z + half) / size) * seg))
    const i = Math.floor(fx)
    const j = Math.floor(fz)
    const u = fx - i
    const v = fz - j
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
 */
export function shadowAt(sample: (x: number, z: number) => number, x: number, y0: number, z: number, cell: number) {
  const hl = Math.hypot(SUN[0], SUN[2])
  const sx = SUN[0] / hl
  const sz = SUN[2] / hl
  const rise = SUN[1] / hl // ray climb per unit of horizontal travel
  let step = cell * 0.9
  let d = step
  let worst = -1
  for (let k = 0; k < 64 && d < 7; k++) {
    const px = x + sx * d
    const pz = z + sz * d
    if (Math.abs(px) > 5 || Math.abs(pz) > 5) break
    const h = sample(px, pz)
    const ray = y0 + 0.012 + d * rise
    const occ = (h - ray) / d
    if (occ > worst) worst = occ
    d += step
    step *= 1.07
  }
  return 1 - smooth(-0.035, 0.07, worst)
}

/** Ambient occlusion from the height difference to rings of neighbours (cavities darken, crests open up). */
export function occlusionAt(sample: (x: number, z: number) => number, x: number, y0: number, z: number) {
  let occ = 0
  const radii = [0.09, 0.24, 0.55]
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
