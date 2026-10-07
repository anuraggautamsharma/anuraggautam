import type { CSSProperties, ReactNode } from 'react'
import { Plate } from '@/components/ui/Photo'
import { photos } from '@/lib/photos'
import type { Camp } from '@/lib/site'
import { toolsFor } from '@/lib/tools'
import { ToolLogo } from '@/components/ui/ToolLogo'

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * One camp on the route: photo plate, the plain-word camp name in its hue ("Camp 03 · Pipeline"),
 * the metaphor title under it, the three things built there, and the hazard it clears (struck
 * through when the camp is reached). `cta` (the last camp only) closes the climb with a text link.
 * `compact` (the homepage route) drops the hazard line: Terrain has just named all five
 * hazards, so home shows only what each camp builds (/method still names every hazard).
 */
export function WaypointCard({ camp, cta, compact = false }: { camp: Camp; cta?: ReactNode; compact?: boolean }) {
  const titleId = `wc-${camp.id}`
  return (
    <article
      className="wc"
      aria-labelledby={titleId}
      style={{ '--photo-dominant': photos[camp.photo].dominant } as CSSProperties}
    >
      {/* The stage card is up to 400px and its photo settles in from ×1.12, so ask for 448px:
          640w at 1x, 1080w at 2x (a 400w file at 1x read soft). The static tablet grid runs 50vw. */}
      <Plate id={camp.photo} aspect="3/2" sizes="(min-width: 40rem) and (max-width: 63.99rem) 50vw, 448px" className="wc-photo" />
      <div className="wc-body">
        <p className="wc-label">
          <span className="wc-blaze" aria-hidden="true" />
          <span>
            Camp {pad(camp.n)} · {camp.name}
          </span>
        </p>
        <h3 id={titleId} className="t-h3 wc-title">
          {camp.title}
        </h3>
        <ul className="wc-items">
          {camp.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {toolsFor(camp.id).length ? (
          <ul className="wc-tools" aria-label={`${camp.name} stack`}>
            {toolsFor(camp.id).map((t) => (
              <li key={t.slug}>
                <ToolLogo tool={t} base={17} />
              </li>
            ))}
          </ul>
        ) : null}
        {compact ? null : (
          <p className="wc-clears">
            <span className="wc-clears-k" data-wb-exclude="">
              Clears:
            </span>{' '}
            <s className="wc-haz">{camp.hazard}</s>
          </p>
        )}
        {cta ? <p className="wc-cta">{cta}</p> : null}
      </div>
    </article>
  )
}
