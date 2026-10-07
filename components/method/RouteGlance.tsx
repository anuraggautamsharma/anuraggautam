import type { CSSProperties } from 'react'
import { camps, pages } from '@/lib/site'
import { Section } from '@/components/ui/Section'
import { Icon } from '@/components/ui/Icon'
import './glance.css'

const pad = (n: number) => String(n).padStart(2, '0')

/*
 * The route as an elevation profile (the way a trail app draws a climb): one ridge rising
 * left to right, the orange route on its crest, a pin per camp. Each pin sits over the centre
 * of its card's column (10/30/50/70/90%), so the profile and the cards read as one diagram.
 * Coordinates are in a 1000×220 box; pins are HTML so they never stretch with the SVG.
 */
const CAMP_PTS: [number, number][] = [
  [100, 176],
  [300, 142],
  [500, 108],
  [700, 72],
  [900, 30],
]
const ROUTE = 'M0 206 C40 200 70 184 100 176 S220 150 300 142 S430 118 500 108 S640 84 700 72 S850 44 900 30'
// The ridge carries on past the summit and drops away; the route stops at camp 05.
const RIDGE = `${ROUTE} L940 34 L1000 60 L1000 220 L0 220 Z`
const FAR = 'M0 150 C120 120 180 140 260 110 S420 80 520 92 S700 40 800 58 S940 10 1000 40 L1000 220 L0 220 Z'

/** The Summit Route at a glance: the climb as a profile, and what each camp does. */
export function RouteGlance() {
  const copy = pages.method.glance
  return (
    <Section id="glance" tone="paper" alt="2,900 M" className="mg" labelledBy="mg-title">
      <div className="wrap">
        <div className="mg-head">
          <h2 id="mg-title" className="t-h2 mg-title reveal">
            {copy.h2}
          </h2>
          <p className="t-lead mg-line reveal">{copy.line}</p>
        </div>

        <div className="mg-profile reveal" aria-hidden="true">
          <svg viewBox="0 0 1000 220" preserveAspectRatio="none" className="mg-svg" focusable="false">
            <path d={FAR} className="mg-far" />
            <path d={RIDGE} className="mg-ridge" />
            <path d={ROUTE} className="mg-route-casing" vectorEffect="non-scaling-stroke" />
            <path d={ROUTE} className="mg-route" pathLength={1} vectorEffect="non-scaling-stroke" />
          </svg>
          {camps.map((c, i) => (
            <span
              key={c.id}
              className="mg-pin"
              style={
                {
                  '--x': `${CAMP_PTS[i][0] / 10}%`,
                  '--y': `${(CAMP_PTS[i][1] / 220) * 100}%`,
                  '--hue': c.hue,
                  '--i': i,
                } as CSSProperties
              }
            >
              <span className="mg-pin-head tnum">{pad(c.n)}</span>
            </span>
          ))}
        </div>

        <ol className="mg-camps" aria-label="The five camps">
          {camps.map((c, i) => (
            <li key={c.id} className="mg-camp reveal" style={{ '--hue': c.hue, '--i': i } as CSSProperties}>
              <a href={`#${c.id}`} className="mg-card">
                <span className="mg-dot" aria-hidden="true" />
                <span className="mg-label">
                  <span className="tnum">{pad(c.n)}</span> · {c.name}
                </span>
                <span className="mg-camp-title">{c.title}</span>
                <span className="mg-camp-line">{c.line}</span>
                <span className="mg-clears">
                  <span className="mg-clears-k">Clears</span> <s>{c.hazard}</s>
                </span>
                <span className="mg-more" aria-hidden="true">
                  See camp <Icon name="arrow-right" size={16} />
                </span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  )
}
