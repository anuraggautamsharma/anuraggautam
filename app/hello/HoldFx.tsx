'use client'
'use no memo' // React Compiler: imperative pointer and scroll effects

import { useEffect, useRef, useState } from 'react'

const reduced = () =>
  typeof window === 'undefined' ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
  document.documentElement.dataset.motion === 'reduced'

/** Big numbers that count up the first time they come into view. */
export function HoldStats({ stats }: { stats: { to: number; prefix?: string; suffix?: string; label: string }[] }) {
  const ref = useRef<HTMLDListElement>(null)
  const [p, setP] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el || reduced()) return
     
    setP(0)
    let raf = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / 1600)
        setP(1 - Math.pow(1 - k, 4))
        if (k < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }, { threshold: 0.15 })
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])
  return (
    <dl ref={ref} className="hold-stats">
      {stats.map((s) => {
        const v = s.to * p
        const shown = p >= 1 ? s.to : s.to >= 100 ? Math.round(v) : Math.round(v * 10) / 10
        return (
          <div key={s.label} className="hold-stat">
            <dt className="hold-stat-label">{s.label}</dt>
            <dd className="hold-stat-v">
              {s.prefix}
              {shown}
              {s.suffix}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

/** The email, assembled in the browser so simple scrapers never see it in the HTML. */
export function HoldEmail({ user, domain }: { user: string; domain: string }) {
  const ref = useRef<HTMLAnchorElement>(null)
  useEffect(() => {
    const a = ref.current
    if (!a) return
    const addr = `${user}@${domain}`
    a.href = `mailto:${addr}`
    a.textContent = addr
  }, [user, domain])
  return (
    <a ref={ref} className="hold-link">
      Email
    </a>
  )
}
