'use client'
'use no memo' // React Compiler: drives attributes imperatively from the shared loop

import { useEffect, useRef } from 'react'
import { subscribe, wake } from '@/components/motion/loop'

/**
 * Film captions: the lines of a list arrive one at a time as the list's tall track scrolls past,
 * like subtitles in a documentary. The list is the content (no JS, reduced motion: it simply
 * reads top to bottom); this only marks which line is on screen.
 */
export function Captions({ lines, className }: { lines: readonly string[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const items = [...root.querySelectorAll<HTMLElement>('[data-cap]')]
    let at = -2
    let unsub: (() => void) | null = null
    const tick = () => {
      const r = root.getBoundingClientRect()
      const vh = window.innerHeight
      const p = (vh * 0.5 - r.top) / Math.max(1, r.height - vh * 0.2)
      const i = p < 0 ? -1 : Math.min(items.length - 1, Math.floor(p * items.length))
      if (i === at) return
      at = i
      items.forEach((el, k) => {
        el.toggleAttribute('data-on', k === i)
        el.toggleAttribute('data-past', k < i)
      })
    }
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) {
        unsub ??= subscribe(tick)
        wake()
      } else {
        unsub?.()
        unsub = null
      }
    })
    io.observe(root)
    root.setAttribute('data-live', '')
    return () => {
      unsub?.()
      io.disconnect()
    }
  }, [])

  return (
    <div ref={ref} className={className ? `caps ${className}` : 'caps'}>
      <ol className="caps-stage">
        {lines.map((l, i) => (
          <li key={l} data-cap="" className="caps-line" style={{ '--k': i } as React.CSSProperties}>
            {l}
          </li>
        ))}
      </ol>
    </div>
  )
}
