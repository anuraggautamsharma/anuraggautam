import type { CSSProperties } from 'react'
import { camps, type Camp } from '@/lib/site'
import { CAMPS, FRAMES, ROI, TRAILHEAD_MAP } from './route'
import { TOPO } from './topo-data.generated'

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Custom properties that place the poster and the pins: the poster's viewBox (--v*), the
 * frame crops per layout (--fs* static, --fd* desktop stage, --fm* mobile stage) and the
 * desktop region of interest (--r*). Put them on the element that wraps a RoutePlane.
 */
export function mapVars(): CSSProperties {
  const [vx, vy, vw, vh] = TOPO.viewBox
  const v: Record<string, number> = { '--vx': vx, '--vy': vy, '--vw': vw, '--vh': vh }
  const keys = { static: 's', desk: 'd', mob: 'm' } as const
  for (const [name, k] of Object.entries(keys)) {
    const [x, y, w, h] = FRAMES[name as keyof typeof keys]
    Object.assign(v, { [`--f${k}x`]: x, [`--f${k}y`]: y, [`--f${k}w`]: w, [`--f${k}h`]: h })
  }
  Object.assign(v, { '--rx': ROI.x, '--ry': ROI.y, '--rw': ROI.w, '--rh': ROI.h })
  return v as CSSProperties
}

const CONTOURS = [
  ['rm-c-minor', TOPO.minor],
  ['rm-c-major', TOPO.major],
  ['rm-c-snow', TOPO.minorSnow],
  ['rm-c-snow-major', TOPO.majorSnow],
] as const

/**
 * The topographic poster: hypsometric bands cut like paper layers and 40 contour levels (its
 * edges are feathered by CSS masks, like the 3D scene's); then, in a second SVG cropped tight to the route (it repaints
 * while the route draws, so it stays small), the planned trail, the walked route and the
 * trailhead start dot. Decorative: aria-hidden.
 */
export function RouteMapSvg({ uid }: { uid: string }) {
  const [vx, vy, vw, vh] = TOPO.viewBox
  const viewBox = `${vx} ${vy} ${vw} ${vh}`
  const id = (s: string) => `${uid}-${s}`
  return (
    <>
      <svg className="rm-svg rm-map" viewBox={viewBox} aria-hidden="true" focusable="false">
        <defs>
          {TOPO.bands.slice(1).map((d, i) => (
            <path key={i} id={id(`b${i + 1}`)} d={d} fillRule="evenodd" />
          ))}
        </defs>
        <g>
          <path d={TOPO.bands[0]} fill={TOPO.fills[0]} />
          {TOPO.bands.slice(1).map((_, i) => (
            <g key={i}>
              {/* Each layer casts a short shadow to the south-east (the sun sits north-west). */}
              <use href={`#${id(`b${i + 1}`)}`} className="rm-shade" transform="translate(3 6)" />
              <use href={`#${id(`b${i + 1}`)}`} fill={TOPO.fills[i + 1]} />
            </g>
          ))}
          {CONTOURS.map(([cls, d]) => (d ? <path key={cls} className={`rm-c ${cls}`} d={d} /> : null))}
        </g>
      </svg>
      <svg
        className="rm-svg rm-route"
        viewBox={TOPO.routeBox.join(' ')}
        aria-hidden="true"
        focusable="false"
        style={
          {
            '--dash': (6 / TOPO.routeLength).toFixed(5),
            '--vx': TOPO.routeBox[0],
            '--vy': TOPO.routeBox[1],
            '--vw': TOPO.routeBox[2],
            '--vh': TOPO.routeBox[3],
          } as CSSProperties
        }
      >
        <defs>
          <path id={id('r')} d={TOPO.route} pathLength={1} />
        </defs>
        <use href={`#${id('r')}`} className="rm-planned" />
        <use href={`#${id('r')}`} className="rm-casing" />
        <use href={`#${id('r')}`} className="rm-core" />
        <g transform={`translate(${TRAILHEAD_MAP.x} ${TRAILHEAD_MAP.y})`}>
          <circle className="rm-start" r="5" />
        </g>
      </svg>
    </>
  )
}

type PinLinks = 'camp-cards' | 'method-sections' | 'none'

const href = (c: Camp, links: PinLinks) => (links === 'camp-cards' ? `#camp-${c.id}` : `#${c.id}`)

/**
 * The map plane: poster, route head and the five numbered pins, all placed from the frame
 * custom properties (see mapVars). Pins are real anchors with "Camp 01: Position" names;
 * their numerals are map labels, excluded from the homepage word budget.
 */
export function RoutePlane({ uid, links, head = false }: { uid: string; links: PinLinks; head?: boolean }) {
  return (
    <div className="rm-plane" data-route-plane="">
      <RouteMapSvg uid={uid} />
      {head ? (
        <span
          className="rm-head"
          data-route-head=""
          aria-hidden="true"
          style={{ '--mx': TRAILHEAD_MAP.x, '--my': TRAILHEAD_MAP.y } as CSSProperties}
        />
      ) : null}
      <ol className="rm-pins" data-wb-exclude="">
        {camps.map((c, i) => {
          const at = CAMPS[i]
          const label = `Camp ${pad(c.n)}: ${c.name}`
          const pin = <span className="pin">{pad(c.n)}</span>
          return (
            <li
              key={c.id}
              className="rm-pin"
              data-route-pin={i}
              style={{ '--mx': at?.x ?? 0, '--my': at?.y ?? 0 } as CSSProperties}
            >
              {links === 'none' ? (
                <span className="rm-pin-a" aria-hidden="true">
                  {pin}
                </span>
              ) : (
                <a className="rm-pin-a" href={href(c, links)} aria-label={label} data-camp={i}>
                  {pin}
                </a>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
