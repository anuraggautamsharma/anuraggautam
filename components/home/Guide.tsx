import type { CSSProperties } from 'react'
import Image from 'next/image'
import { Section } from '@/components/ui/Section'
import { FullBleedPhoto } from '@/components/ui/FullBleedPhoto'
import { ChapterLabel } from '@/components/ui/ChapterLabel'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { LivingPhoto } from '@/components/living/LivingPhoto'
import guideDepth from '@/assets/nature/depth/guide-trail-depth.webp'
import { photos, portraitCutout } from '@/lib/photos'
import { chapters, home } from '@/lib/site'
import './home.css'

/**
 * Beat 03b + 04. A wordless photo band (the breath after the map), then the guide: Anurag's
 * studio cutout standing on a flat 4:5 sand panel with a faint contour motif, bottom-aligned
 * so his arms run off the panel's lower edge, beside the short story on one axis.
 * Phones: a centred panel about 82vw wide, above the text.
 * The wipe sits on .gd-fig; RevealObserver watches its unclipped parent, .gd-plate.
 */
export function Guide() {
  const copy = home.guide
  return (
    <>
      <div
        className="gd-band photo-stage"
        data-nav="photo"
        style={{ '--photo-dominant': photos['guide-trail'].dominant } as CSSProperties}
      >
        <FullBleedPhoto id="guide-trail" sizes="100vw" drift className="gd-band-photo" />
        {/* The valley, alive: depth parallax, drifting cloud and its shadows, the sun at the pointer. */}
        <LivingPhoto depth={guideDepth.src} fx={0.5} fy={0.55} />
      </div>

      <Section id="guide" tone="sand" topo alt={chapters.guide.alt} labelledBy="guide-title" className="gd">
        <div className="wrap cols gd-grid">
          <div className="gd-plate">
            <figure className="gd-fig wipe">
              <div className="gd-panel" aria-hidden="true" />
              <Image
                src={portraitCutout.src}
                alt={portraitCutout.alt}
                className="gd-cutout"
                sizes="(min-width: 64rem) 38vw, 82vw"
                quality={75}
                loading="lazy"
              />
            </figure>
          </div>

          <div className="gd-text reveal">
            <ChapterLabel {...chapters.guide} />
            <h2 id="guide-title" className="t-h2 gd-title">
              {copy.h2}
            </h2>
            {/* One sentence per line, at every width: the promise, then the turn. */}
            <p className="t-lead gd-line">
              {copy.line.split(/(?<=[.!?])\s+/).map((sentence, i, all) => (
                <span key={sentence} className="gd-sent">
                  {sentence}
                  {i < all.length - 1 ? ' ' : null}
                </span>
              ))}
            </p>
            <ul className="rule-list gd-badges">
              {copy.badges.map((badge, i) => (
                <li key={badge} className="reveal" style={{ '--i': i + 1 } as CSSProperties}>
                  <span className="t-label" aria-hidden="true" data-wb-exclude="">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="t-h4">{badge}</span>
                </li>
              ))}
            </ul>
            <ButtonLink href="/about" variant="secondary" className="gd-cta">
              {copy.cta}
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  )
}
