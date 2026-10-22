import type { CSSProperties } from 'react'
import Image from 'next/image'
import { Section } from '@/components/ui/Section'
import { FullBleedPhoto } from '@/components/ui/FullBleedPhoto'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { LivingPhoto } from '@/components/living/LivingPhoto'
import guideDepth from '@/assets/nature/depth/guide-trail-depth.webp'
import { photos, portraitCutout } from '@/lib/photos'
import { home, roles } from '@/lib/site'
import './home.css'

/** Line icons, drawn on as each role arrives. */
const ROLE_ICON = {
  design: 'M4 20 L4.6 16.4 L15.5 5.5 L18.5 8.5 L7.6 19.4 Z M13.5 7.5 L16.5 10.5 M4 20 L8 19.4',
  marketing: 'M3 10 L3 14 L7 14 L15 19 L15 5 L7 10 Z M18.5 9 C20.5 10.5 20.5 13.5 18.5 15',
  sales: 'M2 12 L6 8 L10 10 L14 7 L18 9 L22 6 M2 18 L22 18 M15 7 L18 9 L18 6',
  conversion: 'M3 5 L21 5 L21 19 L3 19 Z M3 9 L21 9 M7 13 L11 13 M7 16 L15 16 M15.5 12.5 L17 14 L19.5 11.5',
} as const

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

      <Section id="guide" tone="sand" topo labelledBy="guide-title" className="gd">
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
            {/* The jobs he has done himself: icon, role, one line of proof. */}
            <ul className="gd-roles">
              {roles.map((r, i) => (
                <li key={r.id} className="gd-role reveal" style={{ '--i': i + 1 } as CSSProperties}>
                  <svg className="gd-role-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d={ROLE_ICON[r.id]} />
                  </svg>
                  <span className="gd-role-name">{r.role}</span>
                  <span className="gd-role-proof">{r.proof}</span>
                </li>
              ))}
            </ul>
            <p className="gd-off">{copy.offClock}</p>
            <ButtonLink href="/about" variant="secondary" className="gd-cta">
              {copy.cta}
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  )
}
