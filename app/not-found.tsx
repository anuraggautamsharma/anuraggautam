import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { pageMeta, pages } from '@/lib/site'
import { photos } from '@/lib/photos'
import { Section } from '@/components/ui/Section'
import { FullBleedPhoto } from '@/components/ui/Photo'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { ChapterLabel } from '@/components/ui/ChapterLabel'
import './not-found.css'

const copy = pages.notFound

export const metadata: Metadata = {
  title: pageMeta.notFound.title,
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <Section
      id="off-the-map"
      tone="photo"
      className="nf photo-stage"
      labelledBy="nf-title"
      style={{ '--photo-dominant': photos['hero-404'].dominant } as CSSProperties}
    >
      <FullBleedPhoto id="hero-404" priority sizes="100vw" />
      <div className="wrap cols nf-inner">
        <div className="nf-text">
          <ChapterLabel name="404" className="nf-err" />
          <h1 id="nf-title" className="t-h1">
            {copy.h1}
          </h1>
          <p className="t-lead nf-line">{copy.line}</p>
          <div className="nf-actions">
            <ButtonLink href="/" variant="primary" size="lg">
              {copy.cta}
            </ButtonLink>
            <ButtonLink href="/method" variant="photo" size="lg">
              {copy.cta2}
            </ButtonLink>
          </div>
        </div>
      </div>
    </Section>
  )
}
