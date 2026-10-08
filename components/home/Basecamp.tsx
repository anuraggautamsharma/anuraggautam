import type { CSSProperties } from 'react'
import { Section } from '@/components/ui/Section'
import { FullBleedPhoto } from '@/components/ui/FullBleedPhoto'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { MaskWords } from '@/components/story/MaskWords'
import { photos } from '@/lib/photos'
import { home } from '@/lib/site'
import { InViewFlag } from './InViewFlag'
import './home.css'

/**
 * Beat 01, basecamp at dawn. The Matterhorn photo is the LCP: painted at t=0, never faded,
 * only its scale settles and it parallaxes at 0.15× scroll. Text sits top-left in the sky,
 * clear of the peak, and never moves. The ChapterLabel is the one mono row above the H1.
 * Phones: the headline stays in the sky; the CTAs drop to the dark foreground.
 */
export function Basecamp() {
  const copy = home.basecamp
  return (
    <Section
      id="basecamp"
      tone="photo"
      labelledBy="basecamp-title"
      className="bc photo-stage"
      style={{ '--photo-dominant': photos['basecamp-hero'].dominant } as CSSProperties}
    >
      <FullBleedPhoto id="basecamp-hero" night="basecamp-night" priority sizes="100vw" parallax={0.15} />
      <InViewFlag />
      <div className="wrap cols bc-inner">
        <div className="bc-text">
          <h1 id="basecamp-title" className="t-h1 load-lines bc-title">
            <MaskWords text={copy.h1} />
          </h1>
          <p className="t-lead bc-line load-rise">{copy.line}</p>
          <div className="bc-ctas load-rise">
            <ButtonLink href="/contact" variant="primary" size="lg" magnetic>
              {copy.cta}
            </ButtonLink>
            <ButtonLink href={copy.cta2Href} variant="photo" size="lg">
              {copy.cta2}
            </ButtonLink>
          </div>
        </div>
      </div>
      <div className="bc-cue" aria-hidden="true" data-wb-exclude="">
        <span>{copy.cue}</span>
        <span className="bc-cue-line" />
      </div>
    </Section>
  )
}
