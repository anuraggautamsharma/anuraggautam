import type { CSSProperties } from 'react'
import Link from 'next/link'
import { offers, pages } from '@/lib/site'
import { Section } from '@/components/ui/Section'
import { FullBleedPhoto } from '@/components/ui/Photo'

/**
 * "Four ways to climb": a route-valley band with the heading in its sky, then the engagement
 * cards in a 2×2 grid (stacked on phones). Team workshop links to its own contact type.
 */
export function Offers() {
  return (
    <Section id="ways" tone="paper" className="m-offers" labelledBy="m-offers-title">
      <div className="m-band photo-stage" data-tone="photo-light">
        <FullBleedPhoto id="route-valley" sizes="100vw" drift />
        <div className="wrap m-band-inner">
          <h2 id="m-offers-title" className="t-h2 m-band-title reveal">
            {pages.method.offers.h2}
          </h2>
        </div>
      </div>

      <div className="wrap m-offers-body">
        <ol className="m-offer-grid">
          {offers.map((o, i) => (
            <li key={o.name} className="m-offer reveal" style={{ '--i': i } as CSSProperties}>
              <p className="t-label tnum m-offer-len">
                <span className="m-offer-n" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {o.length}
              </p>
              <h3 className="t-h3">{o.name}</h3>
              <p className="t-small m-offer-line">{o.line}</p>
              {o.name === 'Team workshop' ? (
                <p className="t-small m-offer-link">
                  <Link href={pages.community.workshopHref} className="link">
                    Ask about a workshop
                  </Link>
                </p>
              ) : null}
            </li>
          ))}
        </ol>
        <p className="t-small m-offer-note">{pages.method.offers.note}</p>
      </div>
    </Section>
  )
}
