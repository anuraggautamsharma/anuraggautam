'use client'

import { useEffect, useRef } from 'react'

/** HH:MM in the given IANA zone. Static HTML renders --:--, the client fills it in. */
export function LocalTime({ timeZone }: { timeZone: string }) {
  const ref = useRef<HTMLTimeElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let fmt: Intl.DateTimeFormat
    try {
      fmt = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false })
    } catch {
      return // invalid zone: keep the placeholder rather than show a wrong time
    }
    const tick = () => {
      const now = new Date()
      el.textContent = fmt.format(now)
      el.dateTime = now.toISOString()
    }
    tick()
    const id = setInterval(tick, 15_000)
    return () => clearInterval(id)
  }, [timeZone])

  return (
    <time ref={ref} className="tnum" suppressHydrationWarning>
      --:--
    </time>
  )
}
