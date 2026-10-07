import type { CSSProperties, ReactNode } from 'react'

/*
 * The Summit Route as an elevation profile: the same ridge, route and camp points as the
 * /method glance (components/method/RouteGlance), drawn in a 1000×220 box. The walked part
 * of the route is the same path in a second layer, clipped at `walked` (0–900 in box x), so
 * it can grow with a CSS clip-path transition. Pins and the marker are HTML, so they never
 * stretch with the SVG. Decorative: the panel around it carries the meaning in text.
 */
const ROUTE = 'M0 206 C40 200 70 184 100 176 S220 150 300 142 S430 118 500 108 S640 84 700 72 S850 44 900 30'
const RIDGE = `${ROUTE} L940 34 L1000 60 L1000 220 L0 220 Z`
const FAR = 'M0 150 C120 120 180 140 260 110 S420 80 520 92 S700 40 800 58 S940 10 1000 40 L1000 220 L0 220 Z'

/** Route y sampled from the bezier every 50 units of x (0…900). */
const Y = [206, 193, 176, 165, 156, 148, 142, 136, 126, 116, 108, 100, 91, 82, 72, 62, 52, 42, 30]
export const CAMP_X = [100, 300, 500, 700, 900]

export function routeY(x: number) {
  const c = Math.max(0, Math.min(900, x)) / 50
  const i = Math.min(Y.length - 2, Math.floor(c))
  return Y[i] + (Y[i + 1] - Y[i]) * (c - i)
}

const at = (x: number): CSSProperties =>
  ({ '--x': `${x / 10}%`, '--y': `${(routeY(x) / 220) * 100}%` }) as CSSProperties

export type Pin = { id: string; n: number; hue: string; state: string; tag?: string }

export function Profile({ walked, pins, marker }: { walked: number; pins: Pin[]; marker?: ReactNode }) {
  return (
    <div className="sc-prof" aria-hidden="true" style={{ '--walk': `${walked / 10}%` } as CSSProperties}>
      <svg viewBox="0 0 1000 220" preserveAspectRatio="none" className="sc-prof-svg" focusable="false">
        <path d={FAR} className="sc-far" />
        <path d={RIDGE} className="sc-ridge" />
        <path d={ROUTE} className="sc-planned" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="sc-walk">
        <svg viewBox="0 0 1000 220" preserveAspectRatio="none" className="sc-prof-svg" focusable="false">
          <path d={ROUTE} className="sc-casing" vectorEffect="non-scaling-stroke" />
          <path d={ROUTE} className="sc-walked" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      {pins.map((p, i) => (
        <span
          key={p.id}
          className="sc-pin"
          data-state={p.state}
          style={{ ...at(CAMP_X[i]), '--hue': p.hue } as CSSProperties}
        >
          {p.tag ? <span className="sc-pin-tag t-label">{p.tag}</span> : null}
          <span className="sc-pin-head tnum">{String(p.n).padStart(2, '0')}</span>
        </span>
      ))}
      <span className="sc-you" style={at(walked)}>
        {marker}
      </span>
    </div>
  )
}
