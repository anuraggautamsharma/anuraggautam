'use client'

import { useEffect, useRef } from 'react'
import { motion, subscribe } from '@/components/motion/loop'
import { box, track } from '@/components/motion/scroll'

/**
 * 3px sunrise reading-progress bar across the top, above the nav. Render it as a direct child of the
 * reading grid: where CSS scroll-driven animations exist it runs on the article's view
 * timeline with no JS at all; elsewhere a loop subscriber scales it, only while the
 * article is on screen.
 */
export function ReadingProgress() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bar = ref.current
    const article = bar?.parentElement
    if (!bar || !article) return
    if (typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()')) return

    const untrack = track(article)
    let unsubscribe: (() => void) | null = null
    let last = -1

    // Same range as the CSS version (contain 0% → 100%): from the article's top reaching the
    // top of the viewport to its bottom reaching the bottom.
    const frame = (y: number) => {
      const b = box(article)
      if (!b) return
      const span = Math.max(1, b.height - window.innerHeight)
      const p = Math.min(1, Math.max(0, (y - b.top) / span))
      if (Math.abs(p - last) < 0.0005) return
      last = p
      bar.style.transform = `scaleX(${p})`
    }

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !unsubscribe) unsubscribe = subscribe(() => frame(motion.scrollY))
      else if (!entry.isIntersecting && unsubscribe) {
        unsubscribe()
        unsubscribe = null
      }
    })
    io.observe(article)

    return () => {
      io.disconnect()
      unsubscribe?.()
      untrack()
    }
  }, [])

  return <div ref={ref} className="wr-progress" aria-hidden="true" />
}
