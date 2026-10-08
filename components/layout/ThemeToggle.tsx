'use client'

import { useId, useSyncExternalStore } from 'react'
import { getTheme, setTheme, subscribeTheme } from './themePref'

const getServer = () => 'light' as const

/** Header switch: day ↔ night. The head script already set the theme before paint. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, getServer)
  const dark = theme === 'dark'
  const mask = `hd-moon-${useId().replace(/:/g, '')}`
  return (
    <button
      type="button"
      className={className ? `hd-tool ${className}` : 'hd-tool'}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Light theme' : 'Dark theme'}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        setTheme(dark ? 'light' : 'dark', { x: r.left + r.width / 2, y: r.top + r.height / 2 })
      }}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="hd-tool-icon">
        {/* The sun sets into a crescent: one shape, its mask slides in. */}
        <mask id={mask}>
          <rect width="24" height="24" fill="#fff" />
          <circle className="hd-moon-bite" cx={dark ? 17 : 30} cy={dark ? 8 : 0} r="7" fill="#000" />
        </mask>
        <circle className="hd-sun-disc" cx="12" cy="12" r={dark ? 8 : 4.5} fill="currentColor" mask={`url(#${mask})`} />
        <g className="hd-sun-rays" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity={dark ? 0 : 1}>
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
        </g>
      </svg>
    </button>
  )
}
