import { fieldPlates } from '@/lib/photos'
import { Section } from '@/components/ui/Section'
import { FieldPlate } from './FieldPlate'

/**
 * Anurag's own photographs away from work: a calm three-up of 4:5 plates (a snap strip on
 * phones). The hilltop plate lives beside the bio, so it isn't repeated here. Renders nothing
 * until lib/photos.ts lists his plates: stock photography never stands in for him.
 */
export function FieldTests() {
  const plates = fieldPlates.filter((p) => p.id !== 'hilltop')
  if (plates.length === 0) return null
  return (
    <Section id="field" tone="paper" className="a-field" labelledBy="a-field-title">
      <div className="wrap cols a-field-cols">
        <header className="a-field-head reveal">
          <h2 id="a-field-title" className="t-h2 a-field-title">
            Off the clock.
          </h2>
          <p className="t-lead a-field-sub">When I’m not taking tech to market.</p>
        </header>
        <ul className="a-field-grid" aria-label="Photographs of Anurag">
          {plates.map((p, i) => (
            <li key={p.id} className="a-field-item">
              <FieldPlate
                plate={p}
                index={String(i + 1).padStart(2, '0')}
                sizes="(min-width: 64rem) 22vw, (min-width: 40rem) 30vw, 68vw"
              />
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}
