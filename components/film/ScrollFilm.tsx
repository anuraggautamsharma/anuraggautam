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
export function ScrollFilm({ name, children }: { name: string; children: ReactNode }) {
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
    const attr = `data-film-${name}`

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
    const nearestLoaded = (i: number) => {
      const n = blobs.length
      for (let d = 0; d < n; d++) {
        if (i - d >= 0 && blobs[i - d]) return i - d
        if (i + d < n && blobs[i + d]) return i + d
      }
      return -1
    }

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

    const draw = (bmp: ImageBitmap) => {
      const cw = canvas.width
      const ch = canvas.height
      const s = Math.max(cw / bmp.width, ch / bmp.height) // cover
      const w = bmp.width * s
      const h = bmp.height * s
      ctx.drawImage(bmp, (cw - w) / 2, (ch - h) / 2, w, h)
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
      const n = blobs.length
      target = Math.round(pS * (n - 1))
      const at = nearestLoaded(target)
      if (at < 0) return
      // Decode ahead in the direction of travel.
      const dir = p >= pS ? 1 : -1
      for (let k = -2; k <= 4; k++) {
        const j = nearestLoaded(Math.min(n - 1, Math.max(0, target + k * dir)))
        if (j >= 0) decode(j)
      }
      const bmp = bitmaps.get(at)
      if (!bmp) return
      size()
      if (at !== shown) {
        draw(bmp)
        shown = at
        if (!document.documentElement.hasAttribute(attr)) document.documentElement.setAttribute(attr, '')
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
      if (isReducedMotion()) document.documentElement.removeAttribute(attr)
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
      document.documentElement.removeAttribute(attr)
    }
  }, [name])

  return (
    <div ref={wrap} className="film" data-film={name}>
      <div className="film-stage" aria-hidden="true">
        <canvas ref={canvasRef} className="film-canvas" />
      </div>
      {children}
    </div>
  )
}
