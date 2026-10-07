import type { CSSProperties } from 'react'
import Link from 'next/link'
import { pages } from '@/lib/site'
import { photos } from '@/lib/photos'
import { FullBleedPhoto } from '@/components/ui/Photo'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { Icon } from '@/components/ui/Icon'

export type DoorLink = { kind: 'read' | 'watch'; title: string; href: string; external?: boolean }

const copy = pages.start
const tabs = pages.watch.tabs

/**
 * Three ways in, as three photo doors: tall portrait panels side by side on wide screens,
 * 4:5 cards stacked on phones. Each door is one full-bleed photograph with its own scrim
 * (the photo's manifest scrim is off: every door needs the same foot-heavy fade for its
 * paper copy), an index, the line a visitor would say, and where to go next.
 * The "learn" door lists the hand-picked notes and, once one exists, the latest video.
 */
export function Doors({ learn }: { learn: DoorLink[] }) {
  return (
    <ol className="st-doors" aria-label={copy.line}>
      {copy.doors.map((d, i) => (
        <li
          key={d.id}
          className="st-door photo-stage reveal"
          data-tone="photo"
          data-door={d.id}
          style={{ '--photo-dominant': photos[d.photo].dominant, '--i': i } as CSSProperties}
        >
          <FullBleedPhoto id={d.photo} scrim={false} sizes="(min-width: 64rem) 34vw, 100vw" className="st-door-img" />
          <div className="st-door-scrim" aria-hidden="true" />
          <div className="st-door-copy">
            <p className="t-label tnum st-door-n" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </p>
            <h2 className="st-door-h">{d.h}</h2>
            {d.id === 'learn' && learn.length > 0 ? (
              <ul className="st-door-list">
                {learn.map((l) =>
                  l.external ? (
                    <li key={l.href}>
                      <a href={l.href} className="st-door-item" rel="noopener">
                        <span className="t-label">{tabs[l.kind]}</span>
                        <span className="st-door-item-t">{l.title}</span>
                        <Icon name="arrow-up-right" size={16} />
                      </a>
                    </li>
                  ) : (
                    <li key={l.href}>
                      <Link href={l.href} className="st-door-item">
                        <span className="t-label">{tabs[l.kind]}</span>
                        <span className="st-door-item-t">{l.title}</span>
                        <Icon name="arrow-right" size={16} />
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            ) : null}
            <div className="st-door-actions">
              <ButtonLink href={d.href} variant="photo" magnetic={false}>
                {d.cta}
              </ButtonLink>
              {'alt' in d && d.alt ? (
                <Link href={d.alt.href} className="link-go st-door-alt">
                  {d.alt.label}
                  <Icon name="arrow-right" size={16} />
                </Link>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
