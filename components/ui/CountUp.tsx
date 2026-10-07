'use client'

import { useEffect, useRef } from 'react'
import { subscribe } from '@/components/motion/loop'
import { isReducedMotion } from '@/components/layout/motionPref'
import './count-up.css'

export type CountFormat = 'money-m' | 'plus' | 'plain'

const DURATION = 1200
const NUM = /\d[\d,]*(?:\.\d+)?/
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Re-renders `final` with its number replaced by `n`, so "~$4M" counts as "~$0M" … "~$4M". */
function render(final: string, n: number, format: CountFormat) {
  const match = final.match(NUM)
  if (!match) return final
  const grouped = format === 'plain' && match[0].includes(',')
  const value = grouped ? Math.round(n).toLocaleString('en-US') : String(Math.round(n))
  return final.replace(NUM, value)
}

/**
 * Counts a stat up from 0 when its sign (or card) is 40% in view. The real value is always
 * the element's text (SSR and after hydration); the counting digits are a ::after overlay.
 */
export function CountUp({ to, final, format }: { to: number; final: string; format: CountFormat }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || isReducedMotion()) return
    const target = el.closest('.signpost, [data-count-root]') ?? el
    let unsub: (() => void) | undefined
    el.style.setProperty('--cu-color', getComputedStyle(el).color)
    el.dataset.n = render(final, 0, format)
    el.dataset.counting = ''

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        io.disconnect()
        const t0 = performance.now()
        unsub = subscribe((t) => {
          const k = Math.min(1, (t - t0) / DURATION)
          el.dataset.n = render(final, to * inOut(k), format)
          if (k >= 1) {
            delete el.dataset.counting
            unsub?.()
            unsub = undefined
          }
        })
      },
      { threshold: 0.4 },
    )
    io.observe(target)
    return () => {
      io.disconnect()
      unsub?.()
      delete el.dataset.counting
    }
  }, [to, final, format])

  return (
    <span ref={ref} className="tnum cu">
      {final}
    </span>
  )
}
