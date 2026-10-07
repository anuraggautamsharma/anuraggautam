import type { CSSProperties } from 'react'
import { Section } from '@/components/ui/Section'
import { FullBleedPhoto } from '@/components/ui/FullBleedPhoto'
import { ChapterLabel } from '@/components/ui/ChapterLabel'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { photos } from '@/lib/photos'
import { chapters, directLine, home } from '@/lib/site'
import { MaskWords } from './MaskWords'
import './summit.css'

/**
 * Beat 08, the summit at sunrise. Shared by home, /method and /about: the page's only
 * sunrise block. Ink text sits in the pale sky with no scrim; the footer ridge rises over
 * the bottom 110px of the photo, so the plate always stays clear of it.
 */
export function SummitCta({ n }: { n?: string }) {
  const copy = home.summit
  return (
    <Section
      id="summit"
      tone="photo-light"
      alt={chapters.summit.alt}
      labelledBy="summit-title"
      className="sm photo-stage"
      style={{ '--photo-dominant': photos['summit-golden'].dominant } as CSSProperties}
    >
      <FullBleedPhoto id="summit-golden" sizes="100vw" scrim={false} className="sm-iris wipe" />
      <div className="wrap sm-inner">
        <div className="sm-head">
          <ChapterLabel n={n} name={chapters.summit.name} alt={chapters.summit.alt} />
          <h2 id="summit-title" className="t-display reveal-lines sm-title">
            <MaskWords text={copy.h2} />
          </h2>
        </div>
        <div className="sm-plate reveal" data-tone="sunrise">
          <p className="t-lead sm-line">{copy.line}</p>
          <ButtonLink href="/contact" variant="primary" size="lg" magnetic>
            {copy.cta}
          </ButtonLink>
          <p className="sm-email">
            <span>{copy.dmPrefix}</span>{' '}
            <a className="link" href={directLine.url} rel="me">
              {copy.dm}
            </a>
          </p>
        </div>
      </div>
    </Section>
  )
}
