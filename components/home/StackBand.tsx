import { Section } from '@/components/ui/Section'
import { ToolLogo } from '@/components/ui/ToolLogo'
import { camps, home } from '@/lib/site'
import { toolsFor } from '@/lib/tools'
import './stack.css'

/**
 * Right after the Route: the stack each camp runs on, as official marks grouped under the
 * camp names visitors just learned. One calm paper band; logos keep their brand colours.
 */
export function StackBand() {
  const copy = home.stack
  return (
    <Section id="stack" tone="paper" labelledBy="stack-title" className="sk">
      <div className="wrap cols sk-grid">
        <div className="sk-head">
          <p className="t-label sk-label">{copy.label}</p>
          <h2 id="stack-title" className="t-h3 sk-title">
            {copy.h2}
          </h2>
        </div>
        <ul className="sk-camps">
          {camps.map((camp) => {
            const list = toolsFor(camp.id)
            if (!list.length) return null
            return (
              <li key={camp.id} className="sk-camp" style={{ '--hue': camp.hue } as React.CSSProperties}>
                <p className="t-label sk-camp-name">
                  <span className="sk-blaze" aria-hidden="true" />
                  {camp.name}
                </p>
                <ul className="sk-logos" aria-label={`${camp.name} tools`}>
                  {list.map((t) => (
                    <li key={t.slug}>
                      <ToolLogo tool={t} base={24} />
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ul>
      </div>
    </Section>
  )
}
