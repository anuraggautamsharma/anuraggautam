// The only requestAnimationFrame in the app. Lenis, the header, count-ups, parallax,
// scroll-linked SVG and the R3F topo scene (frameloop:'never' + advance) all run from here.

export type FrameFn = (t: number, dt: number) => void

type LenisLike = {
  raf(t: number): void
  scroll: number
  velocity: number
  isScrolling: boolean | string
  time: number
  stop(): void
  start(): void
  scrollTo(
    target: number | string | HTMLElement,
    options?: { offset?: number; duration?: number; immediate?: boolean; lock?: boolean; force?: boolean; onComplete?: () => void },
  ): void
}
type EngineLike = { shouldRender(): boolean; frame(t: number): void }

/** How long the loop keeps running after the last input or motion before it idles. */
const IDLE_MS = 2000

const subs = new Set<FrameFn>()
let lenis: LenisLike | null = null
let engine: EngineLike | null = null
let rafId = 0
let last = 0
let busyUntil = 0

/** Live motion state, written once per frame. Read it, never write it from components. */
export const motion = {
  scrollY: 0,
  velocity: 0, // px per frame (Lenis) or derived from native scroll
  lastInput: 0, // performance.now() of the last pointer/scroll/key input
  rpm: -1, // v1 leftover, unused in v2
  pointer: { x: 0, y: 0, vx: 0, fine: false },
}

export function subscribe(fn: FrameFn) {
  subs.add(fn)
  wake()
  return () => {
    subs.delete(fn)
  }
}

export function setLenis(l: LenisLike | null) {
  lenis = l
  wake()
}

export function getLenis() {
  return lenis
}

export function setEngine(e: EngineLike | null) {
  engine = e
  wake()
}

/**
 * Keep the loop running for at least `ms` more. Input (MotionRuntime) and subscribe /
 * setLenis / setEngine call this; anything that animates without user input (e.g. the
 * engine on an IntersectionObserver entry) must call it too, or the idle loop won't see it.
 */
export function wake(ms = IDLE_MS) {
  if (typeof window === 'undefined') return
  busyUntil = Math.max(busyUntil, performance.now() + ms)
  start()
}

function start() {
  if (rafId || typeof window === 'undefined') return
  // rAF timestamps can trail performance.now(), so the first tick measures dt from 0 (= none).
  last = 0
  // Lenis measures dt from its last raf(); after an idle gap that would make the first
  // scroll step jump the whole distance. time = 0 makes its next raf() a zero-length step.
  if (lenis) lenis.time = 0
  rafId = requestAnimationFrame(tick)
}

function tick(t: number) {
  // Schedule first, and isolate every callee: one throw must not wedge the app's only rAF.
  rafId = requestAnimationFrame(tick)
  const dt = last ? Math.max(0, Math.min((t - last) / 1000, 1 / 20)) : 0
  last = t
  try {
    if (lenis) {
      lenis.raf(t)
      motion.scrollY = lenis.scroll
      motion.velocity = lenis.velocity
    } else {
      const y = window.scrollY
      motion.velocity = y - motion.scrollY
      motion.scrollY = y
    }
  } catch (err) {
    console.error('[loop] scroll', err)
  }
  for (const fn of subs) {
    try {
      fn(t, dt)
    } catch (err) {
      // Drop it so a broken subscriber doesn't log every frame; its unsub() becomes a no-op.
      console.error('[loop] subscriber', err)
      subs.delete(fn)
    }
  }
  let rendering = false
  if (engine) {
    try {
      rendering = engine.shouldRender()
      if (rendering) engine.frame(t)
    } catch (err) {
      console.error('[loop] engine', err)
      engine = null
      rendering = false
    }
  }
  // Still moving (Lenis inertia, native scroll, engine) extends the busy window, so eases
  // that start after input stops (e.g. the footer wordmark) get to settle before idling.
  const active = !!lenis?.isScrolling || Math.abs(motion.velocity) > 0.01 || rendering
  if (active) busyUntil = Math.max(busyUntil, t + IDLE_MS)
  if ((!subs.size && !lenis && !engine) || t > busyUntil) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
}

/** Critically damped follow, frame-rate independent. λ ≈ 6/s feels mechanical, not floaty. */
export function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
