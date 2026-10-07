'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { motion, subscribe } from '@/components/motion/loop'
import { pinnedProgress, track } from '@/components/motion/scroll'
import { isReducedMotion, subscribeMotionPref } from '@/components/layout/motionPref'

const DESKTOP = '(min-width: 64rem)'
const ARRIVE = 0.9

/**
 * The pinned horizontal trail (Expeditions, desktop + full motion only). The page scrolls
 * vertically as normal; while the sticky stage is pinned, the card track translates by
 * min(1, p / 0.9) · (trackWidth − stageWidth): it arrives early and rests. CSS sizes the section from the same geometry before JS
 * runs; this island then writes the measured overshoot as --ex-extra. The same p drives
 * the 01 / 04 counter and its progress bar (one loop.ts subscriber, no rAF of its own).
 * Phones: the counter follows the card in view (an IntersectionObserver on the row).
 */
export function ExpeditionTrack({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stage = ref.current
    const section = stage?.closest('section')
    const rail = stage?.querySelector<HTMLElement>('.ex-track')
    const vp = stage?.querySelector<HTMLElement>('.ex-viewport')
    if (!stage || !section || !rail || !vp) return
    const counter = stage.querySelector<HTMLElement>('[data-ex-count]')
    const bar = stage.querySelector<HTMLElement>('[data-ex-bar]')
    const desktop = window.matchMedia(DESKTOP)
    const cards = Array.from(rail.children) as HTMLElement[]
    const count = cards.length

    let dist = 0
    let visible = false
    let warmed = false
    let lastX = Number.NaN
    let lastP = Number.NaN
    let lastIdx = -1
    let unsub: (() => void) | null = null

    const pinned = () => desktop.matches && !isReducedMotion() && document.documentElement.hasAttribute('data-js')

    const setIdx = (idx: number) => {
      if (idx === lastIdx) return
      lastIdx = idx
      if (counter) counter.textContent = String(idx + 1).padStart(2, '0')
    }
    const setBar = (p: number) => {
      if (p === lastP) return
      lastP = p
      if (bar) bar.style.transform = `scaleX(${p})`
    }

    const measure = () => {
      if (!pinned()) {
        dist = 0
        section.style.removeProperty('--ex-extra')
        return
      }
      const last = rail.lastElementChild as HTMLElement | null
      if (!last) return
      const padEnd = parseFloat(getComputedStyle(rail).paddingRight) || 0
      dist = Math.max(0, Math.round(last.offsetLeft + last.offsetWidth + padEnd - stage.clientWidth))
      section.style.setProperty('--ex-extra', `${dist}px`)
    }

    const frame = () => {
      // The trail arrives at 90% of the pinned scroll and rests for the last 10%, so the
      // final frame before the unpin is cards 3–4 at rest, never a sliver of card 2.
      const p = Math.min(1, pinnedProgress(section, motion.scrollY) / ARRIVE)
      const x = Math.round(-p * dist * 10) / 10
      if (x !== lastX) {
        rail.style.transform = `translate3d(${x}px,0,0)`
        lastX = x
      }
      setBar(Math.round(p * 1000) / 1000)
      setIdx(Math.min(count - 1, Math.round(p * (count - 1))))
    }

    const sync = () => {
      measure()
      const on = pinned()
      // Focusable only where it scrolls: the mobile snap row.
      vp.tabIndex = desktop.matches ? -1 : 0
      if (!on) {
        rail.style.transform = ''
        lastX = Number.NaN
      }
      if (on && visible) {
        frame()
        unsub ??= subscribe(frame)
      } else if (unsub) {
        unsub()
        unsub = null
      }
    }

    const untrack = track(section)
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = !!entry?.isIntersecting
        if (visible && !warmed) {
          // The whole trail is about to slide past: fetch every card photo now.
          warmed = true
          rail.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((img) => {
            img.loading = 'eager'
          })
        }
        sync()
      },
      { rootMargin: '25% 0px' },
    )
    io.observe(section)

    // Phones and tablets: the card that fills most of the row sets the counter and bar.
    const ratios = new Map<Element, number>()
    const cardIo = new IntersectionObserver(
      (entries) => {
        if (desktop.matches) return
        for (const e of entries) ratios.set(e.target, e.isIntersecting ? e.intersectionRatio : 0)
        let best = -1
        let bestRatio = 0
        cards.forEach((c, i) => {
          const r = ratios.get(c) ?? 0
          if (r >= 0.6 && r > bestRatio) {
            best = i
            bestRatio = r
          }
        })
        if (best < 0) return
        setIdx(best)
        setBar(count > 1 ? best / (count - 1) : 1)
      },
      { root: vp, threshold: [0.6, 0.8, 1] },
    )
    cards.forEach((c) => cardIo.observe(c))

    const ro = new ResizeObserver(() => measure())
    ro.observe(stage)
    ro.observe(rail)
    desktop.addEventListener('change', sync)
    const offPref = subscribeMotionPref(sync)
    sync()

    return () => {
      io.disconnect()
      cardIo.disconnect()
      ro.disconnect()
      desktop.removeEventListener('change', sync)
      offPref()
      unsub?.()
      untrack()
      rail.style.transform = ''
      if (bar) bar.style.transform = ''
      section.style.removeProperty('--ex-extra')
    }
  }, [])

  return (
    <div ref={ref} className="ex-stage">
      {children}
    </div>
  )
}
