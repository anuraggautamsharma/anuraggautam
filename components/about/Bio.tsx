import { bio, person } from '@/lib/site'
import { fieldPlates } from '@/lib/photos'
import { Section } from '@/components/ui/Section'
import { AtAGlance } from './AtAGlance'
import { FieldPlate } from './FieldPlate'

/**
 * The bio's text stays verbatim; only its layout changes. Blank lines in `bio` become
 * paragraphs. A single-paragraph bio is split after its first sentence, which is set as the lead.
 */
function paragraphs(text: string): string[] {
  const blocks = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  if (blocks.length > 1) return blocks
  const m = text.trim().match(/^(.+?[.!?])\s+(\S[\s\S]*)$/)
  return m ? [m[1], m[2]] : blocks
}

/**
 * The bio, the at-a-glance facts and Anurag's hilltop plate. Desktop: lead, body and facts
 * in the left column, the plate beside them. Phone: lead, plate, body, facts.
 */
export function Bio() {
  const [lead, ...rest] = paragraphs(bio)
  const plate = fieldPlates.find((p) => p.id === 'hilltop')
  return (
    <Section id="bio" tone="paper" className="a-bio" labelledBy="a-bio-title">
      <div className="wrap cols a-bio-grid">
        <div className="a-bio-lead reveal">
          <h2 id="a-bio-title" className="sr-only">
            About {person.name}
          </h2>
          <p className="a-bio-first">{lead}</p>
        </div>
        {plate ? (
          <div className="a-bio-plate">
            <FieldPlate plate={plate} sizes="(min-width: 64rem) 34vw, (min-width: 40rem) 56vw, 70vw" />
          </div>
        ) : null}
        <div className="a-bio-text reveal">
          {rest.map((p, i) => (
            <p key={i} className="t-body">
              {p}
            </p>
          ))}
        </div>
        <div className="a-bio-side">
          <AtAGlance />
        </div>
      </div>
    </Section>
  )
}
