import Link from 'next/link'
import { Section } from '@/components/ui/Section'
import { Ridge } from '@/components/ui/Ridge'
import { ChapterLabel } from '@/components/ui/ChapterLabel'
import { Icon } from '@/components/ui/Icon'
import { chapters, home } from '@/lib/site'
import './home.css'

/**
 * Beat 07, who the climb is for: the deep glacier band before the golden Summit, rising
 * on a ridge. Sectors are static tags (nothing here is a control); the three checks are a
 * ruled list whose top rule lines up with the H2. /method reuses it without the chapter
 * label and with the not-a-fit line. `notReady` (home) adds the down-sell under the ✗ line:
 * a quiet text link to the field notes, never a second button next to the Summit's.
 */
export function FitBand({
  chapter = true,
  notFit,
  notReady,
}: { chapter?: boolean; notFit?: string; notReady?: { text: string; cta: string; href: string } } = {}) {
  const copy = home.fit
  return (
    <Section id="fit" tone="glacier" alt={chapters.fit.alt} labelledBy="fit-title" className="fb">
      <Ridge />
      <div className="wrap cols fb-grid">
        {/* The label spans its own row so the checks' top rule lines up with the H2. */}
        {chapter ? <ChapterLabel {...chapters.fit} className="fb-chapter" /> : null}
        <div className="fb-head">
          <h2 id="fit-title" className="t-h2 fb-title">
            {copy.h2}
          </h2>
          <ul className="fb-tags" aria-label="Sectors">
            {copy.chips.map((chip) => (
              <li key={chip}>
                <span className="tag">{chip}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="fb-body">
          <ul className="rule-list fb-yes" aria-label="You’re a fit if">
            {copy.yes.map((line) => (
              <li key={line}>
                <Icon name="check" size={20} className="fb-check" />
                <span className="t-h4">{line}</span>
              </li>
            ))}
          </ul>
          {notFit ? <p className="t-small fb-no">{notFit}</p> : null}
          {notReady ? (
            <p className="t-small fb-down">
              <span>{notReady.text}</span>{' '}
              <Link className="link-go fb-down-link" href={notReady.href}>
                {notReady.cta}
                <Icon name="arrow-right" size={16} />
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </Section>
  )
}
