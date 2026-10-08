'use client'
'use no memo' // React Compiler: moves one element imperatively from the shared loop

import { useEffect, useRef } from 'react'
import { damp, motion, subscribe } from './loop'
import { isFinePointer, isReducedMotion, subscribeMotionPref } from '@/components/layout/motionPref'

/**
 * The site's signature: wherever the cursor goes, a little light goes with it. A soft warm glow
 * by day, moonlight by night (it is the same light the living photos answer to). One composited
 * element moved by transform; fine pointers and full motion only.
 */
export function CursorLight() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let x = -999
    let y = -999
    let shown = false
    let unsub: (() => void) | null = null
    const tick = (_t: number, dt: number) => {
      const p = motion.pointer
      if (!p.fine) return
      if (!shown) {
        x = p.x
        y = p.y
        shown = true
        el.setAttribute('data-on', '')
      }
      x = dt ? damp(x, p.x, 14, dt) : p.x
      y = dt ? damp(y, p.y, 14, dt) : p.y
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
    }
    const sync = () => {
      const ok = isFinePointer() && !isReducedMotion()
      if (ok) unsub ??= subscribe(tick)
      else {
        unsub?.()
        unsub = null
        el.removeAttribute('data-on')
        shown = false
      }
    }
    sync()
    const off = subscribeMotionPref(sync)
    const leave = () => el.removeAttribute('data-on')
    const enter = () => shown && el.setAttribute('data-on', '')
    document.documentElement.addEventListener('pointerleave', leave)
    document.documentElement.addEventListener('pointerenter', enter)
    return () => {
      unsub?.()
      off()
      document.documentElement.removeEventListener('pointerleave', leave)
      document.documentElement.removeEventListener('pointerenter', enter)
    }
  }, [])
  return <div ref={ref} className="cursor-light" aria-hidden="true" />
}
