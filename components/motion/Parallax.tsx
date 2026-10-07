'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { motion, subscribe } from './loop'
import { box, passProgress, track } from './scroll'
import { isReducedMotion, subscribeMotionPref } from '@/components/layout/motionPref'

const DRIFT = 0.04 // ±4% of the element's height, the view() drift fallback
const CAP = 0.12 // parallax never travels more than 12% of the stage height

const supportsViewTimeline = () => typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()')

/**
 * Transform-only photo depth. `[data-parallax="0.15"]` moves at (1 − 0.15)× scroll, i.e.
 * slower than the page, capped at 12% of its stage. `[data-drift]` is CSS view() where
 * supported; this is its fallback. Halved below 40rem, off under reduced motion. Only
 * elements currently in view are written, and only while the loop is awake.
 */
export function Parallax() {
  const pathname = usePathname()
  useEffect(() => {
    let teardown: (() => void) | null = null

    const setup = () => {
      teardown?.()
      teardown = null
      if (isReducedMotion()) return
      const els = [
        ...document.querySelectorAll<HTMLElement>('[data-parallax]'),
        ...(supportsViewTimeline() ? [] : document.querySelectorAll<HTMLElement>('[data-drift]')),
      ]
      if (!els.length) return

      const visible = new Set<HTMLElement>()
      const stageOf = (el: HTMLElement) => (el.closest('.photo-stage') as HTMLElement | null) ?? el
      const untrack = els.map((el) => track(stageOf(el)))
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement
          if (e.isIntersecting) visible.add(el)
          else visible.delete(el)
        }
      })
      els.forEach((el) => io.observe(el))

      const unsub = subscribe(() => {
        const half = window.innerWidth < 640 ? 0.5 : 1
        for (const el of visible) {
          const stage = stageOf(el)
          const b = box(stage)
          if (!b) continue
          let y: number
          if (el.dataset.parallax) {
            const k = Number(el.dataset.parallax) || 0
            y = Math.min(Math.max(0, motion.scrollY - b.top) * k, b.height * CAP)
          } else {
            y = (passProgress(stage, motion.scrollY) * 2 - 1) * DRIFT * b.height
          }
          el.style.transform = `translate3d(0, ${(y * half).toFixed(1)}px, 0)${el.dataset.parallax ? '' : ' scale(1.08)'}`
        }
      })

      teardown = () => {
        unsub()
        io.disconnect()
        untrack.forEach((u) => u())
        els.forEach((el) => (el.style.transform = ''))
      }
    }

    // Runs per route (the effect re-keys on pathname) and again when the motion preference flips.
    setup()
    const offPref = subscribeMotionPref(setup)
    return () => {
      offPref()
      teardown?.()
    }
  }, [pathname])

  return null
}
