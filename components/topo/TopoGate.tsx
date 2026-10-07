'use client'
'use no memo'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MOTION_EVENT } from '@/components/layout/motionPref'
import { disableTopo, isTopoDisabled, prefersReducedMotion } from './topo-state'

// The only 3D code in the first-load bundle: this gate and a dynamic import. three, R3F and
// the scene load only after every check passes.
const TopoScene = dynamic(() => import('./TopoScene'), { ssr: false })

type Phase = 'gate' | 'boot' | 'live' | 'off'
type Nav = Navigator & { connection?: { saveData?: boolean; effectiveType?: string }; deviceMemory?: number }
type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number
  cancelIdleCallback?: (id: number) => void
}

/** The stage layout the 3D map is drawn for: a desktop viewport with a precise pointer. */
const DESKTOP = '(min-width: 64rem) and (pointer: fine)'

/** No reduced motion (OS or site toggle), no Save-Data or 2G, ≥ 4 GB when reported, WebGL2, not retreated. */
function can3D() {
  if (typeof window === 'undefined' || isTopoDisabled() || prefersReducedMotion()) return false
  if (!window.matchMedia(DESKTOP).matches) return false
  const nav = navigator as Nav
  if (nav.connection?.saveData) return false
  if (/2g$/.test(nav.connection?.effectiveType ?? '')) return false
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory < 4) return false
  return typeof WebGL2RenderingContext !== 'undefined'
}

/**
 * Upgrades the route poster to the WebGL map once the section is within 1.5 viewports,
 * the page has loaded and gone idle (or the visitor has interacted), and the device can
 * take it. Retreats on reduced motion, a narrow viewport, or any failure (for the session).
 */
export function TopoGate() {
  const [phase, setPhase] = useState<Phase>('gate')
  const [epoch, setEpoch] = useState(0)
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const marker = useRef<HTMLSpanElement>(null)
  const phaseRef = useRef(phase)
  useEffect(() => {
    phaseRef.current = phase
  })

  // Gate: capability + the beat within 1.5 viewports + (load and idle, or the first input).
  useEffect(() => {
    if (phase !== 'gate' || !can3D()) return
    const track = marker.current?.closest('[data-route-track]')
    if (!track) return
    let near = false
    let ready = false
    let done = false
    const cleanups: (() => void)[] = []
    const stop = () => {
      done = true
      for (const f of cleanups) f()
    }
    const go = () => {
      if (done || !near || !ready) return
      stop()
      if (can3D()) setPhase('boot')
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          near = true
          go()
        }
      },
      { rootMargin: '150% 0px' },
    )
    io.observe(track)
    cleanups.push(() => io.disconnect())

    const onReady = () => {
      ready = true
      go()
    }
    const inputs = ['pointermove', 'wheel', 'touchstart', 'keydown'] as const
    for (const t of inputs) window.addEventListener(t, onReady, { once: true, passive: true })
    cleanups.push(() => inputs.forEach((t) => window.removeEventListener(t, onReady)))

    const w = window as IdleWindow
    const afterLoad = () => {
      if (done) return
      if (w.requestIdleCallback) {
        const id = w.requestIdleCallback(onReady, { timeout: 2000 })
        cleanups.push(() => w.cancelIdleCallback?.(id))
      } else {
        const id = window.setTimeout(onReady, 1200) // Safari: no requestIdleCallback
        cleanups.push(() => clearTimeout(id))
      }
    }
    if (document.readyState === 'complete') afterLoad()
    else {
      window.addEventListener('load', afterLoad, { once: true })
      cleanups.push(() => window.removeEventListener('load', afterLoad))
    }
    return stop
  }, [phase, epoch])

  // Live conditions: the motion toggle, the OS setting, the viewport or the pointer can change.
  useEffect(() => {
    const onChange = () => {
      const ok = !isTopoDisabled() && !prefersReducedMotion() && window.matchMedia(DESKTOP).matches
      if (!ok) setPhase('off')
      else if (phaseRef.current === 'off') {
        setPhase('gate')
        setEpoch((e) => e + 1)
      }
    }
    const queries = ['(prefers-reduced-motion: reduce)', DESKTOP].map((q) => window.matchMedia(q))
    for (const mq of queries) mq.addEventListener('change', onChange)
    window.addEventListener(MOTION_EVENT, onChange)
    return () => {
      for (const mq of queries) mq.removeEventListener('change', onChange)
      window.removeEventListener(MOTION_EVENT, onChange)
    }
  }, [])

  const onLive = useCallback(() => setPhase('live'), [])
  const onRetreat = useCallback((permanent: boolean) => {
    if (permanent) disableTopo()
    setPhase('off')
  }, [])

  const on = phase === 'boot' || phase === 'live'
  return (
    <>
      <span ref={marker} hidden />
      {on ? <canvas ref={setCanvas} /> : null}
      {on && canvas ? <TopoScene canvas={canvas} onLive={onLive} onRetreat={onRetreat} /> : null}
    </>
  )
}
