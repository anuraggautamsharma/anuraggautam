import type { CSSProperties } from 'react'
import { pages, type Camp } from '@/lib/site'
import { Section } from '@/components/ui/Section'
import { Plate } from '@/components/ui/Photo'
import { ToolLogo } from '@/components/ui/ToolLogo'
import { toolsFor } from '@/lib/tools'

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * One camp of the Summit Route: a waypoint plate and the story beside it. Even camps mirror,
 * and a decorative route line in the margin draws itself through every camp as you scroll.
 */
export function CampSection({ camp, tone }: { camp: Camp; tone: 'paper' | 'sand' }) {
  const n = pad(camp.n)
  const mirrored = camp.n % 2 === 0
  const titleId = `camp-${camp.id}-title`

  return (
    <Section
      id={camp.id}
      tone={tone}
      className="m-camp"
      labelledBy={titleId}
      data-mirror={mirrored ? '' : undefined}
      style={{ '--hue': camp.hue } as CSSProperties}
    >
      <div className="m-rail" aria-hidden="true">
        <span className="m-rail-fill" />
        <span className="m-rail-pin">
          <span className="m-rail-dot" />
          {n}
        </span>
      </div>

      <div className="wrap cols m-camp-grid">
        <div className="m-camp-plate">
          <Plate id={camp.photo} aspect="3/2" sizes="(min-width: 64rem) 50vw, 100vw" wipe />
        </div>

        <div className="m-camp-text reveal">
          <p className="t-display tnum m-camp-num" aria-hidden="true">
            {n}
          </p>
          <h2 id={titleId} className="m-camp-h">
            <span className="m-camp-label">
              <span className="m-camp-blaze" aria-hidden="true" />
              <span>
                <span className="tnum m-camp-n">{n} · </span>
                {camp.name}
              </span>
            </span>
            <span className="t-h2 m-camp-title">{camp.title}</span>
          </h2>
          <p className="t-body m-camp-detail">{camp.detail}</p>

          <div className="m-camp-leave">
            <p className="t-label" id={`camp-${camp.id}-leave`}>
              {pages.method.camp.leaveWith}
            </p>
            <ul className="m-tags" aria-labelledby={`camp-${camp.id}-leave`}>
              {camp.leaveWith.map((item) => (
                <li key={item}>
                  <span className="tag" style={{ '--hue': camp.hue } as CSSProperties}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {toolsFor(camp.id).length ? (
            <div className="m-camp-stack">
              <p className="t-label" id={`camp-${camp.id}-stack`}>
                Stack
              </p>
              <ul className="m-stack" aria-labelledby={`camp-${camp.id}-stack`}>
                {toolsFor(camp.id).map((t) => (
                  <li key={t.slug}>
                    <ToolLogo tool={t} base={22} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="t-label m-clears">
            <span>{pages.method.camp.clears}</span> <s className="m-strike">{camp.hazard}</s>
          </p>
        </div>
      </div>
    </Section>
  )
}
