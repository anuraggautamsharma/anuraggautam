// "One terrain": the seeded heightfield behind the route map, shared by the generated SVG
// poster (scripts/gen-topo.mjs) and the WebGL scene (components/topo/scene). A port of
// docs/design-system-v2/terrain.mjs `makeHeight(7)`; keep the arithmetic identical so both
// renderers draw the same mountain.
//
// Pure math with type-only imports: Node runs this file directly (type stripping) from
// scripts/gen-topo.mjs, so it must not import runtime code through the `@/` alias.

import type { CampId } from '@/lib/site'

/** World plane: x, z ∈ [−size/2, size/2]; heights are normalised to [0, 1], then × H. */
export const TERRAIN = { seed: 7, size: 10, H: 1.6 } as const

/**
 * Range of the raw field over a 1025 × 1025 lattice of the whole plane (u, v = i / 1024).
 * scripts/gen-topo.mjs recomputes it on every run and fails when these drift.
 */
export const H_MIN = -0.04449081478412887
export const H_MAX = 1.5716227190575967

export function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Peak = { x: number; y: number; a: number; s: number }

/** The raw field in plane UV (u, v ∈ [0, 1]); roughly [−0.05, 1.6]. */
export function makeHeight(seed: number = TERRAIN.seed) {
  const r = mulberry32(seed)
  const G = 64
  // Float32 on purpose: the reference stores the lattice as float32, and the values must match.
  const lat = new Float32Array((G + 1) * (G + 1)).map(() => r())
  const s = (t: number) => t * t * (3 - 2 * t)
  const g = (i: number, j: number) => lat[(j % G) * (G + 1) + (i % G)]
  const vn = (x0: number, y0: number) => {
    const x = ((x0 % G) + G) % G
    const y = ((y0 % G) + G) % G
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const xf = x - xi
    const yf = y - yi
    const a = g(xi, yi)
    const b = g(xi + 1, yi)
    const c = g(xi, yi + 1)
    const d = g(xi + 1, yi + 1)
    const u = s(xf)
    const v = s(yf)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
  }
  const peaks: Peak[] = [{ x: 0.62, y: 0.38, a: 1.0, s: 0.16 }].concat(
    Array.from({ length: 5 }, () => ({ x: 0.12 + 0.76 * r(), y: 0.12 + 0.76 * r(), a: 0.25 + 0.4 * r(), s: 0.07 + 0.12 * r() })),
  )
  return (u: number, v: number) => {
    let h = 0
    for (const p of peaks) {
      const dx = u - p.x
      const dy = v - p.y
      h += p.a * Math.exp(-(dx * dx + dy * dy) / (2 * p.s * p.s))
    }
    let n = 0
    let amp = 0.5
    let f = 4
    for (let o = 0; o < 4; o++) {
      n += amp * (vn(u * f * 1.5 + o * 13.1, v * f + o * 7.7) - 0.5)
      amp *= 0.5
      f *= 2
    }
    return h * 0.9 + n * 0.16
  }
}

let field: ((u: number, v: number) => number) | null = null

/** Raw field at a world point (x, z ∈ [−5, 5]). */
export function rawHeightAt(x: number, z: number) {
  field ??= makeHeight(TERRAIN.seed)
  return field(x / TERRAIN.size + 0.5, z / TERRAIN.size + 0.5)
}

/** Normalised height t ∈ [0, 1] at a world point (x, z ∈ [−5, 5]). World y = t · TERRAIN.H. */
export function heightAt(x: number, z: number) {
  return (rawHeightAt(x, z) - H_MIN) / (H_MAX - H_MIN)
}

/** The trailhead, u = 0 on the route. */
export const TRAILHEAD: [number, number] = [-3.6, 3.8]

/** The five camps (world x, z). Heights climb: valley at Position, summit at Team. */
export const CAMP_XZ: Record<CampId, [number, number]> = {
  position: [-2.4, 2.6],
  price: [-0.2, 2.9],
  market: [-1.9, 0.9],
  systems: [-0.7, 0.4],
  team: [0.5, -0.4],
}

/** Camp order along the route. */
export const CAMP_ORDER: readonly CampId[] = ['position', 'price', 'market', 'systems', 'team']

/** Route control points: trailhead, then the camps in order. */
export const ROUTE_XZ: readonly [number, number][] = [TRAILHEAD, ...CAMP_ORDER.map((id) => CAMP_XZ[id])]

/** World (x, z) → poster map units (viewBox 0 0 1000 1000; north up, x → right, z → down). */
export const toMap = (x: number, z: number): [number, number] => [
  ((x + TERRAIN.size / 2) / TERRAIN.size) * 1000,
  ((z + TERRAIN.size / 2) / TERRAIN.size) * 1000,
]
