// State shared by the route stage (DOM, first-load) and the lazy WebGL scene. Three-free.

// v2: performance no longer turns the map off, so flags left by the old governor are ignored.
export const SESSION_OFF = 'ag-topo-off-v2'

/** sessionStorage can throw (privacy modes, blocked storage); never let it break the page. */
export function isTopoDisabled() {
  try {
    return sessionStorage.getItem(SESSION_OFF) === '1'
  } catch {
    return false
  }
}

/** Retreat to the SVG map for the rest of this session (context loss, governor, init failure). */
export function disableTopo() {
  try {
    sessionStorage.setItem(SESSION_OFF, '1')
  } catch {
    // Storage blocked: the retreat still holds for this page view.
  }
}

export type RouteDom = {
  section: HTMLElement
  stage: HTMLElement
  /** The plane that carries the poster and the pins (their offsetParent). */
  plane: HTMLElement
  pins: HTMLElement[]
  head: HTMLElement | null
}

/** The plane's box in stage px and its frame (map units), measured on resize by RouteStage. */
export type PlaneLayout = { x: number; y: number; w: number; h: number; fx: number; fy: number; fw: number; fh: number }

/**
 * Written by RouteStage once per frame, read by the scene in the same frame (the shared loop
 * runs subscribers before the engine). `rev` changes whenever p or uS moved.
 */
export const routeState = {
  /** Pinned progress through the section, 0–1. */
  p: 0,
  /** Damped route progress (what is drawn). */
  uS: 0,
  active: -1,
  rev: 0,
  /** True while the WebGL map is on screen and owns pin and route-head placement. */
  gl: false,
  dom: null as RouteDom | null,
  layout: { x: 0, y: 0, w: 1, h: 1, fx: 0, fy: 0, fw: 1000, fh: 1000 } as PlaneLayout,
}

/**
 * `?topo-debug` on any page with the route map: a corner readout of what the 3D map is doing on
 * this machine (GPU, pixel ratio, quality step, frame time, or why it is off). Nothing otherwise.
 */
export function topoDebug(line: string) {
  if (typeof window === 'undefined' || !/[?&]topo-debug\b/.test(window.location.search)) return
  let el = document.getElementById('topo-debug')
  if (!el) {
    el = document.createElement('pre')
    el.id = 'topo-debug'
    el.style.cssText =
      'position:fixed;left:8px;bottom:8px;z-index:9999;margin:0;padding:8px 10px;max-width:46ch;white-space:pre-wrap;font:11px/1.4 ui-monospace,monospace;background:rgb(14 29 21/.88);color:#F7F2E8;pointer-events:none'
    document.body.appendChild(el)
  }
  el.textContent = line
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced')
