'use client'
'use no memo' // React Compiler: imperative audio graph

import { useEffect, useRef, useState } from 'react'
import type { Ambient } from './ambient'

const KEY = 'ag-sound'

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** How deep the visitor is in the cloud flight (the terrain beat), and in the summit sunrise. */
function story() {
  const vh = window.innerHeight
  const through = (el: Element | null) => {
    if (!el) return 0
    const r = el.getBoundingClientRect()
    return clamp01((vh - r.top) / (r.height + vh))
  }
  const terrain = document.getElementById('terrain')
  const t = through(terrain)
  const clouds = terrain ? Math.sin(Math.PI * t) : 0
  const summitFilm = document.querySelector('.film[data-film="summit"]')
  const s = summitFilm ? clamp01((-summitFilm.getBoundingClientRect().top) / Math.max(1, summitFilm.getBoundingClientRect().height - vh)) : through(document.getElementById('summit'))
  return { clouds, summit: s > 0 ? clamp01((s - 0.25) / 0.3) : 0 }
}

/**
 * Header switch for the soundscape. Off by default; a choice to hear it is remembered, and
 * since browsers only allow sound after a gesture, a returning listener's score resumes on
 * their first tap or key. The engine (components/sound/ambient.ts) loads on first use.
 */
export function SoundToggle({ className }: { className?: string }) {
  const [on, setOn] = useState(false)
  const [waiting, setWaiting] = useState(false) // chosen 'on', waiting for a gesture
  const engine = useRef<Ambient | null>(null)
  const steerTimer = useRef(0)

  const play = async () => {
    if (!engine.current) {
      const { createAmbient } = await import('./ambient')
      engine.current = createAmbient()
    }
    await engine.current.start()
    window.clearInterval(steerTimer.current)
    steerTimer.current = window.setInterval(() => {
      const s = story()
      engine.current?.steer(s.clouds, s.summit)
    }, 200)
  }
  const pause = async () => {
    window.clearInterval(steerTimer.current)
    await engine.current?.stop()
  }

  useEffect(() => {
    let stored = false
    try {
      stored = localStorage.getItem(KEY) === 'on'
    } catch {
      /* storage blocked */
    }
    if (!stored) return
    // Restoring a remembered "on" after mount; the score starts on the first gesture.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is client-only
    setOn(true)
    setWaiting(true)
    const go = () => {
      setWaiting(false)
      void play()
      off()
    }
    const off = () => {
      window.removeEventListener('pointerdown', go)
      window.removeEventListener('keydown', go)
    }
    window.addEventListener('pointerdown', go, { once: true })
    window.addEventListener('keydown', go, { once: true })
    return off
     
  }, [])

  // Quiet while the tab is hidden; back when it returns.
  useEffect(() => {
    const onVis = () => {
      if (!on || waiting) return
      if (document.visibilityState === 'hidden') void pause()
      else void play()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
     
  }, [on, waiting])

  useEffect(
    () => () => {
      window.clearInterval(steerTimer.current)
      engine.current?.dispose()
    },
    [],
  )

  const toggle = () => {
    const next = !on
    setOn(next)
    setWaiting(false)
    try {
      localStorage.setItem(KEY, next ? 'on' : 'off')
    } catch {
      /* storage blocked */
    }
    if (next) void play()
    else void pause()
  }

  return (
    <button
      type="button"
      className={className ? `hd-tool ${className}` : 'hd-tool'}
      aria-pressed={on}
      aria-label={on ? 'Turn sound off' : 'Turn on ambient sound'}
      title={on ? 'Sound off' : 'Ambient sound'}
      data-on={on && !waiting ? '' : undefined}
      onClick={toggle}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="hd-tool-icon hd-sound">
        {/* Five bars: still when off, swaying when the score plays. */}
        {[4, 8, 12, 16, 20].map((x, i) => (
          <rect key={x} x={x - 1} y="6" width="2" height="12" rx="1" fill="currentColor" className="hd-bar-i" style={{ animationDelay: `${i * -0.23}s` }} />
        ))}
      </svg>
    </button>
  )
}
