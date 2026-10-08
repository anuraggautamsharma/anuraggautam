import type { CSSProperties } from 'react'
import { Section } from '@/components/ui/Section'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { camps, home } from '@/lib/site'
import { RoutePlane, mapVars } from './RouteMapSvg'
import { PROFILE, tw } from './route'
import { RouteStage } from './RouteStage'
import { TopoGate } from './TopoGate'
import { WaypointCard } from './WaypointCard'
import './topo.css'

const stageCamps = camps.map(({ id, n, name }) => ({ id, n, name }))

/** Elevation profile for the rail: progress runs top → bottom, height pushes right. */
const profilePoints = PROFILE.map((h, i) => `${(6 + h * 30).toFixed(1)},${((i / (PROFILE.length - 1)) * 1000).toFixed(1)}`).join(' ')

/**
 * Beat 03, the route. Everything is server-rendered: heading, map poster, pins, rail and all
 * five camp cards (the last one carries the link to /method). CSS picks the layout from the first paint: a flat map and a card grid
 * (no JS, reduced motion), or a sticky stage the route draws across as you scroll, where
 * RouteStage drives progress and TopoGate may upgrade the poster to the 3D map (desktop).
 */
export function RouteSection() {
  const copy = home.route
  return (
    <Section
      id="route"
      tone="paper"
      labelledBy="route-title"
      className="route"
      style={mapVars()}
    >
      <header className="route-head">
        <div className="route-head-in wrap">
          <h2 id="route-title" className="t-h2 route-title reveal">
            {copy.h2}
          </h2>
          {/* Where are you stuck? One tap flies the climb to that camp. */}
          <nav className="route-pick reveal" style={{ '--i': 1 } as CSSProperties} aria-label={copy.line}>
            <p className="route-pick-q">{copy.line}</p>
            <ul>
              {camps.map((c, i) => (
                <li key={c.id}>
                  <a href={`#camp-${c.id}`} className="route-chip" data-route-goto={i}>
                    {c.stuckLabel}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <div className="route-track" data-route-track="">
        <div className="route-stage" data-route-stage="">
          <div className="route-gl" data-topo-canvas="" aria-hidden="true">
            <TopoGate />
          </div>

          <div className="route-view">
            <RoutePlane uid="rs" links="camp-cards" head />
          </div>

          <div className="route-rail">
            <button type="button" className="rr-btn" data-route-prev="" aria-label="Previous camp">
              <Icon name="chevron" size={20} />
            </button>
            <div className="rr-track" aria-hidden="true">
              <svg className="rr-svg" viewBox="0 0 40 1000" preserveAspectRatio="none" focusable="false">
                <line className="rr-axis" x1="6" y1="0" x2="6" y2="1000" />
                <polyline className="rr-base" points={profilePoints} />
              </svg>
              <div className="rr-fill">
                <svg className="rr-svg" viewBox="0 0 40 1000" preserveAspectRatio="none" focusable="false">
                  <polyline className="rr-line" points={profilePoints} />
                </svg>
              </div>
              {tw.map((t, i) => (
                <span key={i} className="rr-tick" data-route-tick={i} style={{ '--t': t } as CSSProperties} />
              ))}
              <span className="rr-head" />
            </div>
            <button type="button" className="rr-btn" data-route-next="" aria-label="Next camp">
              <Icon name="chevron" size={20} />
            </button>
          </div>

          <ol className="route-cards">
            {camps.map((c) => (
              <li key={c.id} id={`camp-${c.id}`} className="route-card" data-route-card="" style={{ '--hue': c.hue } as CSSProperties}>
                <WaypointCard
                  camp={c}
                  compact
                  cta={
                    c.n === 5 ? (
                      <Link className="link-go" href="/method">
                        {copy.cta}
                        <Icon name="arrow-right" size={16} />
                      </Link>
                    ) : undefined
                  }
                />
              </li>
            ))}
          </ol>

          <RouteStage camps={stageCamps} />
        </div>
      </div>
    </Section>
  )
}
