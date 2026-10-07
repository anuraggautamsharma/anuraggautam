// Scroll → route progress, shared by the DOM stage (RouteStage) and the WebGL scene.
// Three-free: this ships in the first-load bundle with RouteStage.

import { clamp01 } from '@/components/motion/loop'
import { CAMPS, PROFILE, SAMPLES, TRAILHEAD_MAP, TW } from './route-data.generated'

/** Pinned progress p at which each camp is reached (the route rests there). */
export const CAMP_P = [0.1, 0.28, 0.46, 0.64, 0.82] as const

/** Arc-length fraction u of each camp along the route (generated). */
export const tw: readonly number[] = TW

export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/** Key frames (p, u): trailhead → five camps → hold at the summit. */
const KEYS: readonly [number, number][] = [[0, 0], ...CAMP_P.map((p, i): [number, number] => [p, TW[i] ?? 1]), [1, 1]]

/**
 * Which leg of the key frames `p` falls in, and its eased fraction. The ease rests about
 * half of every leg: the route arrives, waits, then leaves.
 */
export function legAt(p: number): { i: number; f: number } {
  const x = clamp01(p)
  let i = 0
  while (i < KEYS.length - 2 && x > KEYS[i + 1][0]) i++
  const [p0] = KEYS[i]
  const [p1] = KEYS[i + 1]
  return { i, f: smoothstep(0.3, 0.8, (x - p0) / (p1 - p0 || 1)) }
}

/** Target route progress u for pinned progress p. */
export function routeU(p: number) {
  const { i, f } = legAt(p)
  const u0 = KEYS[i][1]
  const u1 = KEYS[i + 1][1]
  return u0 + (u1 - u0) * f
}

/** Index of the last camp reached at progress u (−1 before the first). */
export function activeCamp(u: number) {
  let a = -1
  for (let i = 0; i < TW.length; i++) if (u >= TW[i] - 0.002) a = i
  return a
}

/** Route point at progress u, in poster map units (linear between the generated samples). */
export function routePoint(u: number): [number, number] {
  const n = SAMPLES.length / 2
  const f = clamp01(u) * (n - 1)
  const i = Math.min(n - 2, Math.floor(f))
  const t = f - i
  const x0 = SAMPLES[i * 2]
  const y0 = SAMPLES[i * 2 + 1]
  return [x0 + (SAMPLES[i * 2 + 2] - x0) * t, y0 + (SAMPLES[i * 2 + 3] - y0) * t]
}

/**
 * The header Altimeter during the route: 2,900 m at the trailhead to 3,550 m at Camp 05, in 50s,
 * so the climb hands off to the Guide beat (3,600 m) without a jump.
 */
export const ALT_FROM = 2900
export const ALT_SPAN = 650
export function altitudeLabel(u: number) {
  const m = Math.round((ALT_FROM + clamp01(u) * ALT_SPAN) / 50) * 50
  return `${m.toLocaleString('en-US')} M`
}

/**
 * Map crops (poster map units) per layout. The plane box takes the frame's aspect; the
 * poster and the pins are placed inside it from these numbers (CSS reads them as custom
 * properties written by RouteMap, JS reads them here). x, y, w, h.
 */
export const FRAMES = {
  /** Flat map (no JS, reduced motion, /method): the whole island with a paper margin. */
  static: [-200, 100, 1300, 960],
  /** Desktop stage: same crop; the plane is sized and placed by CSS around the region of interest. */
  desk: [-200, 100, 1300, 960],
  /** Mobile stage: a square around the route, tilted in CSS 3D. */
  mob: [-30, 270, 780, 780],
} as const satisfies Record<string, readonly [number, number, number, number]>

export type FrameName = keyof typeof FRAMES

/** Where the desktop stage centres its view (map units): the climb from trailhead to summit. */
export const ROI = { x: 450, y: 640, w: 760, h: 640 } as const

export { CAMPS, PROFILE, TRAILHEAD_MAP }
