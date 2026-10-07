'use client'

import { useEffect, useRef } from 'react'

/**
 * Sets `data-inview` on its parent element while it intersects the viewport, so ambient
 * CSS loops (fog drift, sign sway, the scroll cue) run only while they can be seen.
 * Renders a hidden, empty span.
 */
export function InViewFlag({ margin = '0px' }: { margin?: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const host = ref.current?.parentElement
    if (!host) return
    const io = new IntersectionObserver(
      ([entry]) => {
        host.toggleAttribute('data-inview', !!entry?.isIntersecting)
      },
      { rootMargin: margin },
    )
    io.observe(host)
    return () => {
      io.disconnect()
      host.removeAttribute('data-inview')
    }
  }, [margin])

  return <span ref={ref} hidden />
}
