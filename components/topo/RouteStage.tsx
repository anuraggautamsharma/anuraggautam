'use client'
'use no memo' // React Compiler: this island writes the server-rendered stage imperatively, once per frame

import { useEffect, useRef, useState } from 'react'
import { damp, getLenis, motion, subscribe, wake } from '@/components/motion/loop'
import { box, pinnedProgress, track } from '@/components/motion/scroll'
import { isReducedMotion, isTypingTarget, subscribeMotionPref } from '@/components/layout/motionPref'
import { CAMP_P, TRAILHEAD_MAP, activeCamp, altitudeLabel, routePoint, routeU } from './route'
import { routeState } from './topo-state'

type State = 'done' | 'active' | 'ahead'
/** What the stage needs to know about each camp (passed from the server, so no copy ships twice). */
export type StageCamp = { id: string; n: number; name: string }
type ScrollToOpts = { duration?: number; immediate?: boolean; force?: boolean }
type LenisScroll = { scrollTo?: (target: number, opts?: ScrollToOpts) => void }

/** The nav line HeaderState reads sections at (px from the top). */
const NAV_LINE = 36
const pad = (n: number) => String(n).padStart(2, '0')
const stateOf = (i: number, active: number): State => (i < active ? 'done' : i === active ? 'active' : 'ahead')

/** Scroll mode = JS + full motion (the same test the CSS makes from the first paint). */
const scrollMode = () => !isReducedMotion()

/**
 * Drives Beat 03 in scroll mode: pinned progress → route progress u (eased legs that rest at
 * every camp) → damped uS, written once per frame as --u (on the route layer and the rail,
 * the elements that read it). Sets pin, card and
 * tick states, places the route head (SVG mode; the WebGL scene places it when live), runs
 * the rail and ←/→, couples the header Altimeter, and announces the active camp.
 */
export function RouteStage({ camps }: { camps: readonly StageCamp[] }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [status, setStatus] = useState('')

  useEffect(() => {
    const live = ref.current
    const stage = live?.closest<HTMLElement>('[data-route-stage]')
    const trackEl = stage?.closest<HTMLElement>('[data-route-track]')
    const section = trackEl?.closest<HTMLElement>('section')
    const plane = stage?.querySelector<HTMLElement>('[data-route-plane]')
    if (!stage || !trackEl || !section || !plane) return

    const root = document.documentElement
    const sectionAlt = section.dataset.alt ?? ''
    const pins = Array.from(stage.querySelectorAll<HTMLElement>('[data-route-pin]'))
    const anchors = pins.map((li) => li.querySelector<HTMLAnchorElement>('a[data-camp]'))
    const dots = pins.map((li) => li.querySelector<HTMLElement>('.pin'))
    const cards = Array.from(stage.querySelectorAll<HTMLElement>('[data-route-card]'))
    const ticks = Array.from(stage.querySelectorAll<HTMLElement>('[data-route-tick]'))
    const head = stage.querySelector<HTMLElement>('[data-route-head]')
    const prev = stage.querySelector<HTMLButtonElement>('[data-route-prev]')
    const next = stage.querySelector<HTMLButtonElement>('[data-route-next]')
    // --u goes only where it is read (route strokes, rail). Written on an ancestor of the
    // poster, the inherited change makes the masked map SVG re-render every frame.
    const uTargets = Array.from(stage.querySelectorAll<HTMLElement | SVGElement>('.rm-route, .route-rail'))
    routeState.dom = { section, stage, plane, pins, head }

    // Layout cache (plane box in stage px, frame in map units), refreshed on resize. The scene reads it too.
    const layout = routeState.layout
    let headX = NaN
    let headY = NaN
    const measure = () => {
      layout.x = plane.offsetLeft
      layout.y = plane.offsetTop
      layout.w = plane.offsetWidth || 1
      layout.h = plane.offsetHeight || 1
      const cs = getComputedStyle(plane)
      const read = (k: string, d: number) => {
        const v = parseFloat(cs.getPropertyValue(k))
        return Number.isFinite(v) ? v : d
      }
      layout.fx = read('--fx', 0)
      layout.fy = read('--fy', 0)
      layout.fw = read('--fw', 1000) || 1000
      layout.fh = read('--fh', 1000) || 1000
      // Route strokes stay near their px widths at any plane size (the mobile plane is ×1.35).
      const tilt = matchMedia('(max-width: 63.99rem)').matches ? 1.35 : 1
      plane.style.setProperty('--su', (layout.fw / layout.w / tilt).toFixed(3))
      headX = headY = NaN
    }

    let on = false
    let unsubLoop: (() => void) | null = null
    let untrackEls: (() => void)[] = []
    let io: IntersectionObserver | null = null
    let ro: ResizeObserver | null = null
    let uS = 0
    let primed = false
    let lastU = -1
    let active = -2
    let altLabel = ''
    let wasGl = false
    let pending: { i: number; until: number } | null = null
    const reached = new Set<number>()
    const timers = new Set<number>()

    const setStates = (a: number, announce: boolean) => {
      pins.forEach((_, i) => {
        const s = stateOf(i, a)
        dots[i]?.setAttribute('data-state', s)
        cards[i]?.setAttribute('data-state', s)
        ticks[i]?.setAttribute('data-state', s)
        if (s === 'active') cards[i]?.setAttribute('data-active', '')
        else cards[i]?.removeAttribute('data-active')
      })
      prev?.setAttribute('aria-disabled', String(a <= 0))
      next?.setAttribute('aria-disabled', String(a >= camps.length - 1))
      if (a >= 0 && announce) {
        const c = camps[a]
        if (c) setStatus(`Camp ${pad(c.n)}, ${c.name}`)
      }
      // The first arrival at a camp drops its pin in.
      if (a >= 0 && !reached.has(a)) {
        reached.add(a)
        const el = anchors[a]
        if (el && announce) {
          el.setAttribute('data-drop', '')
          const t = window.setTimeout(() => {
            el.removeAttribute('data-drop')
            timers.delete(t)
          }, 600)
          timers.add(t)
        }
      }
      for (let i = 0; i < a; i++) reached.add(i)
    }

    const placeHead = () => {
      if (!head || routeState.gl) return
      const [x, y] = routePoint(uS)
      const dx = ((x - TRAILHEAD_MAP.x) / layout.fw) * layout.w
      const dy = ((y - TRAILHEAD_MAP.y) / layout.fh) * layout.h
      if (Math.abs(dx - headX) < 0.05 && Math.abs(dy - headY) < 0.05) return
      headX = dx
      headY = dy
      head.style.transform = `translate3d(${dx.toFixed(2)}px,${dy.toFixed(2)}px,0)`
    }

    const writeAlt = () => {
      const s = box(section)
      if (!s) return
      const y = motion.scrollY + NAV_LINE
      if (y < s.top || y >= s.top + s.height) return
      const label = altitudeLabel(uS)
      if (label === altLabel) return
      altLabel = label
      section.dataset.alt = label
      root.dataset.alt = label
    }

    const update = (dt: number) => {
      const p = pinnedProgress(trackEl, motion.scrollY)
      const u = routeU(p)
      if (!primed) {
        uS = u
        primed = true
      } else {
        uS = damp(uS, u, 8, dt)
        if (Math.abs(uS - u) < 1e-4) uS = u
        else wake(300) // still settling after the input stopped
      }
      if (Math.abs(uS - lastU) > 1e-5) {
        lastU = uS
        const v = uS.toFixed(4)
        for (const el of uTargets) el.style.setProperty('--u', v)
        routeState.rev++
      }
      if (p !== routeState.p) {
        routeState.p = p
        routeState.rev++
      }
      routeState.uS = uS
      const a = activeCamp(uS)
      if (a !== active) {
        const announce = active !== -2
        // Climbing up into a new camp rings its bell (components/sound).
        if (announce && a > active && a >= 0) window.dispatchEvent(new CustomEvent('ag-camp', { detail: a }))
        active = a
        routeState.active = a
        setStates(a, announce)
        // The intro (H2 + line) hands off to Camp 01's card once the climb starts.
        section.toggleAttribute('data-started', a >= 0)
      }
      if (wasGl && !routeState.gl) headX = headY = NaN // the scene handed the head back
      wasGl = routeState.gl
      placeHead()
      writeAlt()
    }

    const scrollToCamp = (i: number, instant = false) => {
      const b = box(trackEl)
      if (!b) return
      const span = Math.max(1, b.height - window.innerHeight)
      const y = b.top + span * ((CAMP_P[i] ?? 0) + 0.04)
      const lenis = getLenis() as LenisScroll | null
      if (!instant && typeof lenis?.scrollTo === 'function') lenis.scrollTo(y, { duration: 1.2 })
      else window.scrollTo({ top: y, behavior: instant ? 'auto' : 'smooth' })
      pending = { i, until: performance.now() + 1400 }
      wake()
    }

    const go = (d: number) => {
      const base = pending && performance.now() < pending.until ? pending.i : active
      const target = Math.max(0, Math.min(camps.length - 1, base + d))
      if (target !== base) scrollToCamp(target)
    }

    const onClick = (e: MouseEvent) => {
      if (!on || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const t = e.target as Element | null
      const pin = t?.closest<HTMLAnchorElement>('a[data-camp]')
      if (pin && stage.contains(pin)) {
        e.preventDefault()
        e.stopPropagation() // keep Lenis' anchor handler from scrolling to the card itself
        scrollToCamp(Number(pin.dataset.camp))
        return
      }
      const btn = t?.closest('[data-route-prev], [data-route-next]')
      if (btn && btn.getAttribute('aria-disabled') !== 'true') go(btn.hasAttribute('data-route-next') ? 1 : -1)
    }
    const onKey = (e: KeyboardEvent) => {
      if (!on || e.altKey || e.ctrlKey || e.metaKey || isTypingTarget(e.target)) return
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      go(e.key === 'ArrowRight' ? 1 : -1)
    }
    // "Where are you stuck?" chips (outside the stage): fly the climb to that camp.
    const onGoto = (e: MouseEvent) => {
      if (!on || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest<HTMLElement>('[data-route-goto]')
      if (!a) return
      e.preventDefault()
      e.stopPropagation()
      scrollToCamp(Number(a.dataset.routeGoto))
    }
    document.addEventListener('click', onGoto, true)
    stage.addEventListener('click', onClick)
    stage.addEventListener('keydown', onKey)

    const startLoop = () => {
      unsubLoop ??= subscribe((_t, dt) => update(dt))
    }
    const stopLoop = () => {
      unsubLoop?.()
      unsubLoop = null
    }

    const enter = () => {
      if (on) return
      on = true
      primed = false
      active = -2
      lastU = -1
      for (const el of [trackEl, section]) {
        // scroll.ts tracking isn't reference-counted: only release what we started tracking.
        const ours = !box(el)
        const release = track(el)
        if (ours) untrackEls.push(release)
      }
      measure()
      ro = new ResizeObserver(() => {
        measure()
        wake()
      })
      ro.observe(plane)
      let warmed = false
      io = new IntersectionObserver(
        ([e]) => {
          if (e?.isIntersecting && !warmed) {
            // A screen ahead of the climb: fetch and decode all five 400w plates now, so no
            // camp's photo is still loading when its card wipes in.
            warmed = true
            for (const img of stage.querySelectorAll<HTMLImageElement>('[data-route-card] img[loading="lazy"]')) img.loading = 'eager'
          }
          if (e?.isIntersecting) startLoop()
          else {
            primed = false // settle on the final state before sleeping (e.g. after a jump past the beat)
            update(0)
            stopLoop()
          }
        },
        { rootMargin: '100% 0px' },
      )
      io.observe(trackEl)
      update(0)
      // A deep link to a camp card (#camp-price) lands on that camp's place in the climb.
      const m = /^#camp-([a-z]+)$/.exec(window.location.hash)
      const i = m ? camps.findIndex((c) => c.id === m[1]) : -1
      if (i >= 0) {
        // After the browser's own jump to the card: one tick of the shared loop.
        const un = subscribe(() => {
          un()
          scrollToCamp(i, true)
        })
      }
    }

    const leave = () => {
      if (!on) return
      on = false
      stopLoop()
      io?.disconnect()
      ro?.disconnect()
      io = ro = null
      for (const f of untrackEls) f()
      untrackEls = []
      for (const t of timers) clearTimeout(t)
      timers.clear()
      for (const el of uTargets) el.style.removeProperty('--u')
      plane.style.removeProperty('--su')
      head?.style.removeProperty('transform')
      for (const el of [...dots, ...cards, ...ticks]) el?.removeAttribute('data-state')
      for (const el of cards) el.removeAttribute('data-active')
      section.removeAttribute('data-started')
      for (const el of anchors) el?.removeAttribute('data-drop')
      prev?.removeAttribute('aria-disabled')
      next?.removeAttribute('aria-disabled')
      section.dataset.alt = sectionAlt
      if (altLabel) root.dataset.alt = sectionAlt
      altLabel = ''
      setStatus('')
      routeState.active = -1
    }

    const sync = () => (scrollMode() ? enter() : leave())
    sync()
    const unsubPref = subscribeMotionPref(sync)

    return () => {
      unsubPref()
      leave()
      document.removeEventListener('click', onGoto, true)
      stage.removeEventListener('click', onClick)
      stage.removeEventListener('keydown', onKey)
      if (routeState.dom?.stage === stage) routeState.dom = null
    }
  }, [camps])

  return (
    <p ref={ref} className="sr-only route-status-live" aria-live="polite">
      {status}
    </p>
  )
}
