// Motion preference, shared by the chrome islands and the motion runtime.
// Reduced = OS setting OR the footer toggle (html[data-motion="reduced"]).

export const MOTION_EVENT = 'ag-motion-change'
export const MOTION_KEY = 'ag-motion'
const REDUCE_QUERY = '(prefers-reduced-motion: reduce)'
const FINE_QUERY = '(pointer: fine)'

export function osReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia(REDUCE_QUERY).matches
}

export function isReducedMotion() {
  if (typeof window === 'undefined') return true
  return osReducedMotion() || document.documentElement.dataset.motion === 'reduced'
}

export function isFinePointer() {
  return typeof window !== 'undefined' && window.matchMedia(FINE_QUERY).matches
}

/** Calls `cb` whenever the OS setting, the pointer type or the footer toggle changes. */
export function subscribeMotionPref(cb: () => void) {
  const reduce = window.matchMedia(REDUCE_QUERY)
  const fine = window.matchMedia(FINE_QUERY)
  reduce.addEventListener('change', cb)
  fine.addEventListener('change', cb)
  window.addEventListener(MOTION_EVENT, cb)
  return () => {
    reduce.removeEventListener('change', cb)
    fine.removeEventListener('change', cb)
    window.removeEventListener(MOTION_EVENT, cb)
  }
}

/** Flip the footer toggle. `on: false` writes html[data-motion="reduced"]. */
export function setMotion(on: boolean) {
  const d = document.documentElement
  if (on) d.removeAttribute('data-motion')
  else d.setAttribute('data-motion', 'reduced')
  try {
    localStorage.setItem(MOTION_KEY, on ? 'on' : 'off')
  } catch {
    // Storage blocked (private mode): the toggle still works for this page view.
  }
  window.dispatchEvent(new Event(MOTION_EVENT))
}

/** True while focus is in a text field, so single-key shortcuts stay out of the way. */
export function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false
  if (el.isContentEditable) return true
  const tag = el.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type
    return !['button', 'checkbox', 'radio', 'range', 'reset', 'submit', 'color', 'file', 'image'].includes(type)
  }
  return false
}
