import clsx from 'clsx'
import { RoutePlane, mapVars } from './RouteMapSvg'
import './topo.css'

/**
 * The Summit Route as a flat map: the whole island, the route walked in full and the five
 * camps as numbered pins. With `linkPins` (default) each pin links to its /method section
 * (#position … #team); without, the pins are decorative.
 */
export function RouteMapStatic({ linkPins = true, className, uid = 'rms' }: { linkPins?: boolean; className?: string; uid?: string }) {
  return (
    <div className={clsx('rm-static', className)} style={mapVars()}>
      <RoutePlane uid={uid} links={linkPins ? 'method-sections' : 'none'} />
    </div>
  )
}
