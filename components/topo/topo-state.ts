// State shared by the route stage (DOM, first-load) and the lazy WebGL scene. Three-free.

export const SESSION_OFF = 'ag-topo-off'

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

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced')
