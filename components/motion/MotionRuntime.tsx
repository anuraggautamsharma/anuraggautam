'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import type Lenis from 'lenis'
import { motion, setLenis, subscribe, wake } from './loop'
import { isFinePointer, isReducedMotion, subscribeMotionPref } from '@/components/layout/motionPref'

// Client motion runtime: input telemetry for the shared loop, Lenis (fine pointer + full
// motion only, created after window load) and the scroll reset on route change.

let lenis: Lenis | null = null

/** 'fine' when a precise pointer and full motion are both available, else 'off'. */
type Mode = 'fine' | 'off'
const getMode = (): Mode => (isFinePointer() && !isReducedMotion() ? 'fine' : 'off')
const getServerMode = (): Mode => 'off'

export function MotionRuntime() {
  const mode = useSyncExternalStore(subscribeMotionPref, getMode, getServerMode)
  const pathname = usePathname()

  // Input telemetry for idle detection and pointer-driven effects.
  useEffect(() => {
    let lastX = 0
    let lastT = 0
    let decay: (() => void) | null = null
    const now = () => performance.now()

    const onPointer = (e: PointerEvent) => {
      const t = now()
      const p = motion.pointer
      const dt = t - lastT
      p.vx = dt > 0 && dt < 100 ? (e.clientX - lastX) / dt : 0
      p.x = e.clientX
      p.y = e.clientY
      p.fine = e.pointerType === 'mouse' || e.pointerType === 'pen'
      lastX = e.clientX
      lastT = t
      motion.lastInput = t
      wake() // the shared loop idles 2s after the last input
      // Bleed vx back to 0 once the pointer rests; unsubscribe when settled so the loop can idle.
      decay ??= subscribe((_t, fdt) => {
        if (now() - lastT < 32) return
        p.vx *= Math.exp(-12 * fdt)
        if (Math.abs(p.vx) < 0.001) {
          p.vx = 0
          decay?.()
          decay = null
        }
      })
    }
    const onInput = () => {
      motion.lastInput = now()
      wake()
    }

    // Layout changes (canvas size, cached rects) need a frame or two, but aren't user input.
    const wakeOnly = () => wake()

    const opts = { passive: true } as const
    window.addEventListener('pointermove', onPointer, opts)
    window.addEventListener('pointerdown', onPointer, opts)
    window.addEventListener('wheel', onInput, opts)
    window.addEventListener('keydown', onInput, opts)
    window.addEventListener('touchstart', onInput, opts)
    window.addEventListener('scroll', onInput, opts)
    window.addEventListener('resize', wakeOnly, opts)
    return () => {
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('wheel', onInput)
      window.removeEventListener('keydown', onInput)
      window.removeEventListener('touchstart', onInput)
      window.removeEventListener('scroll', onInput)
      window.removeEventListener('resize', wakeOnly)
      decay?.()
    }
  }, [])

  // Lenis lifecycle: created after 'load', destroyed when motion is switched off.
  useEffect(() => {
    if (mode !== 'fine') return
    let cancelled = false

    const boot = async () => {
      const [{ default: LenisCtor }] = await Promise.all([import('lenis'), import('lenis/dist/lenis.css')])
      if (cancelled || lenis) return
      lenis = new LenisCtor({ lerp: 0.1, autoRaf: false, anchors: true, stopInertiaOnNavigate: true })
      setLenis(lenis)
    }
    const onLoad = () => void boot()

    if (document.readyState === 'complete') onLoad()
    else window.addEventListener('load', onLoad, { once: true })

    return () => {
      cancelled = true
      window.removeEventListener('load', onLoad)
      if (lenis) {
        setLenis(null)
        lenis.destroy()
        lenis = null
      }
    }
  }, [mode])

  // New route: snap Lenis to the top so it doesn't animate from the old position.
  // Hash targets (/method#price) are left to the router's native anchor scroll.
  useEffect(() => {
    if (!lenis || window.location.hash) return
    lenis.scrollTo(0, { immediate: true, force: true })
  }, [pathname])

  return null
}
