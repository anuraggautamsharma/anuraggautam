// Colour theme, shared by the header switch, the head script and the canvases (route 3D).
// html[data-theme] is 'light' or 'dark'. An explicit choice is stored in localStorage
// 'ag-theme'; with none, the theme follows the system setting, live.

import { wake } from '@/components/motion/loop'

export type Theme = 'light' | 'dark'
export const THEME_EVENT = 'ag-theme-change'
export const THEME_KEY = 'ag-theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

export function getTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

function stored(): Theme | null {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === 'dark' || v === 'light' ? v : null
  } catch {
    return null
  }
}

function apply(t: Theme) {
  const d = document.documentElement
  if (d.dataset.theme === t) return
  // Swap without every transition on the page firing at once.
  d.setAttribute('data-theme-switching', '')
  d.dataset.theme = t
  window.dispatchEvent(new Event(THEME_EVENT))
  wake(1500) // canvases (the route map) ease into the new light
  requestAnimationFrame(() => requestAnimationFrame(() => d.removeAttribute('data-theme-switching')))
}

export function setTheme(t: Theme) {
  try {
    localStorage.setItem(THEME_KEY, t)
  } catch {
    // Storage blocked: the switch still works for this page view.
  }
  apply(t)
}

/** Calls `cb` on any theme change: the switch, or the system setting while no choice is stored. */
export function subscribeTheme(cb: () => void) {
  const mq = window.matchMedia(DARK_QUERY)
  const onSystem = () => {
    if (!stored()) apply(mq.matches ? 'dark' : 'light')
  }
  mq.addEventListener('change', onSystem)
  window.addEventListener(THEME_EVENT, cb)
  return () => {
    mq.removeEventListener('change', onSystem)
    window.removeEventListener(THEME_EVENT, cb)
  }
}
