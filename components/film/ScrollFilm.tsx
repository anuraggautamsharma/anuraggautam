'use client'
'use no memo' // React Compiler: this island drives a canvas imperatively from the shared loop

import { type ReactNode, useEffect, useRef } from 'react'
import { damp, subscribe, wake } from '@/components/motion/loop'
import { isReducedMotion, subscribeMotionPref } from '@/components/layout/motionPref'
import './film.css'

/** public/film/<name>/manifest.json */
type Variant = { id: string; w: number; h: number; ext: 'webp' | 'jpg'; portrait?: boolean }
type Manifest = { frames: number; variants: Variant[] }

type Nav = Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }

/** Coarse to fine: every 16th frame first (the film is scrubbable within a second), then fill in. */
const STRIDES = [16, 8, 4, 2, 1] as const
const CONCURRENCY = 6
/** Decoded frames kept around the playhead (a 1600×900 frame is ~5.8 MB decoded). */
const CACHE = 18

const pad = (i: number) => String(i).padStart(4, '0')

/**
 * A pre-rendered cinematic flight, played by the scroll: the frames of `public/film/<name>/` are
 * scrubbed on a sticky canvas behind the beats it wraps (forward and back, at any speed). The
 * beats' own stills stay until the first frame is on screen, and wherever the film can't run
 * (no manifest yet, reduced motion, Save-Data, 2G), so nothing ever waits on it.
 *
 * Loading: compressed frames stream coarse-to-fine; only a small window around the playhead is
 * ever decoded (off the main thread, via createImageBitmap), so memory stays flat.
 */
export function ScrollFilm({
  name,
  range = [0, 1],
  className,
  children,
}: {
  name: string
  /** The part of the wrapper's scroll that plays the film; the rest holds the first or last frame. */
  range?: [number, number]
  className?: string
  children: ReactNode
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const root = wrap.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d', { alpha: false })
    if (!root || !canvas || !ctx) return
    const nav = navigator as Nav
    if (nav.connection?.saveData || /2g$/.test(nav.connection?.effectiveType ?? '')) return

    let dead = false
    let manifest: Manifest | null = null
    let variant: Variant | null = null
    let blobs: (Blob | null)[] = []
    const bitmaps = new Map<number, ImageBitmap>()
    const decoding = new Set<number>()
    let target = 0
    let shown = -1
    let pS = 0
    let primed = false
    let visible = false
    let started = false
    let unsub: (() => void) | null = null
    let pVar = ''
    const attr = `data-film-${name}`
    const [r0, r1] = range

    const pickVariant = (m: Manifest) => {
      const portrait = window.innerHeight > window.innerWidth
      const pool = m.variants.filter((v) => !!v.portrait === portrait)
      return (pool.length ? pool : m.variants)[0] ?? null
    }

    // ── Loading ──────────────────────────────────────────────────────────────────────────
    const load = async () => {
      try {
        const res = await fetch(`/film/${name}/manifest.json`, { cache: 'force-cache' })
        if (!res.ok) return // no film yet: the stills stay
        manifest = (await res.json()) as Manifest
      } catch {
        return
      }
      if (dead || !manifest) return
      variant = pickVariant(manifest)
      if (!variant) return
      const n = manifest.frames
      blobs = new Array(n).fill(null)
      const queue: number[] = []
      const seen = new Set<number>()
      for (const s of STRIDES)
        for (let i = 0; i < n; i += s)
          if (!seen.has(i)) {
            seen.add(i)
            queue.push(i)
          }
      if (!seen.has(n - 1)) queue.splice(1, 0, n - 1)
      const v = variant
      const worker = async () => {
        while (!dead && queue.length) {
          const i = queue.shift()!
          try {
            const r = await fetch(`/film/${name}/${v.id}/${pad(i)}.${v.ext}`)
            if (r.ok) blobs[i] = await r.blob()
          } catch {
            /* a missing frame is skipped: neighbours cover it */
          }
          if (i === 0 || shown < 0) wake()
        }
      }
      await Promise.all(Array.from({ length: CONCURRENCY }, worker))
    }

    // ── Decoding and drawing ─────────────────────────────────────────────────────────────
    const decode = (i: number) => {
      const b = blobs[i]
      if (!b || bitmaps.has(i) || decoding.has(i)) return
      decoding.add(i)
      createImageBitmap(b)
        .then((bmp) => {
          decoding.delete(i)
          if (dead) return bmp.close()
          bitmaps.set(i, bmp)
          // Keep only the window around the playhead.
          if (bitmaps.size > CACHE) {
            let far = -1
            let farD = -1
            for (const k of bitmaps.keys()) {
              const d = Math.abs(k - target)
              if (d > farD) {
                farD = d
                far = k
              }
            }
            bitmaps.get(far)?.close()
            bitmaps.delete(far)
          }
          wake()
        })
        .catch(() => decoding.delete(i))
    }

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const w = Math.round(canvas.clientWidth * dpr)
      const h = Math.round(canvas.clientHeight * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        shown = -1
      }
    }

    const draw = (bmp: ImageBitmap, alpha = 1) => {
      const cw = canvas.width
      const ch = canvas.height
      const s = Math.max(cw / bmp.width, ch / bmp.height) // cover
      const w = bmp.width * s
      const h = bmp.height * s
      ctx.globalAlpha = alpha
      ctx.drawImage(bmp, (cw - w) / 2, (ch - h) / 2, w, h)
      ctx.globalAlpha = 1
    }

    const loadedAt = (i: number, step: 1 | -1) => {
      for (let j = i; j >= 0 && j < blobs.length; j += step) if (blobs[j]) return j
      return -1
    }

    const progress = () => {
      const r = root.getBoundingClientRect()
      const span = Math.max(1, r.height - window.innerHeight)
      return Math.min(1, Math.max(0, -r.top / span))
    }

    const tick = (_t: number, dt: number) => {
      if (!manifest || !blobs.length) return
      const p = progress()
      if (!primed) {
        pS = p
        primed = true
      } else {
        pS = damp(pS, p, 10, dt)
        if (Math.abs(pS - p) > 1e-4) wake(200)
        else pS = p
      }
      // Scroll progress for the beats' own effects (CSS: var(--film-p)).
      const pv = pS.toFixed(4)
      if (pv !== pVar) root.style.setProperty('--film-p', (pVar = pv))
      const n = blobs.length
      const f = Math.min(1, Math.max(0, (pS - r0) / Math.max(1e-3, r1 - r0)))
      const ft = f * (n - 1)
      target = Math.round(ft)
      // The loaded frames either side of the playhead: between neighbours, cross-fade (the scrub
      // reads as continuous motion, not steps); across a gap still streaming, show the nearer.
      let lo = loadedAt(Math.floor(ft), -1)
      let hi = loadedAt(Math.ceil(ft), 1)
      if (lo < 0 && hi < 0) return
      if (lo < 0) lo = hi
      if (hi < 0) hi = lo
      let mix = hi > lo ? (ft - lo) / (hi - lo) : 0
      if (hi - lo > 2) {
        if (mix < 0.5) hi = lo
        else lo = hi
        mix = 0
      }
      // Decode ahead in the direction of travel.
      const dir = p >= pS ? 1 : -1
      decode(lo)
      decode(hi)
      for (let k = -2; k <= 5; k++) {
        const j = loadedAt(Math.min(n - 1, Math.max(0, target + k * dir)), dir === 1 ? 1 : -1)
        if (j >= 0) decode(j)
      }
      const a = bitmaps.get(lo)
      const b = bitmaps.get(hi)
      if (!a) return
      size()
      const q = b && hi !== lo ? Math.round(mix * 24) : 0
      const key = lo * 4096 + hi * 32 + q
      if (key !== shown) {
        draw(a)
        if (q && b) draw(b, q / 24)
        shown = key
        if (!root.hasAttribute('data-on')) {
          root.setAttribute('data-on', '')
          document.documentElement.setAttribute(attr, '')
        }
      }
    }

    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting
      if (visible) {
        unsub ??= subscribe(tick)
        wake()
      } else {
        unsub?.()
        unsub = null
      }
    })

    const begin = () => {
      if (started || dead || isReducedMotion()) return
      started = true
      void load()
      io.observe(root)
    }
    // After the page's own load (the stills are the LCP), or at the first scroll.
    const onInput = () => begin()
    if (document.readyState === 'complete') begin()
    else window.addEventListener('load', begin, { once: true })
    window.addEventListener('scroll', onInput, { once: true, passive: true })
    const onResize = () => {
      shown = -1
      wake()
    }
    window.addEventListener('resize', onResize)
    const unsubPref = subscribeMotionPref(() => {
      if (isReducedMotion()) {
        root.removeAttribute('data-on')
        document.documentElement.removeAttribute(attr)
      }
      else begin()
    })

    return () => {
      dead = true
      unsub?.()
      io.disconnect()
      unsubPref()
      window.removeEventListener('load', begin)
      window.removeEventListener('scroll', onInput)
      window.removeEventListener('resize', onResize)
      for (const b of bitmaps.values()) b.close()
      bitmaps.clear()
      root.removeAttribute('data-on')
      document.documentElement.removeAttribute(attr)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the range is a static literal
  }, [name])

  return (
    <div ref={wrap} className={className ? `film ${className}` : 'film'} data-film={name}>
      <div className="film-stage" aria-hidden="true">
        <canvas ref={canvasRef} className="film-canvas" />
      </div>
      {children}
    </div>
  )
}
