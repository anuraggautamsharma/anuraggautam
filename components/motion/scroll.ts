// Cached section geometry so scroll progress never forces layout inside the frame loop.

type Box = { top: number; height: number }
const boxes = new WeakMap<Element, Box>()
let ro: ResizeObserver | null = null
const tracked = new Set<Element>()

function measure(el: Element) {
  const r = el.getBoundingClientRect()
  boxes.set(el, { top: r.top + window.scrollY, height: r.height })
}

function remeasureAll() {
  for (const el of tracked) measure(el)
}

export function track(el: Element) {
  if (typeof window === 'undefined') return () => {}
  if (!ro) {
    ro = new ResizeObserver(remeasureAll)
    ro.observe(document.documentElement)
    document.fonts?.ready.then(remeasureAll)
    window.addEventListener('load', remeasureAll, { once: true })
  }
  tracked.add(el)
  ro.observe(el)
  measure(el)
  return () => {
    tracked.delete(el)
    ro?.unobserve(el)
  }
}

/** 0 when the element's top reaches the top of the viewport, 1 when its bottom reaches the bottom. */
export function pinnedProgress(el: Element, scrollY: number) {
  const b = boxes.get(el)
  if (!b) return 0
  const span = Math.max(1, b.height - window.innerHeight)
  const p = (scrollY - b.top) / span
  return p < 0 ? 0 : p > 1 ? 1 : p
}

/** 0 when the element enters at the bottom of the viewport, 1 when it leaves at the top. */
export function passProgress(el: Element, scrollY: number) {
  const b = boxes.get(el)
  if (!b) return 0
  const p = (scrollY + window.innerHeight - b.top) / (b.height + window.innerHeight)
  return p < 0 ? 0 : p > 1 ? 1 : p
}

export function box(el: Element) {
  return boxes.get(el)
}
