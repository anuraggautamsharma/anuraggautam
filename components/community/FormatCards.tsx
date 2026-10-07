import type { CSSProperties } from 'react'
import Image from 'next/image'
import { pages } from '@/lib/site'
import { fieldPlates, type FieldPlateId } from '@/lib/photos'
import { Section } from '@/components/ui/Section'

const copy = pages.community
const plateById = (id: FieldPlateId) => fieldPlates.find((p) => p.id === id)!

/**
 * "What happens": the three formats on Anurag's own field photos (never stock crowds).
 * Each carries an honest status sign (Monthly · Online · First date to the list, Later,
 * Waitlist) pinned to the photo's foot, and links down to its section.
 */
export function FormatCards() {
  return (
    <Section id="formats" tone="paper" alt="2,800 M" labelledBy="cm-fmt-title" className="cm-fmts">
      <div className="wrap">
        <h2 id="cm-fmt-title" className="t-h2 cm-fmts-title reveal">
          {copy.happensH}
        </h2>
        <ol className="cm-fmt-grid">
          {copy.formats.map((f, i) => {
            const plate = plateById(f.plate)
            return (
              <li key={f.id} className="cm-fmt reveal" style={{ '--i': i } as CSSProperties}>
                <div className="cm-fmt-photo">
                  <div className="plate-img wipe" style={{ '--ar': 'var(--cm-fmt-ar)', backgroundColor: plate.dominant } as CSSProperties}>
                    <Image
                      src={plate.src}
                      alt={plate.alt}
                      fill
                      sizes="(min-width: 64rem) 30vw, (min-width: 40rem) 45vw, 100vw"
                      quality={75}
                      placeholder="blur"
                      style={{ objectPosition: plate.focal }}
                    />
                  </div>
                  <p className="cm-status">{f.sign}</p>
                </div>
                <p className="t-label tnum cm-fmt-n" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="t-h3 cm-fmt-name">
                  <a href={f.href} className="cm-fmt-link">
                    {f.name}
                  </a>
                </h3>
                <p className="cm-fmt-line">{f.line}</p>
              </li>
            )
          })}
        </ol>
      </div>
    </Section>
  )
}
