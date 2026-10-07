import clsx from 'clsx'
import './page-hero.css'
import type { CSSProperties, ReactNode } from 'react'
import { photos, type PhotoId } from '@/lib/photos'
import { Section } from './Section'
import { FullBleedPhoto } from './Photo'
import { ChapterLabel } from './ChapterLabel'

/**
 * Inner-page hero: a full-bleed photo (the page's LCP) with a ChapterLabel kicker (name +
 * altitude), the page's only <h1>, one line and a CTA slot. Entrance is CSS-only (page-hero.css). Tone, scrim and veil come from the photo's entry in lib/photos.
 * Heights: full 100svh · tall 78/70svh · mid 56/48svh · band 52/44svh (desktop/mobile).
 */
export function PageHero({
  photo,
  kicker,
  title,
  line,
  height,
  align,
  alt,
  children,
}: {
  photo: PhotoId
  kicker: string
  title: string
  line?: string
  height: 'full' | 'tall' | 'mid' | 'band'
  align: 'top-left' | 'bottom-left' | 'right'
  alt?: string
  children?: ReactNode
}) {
  const p = photos[photo]
  return (
    <Section
      tone={p.tone}
      alt={alt}
      labelledBy="page-title"
      className={clsx('page-hero photo-stage', `ph-h-${height}`, `ph-a-${align}`)}
      style={{ '--photo-dominant': p.dominant } as CSSProperties}
    >
      <FullBleedPhoto id={photo} priority sizes="(max-width: 40rem) 200vw, 100vw" />
      <div className="wrap ph-inner">
        <div className="ph-copy">
          {kicker ? (
            // The same wayfinding row as the homepage beats: ▮ NAME ——— ▲ ALT
            <div className="ph-kicker load-rise" style={{ '--i': 0 } as CSSProperties}>
              <ChapterLabel name={kicker} alt={alt} />
            </div>
          ) : null}
          <h1 id="page-title" className="t-h1 ph-title load-lines">
            <span className="mask">
              <span>{title}</span>
            </span>
          </h1>
          {line ? (
            <p className="t-lead ph-line load-rise" style={{ '--i': 2 } as CSSProperties}>
              {line}
            </p>
          ) : null}
          {children ? (
            <div className="ph-actions load-rise" style={{ '--i': 3 } as CSSProperties}>
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </Section>
  )
}
