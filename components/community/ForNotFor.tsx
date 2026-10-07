import type { CSSProperties } from 'react'
import { pages } from '@/lib/site'
import { Section } from '@/components/ui/Section'
import { Ridge } from '@/components/ui/Ridge'
import { Icon } from '@/components/ui/Icon'

const copy = pages.community

/**
 * Who the Rope Team is for, in the FitBand's language: a deep glacier band rising on a
 * ridge, the H2 left, ruled ✓ lines right and the ✗ lines under them. Own markup, so the
 * page never depends on the homepage component.
 */
export function ForNotFor() {
  return (
    <Section id="for" tone="glacier" alt="2,300 M" labelledBy="cm-for-title" className="cm-for">
      <Ridge />
      <div className="wrap cols cm-for-grid">
        <h2 id="cm-for-title" className="t-h2 cm-for-title reveal">
          {copy.forH}
        </h2>
        <div className="cm-for-body">
          <ul className="rule-list cm-for-yes" aria-label={copy.forH}>
            {copy.for.map((line, i) => (
              <li key={line} className="reveal" style={{ '--i': i } as CSSProperties}>
                <Icon name="check" size={20} className="cm-for-mark" />
                <span className="t-h4">{line}</span>
              </li>
            ))}
          </ul>
          <ul className="cm-for-no" aria-label="Not for">
            {copy.notFor.map((line, i) => (
              <li key={line} className="reveal" style={{ '--i': copy.for.length + i } as CSSProperties}>
                <Icon name="close" size={16} className="cm-for-x" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  )
}
