import type { CSSProperties } from 'react'
import { camps, pages } from '@/lib/site'
import '@/components/method/glance.css'

const pad = (n: number) => String(n).padStart(2, '0')

// The /method elevation profile (components/method/RouteGlance), drawn statically again here:
// the same 1000×220 box, ridge and route, with a pin over the centre of each week's column.
const CAMP_PTS: [number, number][] = [
  [100, 176],
  [300, 142],
  [500, 108],
  [700, 72],
  [900, 30],
]
const ROUTE = 'M0 206 C40 200 70 184 100 176 S220 150 300 142 S430 118 500 108 S640 84 700 72 S850 44 900 30'
const RIDGE = `${ROUTE} L940 34 L1000 60 L1000 220 L0 220 Z`
const FAR = 'M0 150 C120 120 180 140 260 110 S420 80 520 92 S700 40 800 58 S940 10 1000 40 L1000 220 L0 220 Z'

/**
 * The Summit Route Cohort's curriculum: five live weeks, one camp a week. On wide screens
 * the route profile sits over five week columns; phones get a vertical trail.
 */
export function Curriculum() {
  const week = pages.community.week
  return (
    <div className="cm-cur">
      <div className="mg-profile cm-cur-profile reveal" aria-hidden="true">
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
      <ol className="cm-weeks" aria-label={pages.community.cohortName}>
        {camps.map((c, i) => (
          <li key={c.id} className="cm-week reveal" style={{ '--hue': c.hue, '--i': i } as CSSProperties}>
            <span className="cm-week-dot" aria-hidden="true" />
            <span className="cm-week-k t-label tnum">
              {week} {pad(c.n)} · {c.name}
            </span>
            <span className="cm-week-t">{c.title}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
