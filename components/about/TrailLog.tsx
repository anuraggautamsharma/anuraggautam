import type { CSSProperties } from 'react'
import { buildLog, pages } from '@/lib/site'
import type { PhotoId } from '@/lib/photos'
import { Section } from '@/components/ui/Section'
import { Plate } from '@/components/ui/Photo'

/**
 * The four ventures carry a landscape plate for rhythm. No caption: these are stock
 * landscapes, never places Anurag has been. Keyed by the step's two-digit number.
 */
const PHOTO: Partial<Record<string, PhotoId>> = {
  '03': 'expedition-canyon',
  '04': 'expedition-aurora',
  '05': 'expedition-alpine-lake',
  '06': 'expedition-ice-cave',
}

/** The build log as a rope line: one knot per step, years only where they're known. */
export function TrailLog() {
  return (
    <Section id="trail" tone="paper" className="a-trail" labelledBy="a-trail-title">
      <div className="wrap cols a-trail-grid">
        <h2 id="a-trail-title" className="t-h2 a-trail-title reveal">
          {pages.about.trail.h2}
        </h2>
        <ol className="a-rope">
          {buildLog.map((step, i) => {
            const photo = PHOTO[step.code.slice(-2)]
            return (
              <li
                key={step.code}
                className="a-step reveal"
                data-photo={photo ? '' : undefined}
                style={{ '--i': i } as CSSProperties}
              >
                <span className="a-knot" aria-hidden="true" />
                <div className="a-step-head">
                  <p className="t-label tnum a-step-meta">
                    <span>{step.code}</span>
                    {step.years ? <span className="a-step-years">{step.years}</span> : null}
                  </p>
                  <h3 className="t-h4 a-step-title">{step.title}</h3>
                </div>
                {photo ? (
                  <div className="a-step-plate">
                    <Plate id={photo} aspect="3/2" sizes="(min-width:64rem) 15vw, (min-width:40rem) 34vw, 100vw" />
                  </div>
                ) : null}
                <p className="t-small a-step-body">{step.body}</p>
              </li>
            )
          })}
        </ol>
      </div>
    </Section>
  )
}
