// Colour theme, shared by the header switch, the head script and the canvases (route 3D).
// html[data-theme] is 'light' or 'dark'. An explicit choice is stored in localStorage
// 'ag-theme'; with none, the theme follows the visitor's local time (night 7 pm to 6 am), and
// turns over live if they are still here when the sun sets or rises.

import { wake } from '@/components/motion/loop'

export type Theme = 'light' | 'dark'
export const THEME_EVENT = 'ag-theme-change'
export const THEME_KEY = 'ag-theme'

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

type VT = { ready: Promise<void> }
type Doc = Document & { startViewTransition?: (cb: () => void) => VT }

/**
 * Switch theme. From the header switch, the new light spreads out from the button: a circle
 * that grows to cover the page (a View Transition, so the compositor does it, at any page size).
 */
export function setTheme(t: Theme, from?: { x: number; y: number }) {
  try {
    localStorage.setItem(THEME_KEY, t)
  } catch {
    // Storage blocked: the switch still works for this page view.
  }
  const doc = document as Doc
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || doc.documentElement.dataset.motion === 'reduced'
  if (!from || !doc.startViewTransition || reduced) return apply(t)
  const r = Math.hypot(Math.max(from.x, innerWidth - from.x), Math.max(from.y, innerHeight - from.y))
  const d = doc.documentElement
  d.setAttribute('data-theme-vt', '')
  const vt = doc.startViewTransition(() => apply(t))
  vt.ready
    .then(() => {
      d.animate(
        { clipPath: [`circle(0px at ${from.x}px ${from.y}px)`, `circle(${r}px at ${from.x}px ${from.y}px)`] },
        { duration: 900, easing: 'cubic-bezier(.65, 0, .35, 1)', pseudoElement: '::view-transition-new(root)' },
      )
    })
    .catch(() => {})
  ;(vt as VT & { finished?: Promise<void> }).finished?.finally(() => d.removeAttribute('data-theme-vt'))
}

const byClock = (): Theme => {
  const h = new Date().getHours()
  return h >= 19 || h < 6 ? 'dark' : 'light'
}

/** Calls `cb` on any theme change: the switch, or the hour turning while no choice is stored. */
export function subscribeTheme(cb: () => void) {
  const timer = window.setInterval(() => {
    if (!stored()) apply(byClock())
  }, 60_000)
  window.addEventListener(THEME_EVENT, cb)
  return () => {
    window.clearInterval(timer)
    window.removeEventListener(THEME_EVENT, cb)
  }
}
