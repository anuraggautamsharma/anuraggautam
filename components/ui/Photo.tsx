import Image, { getImageProps } from 'next/image'
import clsx from 'clsx'
import type { CSSProperties } from 'react'
import { photos, type PhotoId } from '@/lib/photos'

const QUALITY = 60
const SCRIM_DIR = { top: 'to bottom', bottom: 'to top', left: 'to right' } as const

/** The y component of a "x% y%" focal point, for the centred portrait crops. */
const focalY = (focal: string) => focal.split(' ')[1] ?? '50%'

/**
 * A photograph that fills its `.photo-stage` parent (absolute, object-fit cover).
 * Art-directed: the 4:5 crop is served via <picture> at (max-aspect-ratio: 4/5).
 * `priority` is the LCP path: eager, fetchpriority=high, no placeholder, never faded;
 * it only settles its scale in. `drift` adds the scroll-linked view() drift and
 * `parallax` (0–1, e.g. .15) a slower-than-scroll translate; both are transform-only,
 * halved below 40rem and off under reduced motion.
 */
export function FullBleedPhoto({
  id,
  priority = false,
  sizes = '100vw',
  scrim,
  drift = false,
  parallax,
  night,
  className,
}: {
  id: PhotoId
  /** The same view at night, shown instead in the dark theme (lazy: fetched only when shown). */
  night?: PhotoId
  priority?: boolean
  sizes?: string
  scrim?: boolean
  drift?: boolean
  parallax?: number
  className?: string
}) {
  const p = photos[id]
  const common = {
    alt: p.alt,
    sizes,
    quality: QUALITY,
    ...(priority
      ? { fetchPriority: 'high' as const, loading: 'eager' as const }
      : { loading: 'lazy' as const, placeholder: 'blur' as const }),
  }
  const { props: img } = getImageProps({ ...common, src: p.src })
  const mobile = p.portrait ? getImageProps({ ...common, src: p.portrait }).props : null
  const n = night ? photos[night] : null
  const nightImg = n ? getImageProps({ alt: n.alt, sizes, quality: QUALITY, loading: 'lazy', src: n.src }).props : null
  const nightMobile = n?.portrait ? getImageProps({ alt: n.alt, sizes, quality: QUALITY, loading: 'lazy', src: n.portrait }).props : null
  const showScrim = (scrim ?? true) && !!p.scrim
  const showVeil = (scrim ?? true) && p.tone === 'photo-light' && !!p.veil

  return (
    <>
      <picture
        className={clsx('photo-img', drift && 'photo-drift', n && 'photo-day', className)}
        data-drift={drift ? '' : undefined}
        data-parallax={parallax ? String(parallax) : undefined}
        data-hd-scrim={p.headerScrim}
        style={
          {
            '--focal': p.focal,
            '--focal-m': p.portrait ? `50% ${focalY(p.focal)}` : undefined,
            backgroundColor: p.dominant,
          } as CSSProperties
        }
      >
        {mobile ? <source media="(max-aspect-ratio: 4/5)" srcSet={mobile.srcSet} sizes={sizes} width={mobile.width} height={mobile.height} /> : null}
        {/* eslint-disable-next-line jsx-a11y/alt-text -- getImageProps output, alt included */}
        <img {...img} className={clsx(priority && 'photo-settle')} />
      </picture>
      {n && nightImg ? (
        <picture
          className={clsx('photo-img photo-night', drift && 'photo-drift', className)}
          data-parallax={parallax ? String(parallax) : undefined}
          style={{ '--focal': n.focal, '--focal-m': n.portrait ? `50% ${focalY(n.focal)}` : undefined, backgroundColor: n.dominant } as CSSProperties}
        >
          {nightMobile ? <source media="(max-aspect-ratio: 4/5)" srcSet={nightMobile.srcSet} sizes={sizes} width={nightMobile.width} height={nightMobile.height} /> : null}
          {/* eslint-disable-next-line jsx-a11y/alt-text -- getImageProps output, alt included */}
          <img {...nightImg} />
        </picture>
      ) : null}
      {showScrim && p.scrim ? (
        <div
          className="photo-scrim"
          aria-hidden="true"
          style={
            {
              '--scrim-c': p.scrim.rgb,
              '--scrim-a': p.scrim.a,
              '--scrim-a-m': p.scrim.aPortrait ?? p.scrim.a,
              '--scrim-reach': p.scrim.reach,
              '--scrim-reach-m': p.scrim.reachPortrait,
              '--scrim-dir': SCRIM_DIR[p.scrim.side],
              // A left scrim serves a left copy column; on the 4:5 crop the copy spans the width, so it comes from the top.
              '--scrim-dir-m': SCRIM_DIR[p.scrim.side === 'left' ? 'top' : p.scrim.side],
            } as CSSProperties
          }
        />
      ) : null}
      {showVeil ? <div className="photo-veil" aria-hidden="true" style={{ '--veil-a': p.veil } as CSSProperties} /> : null}
    </>
  )
}

export type PlateAspect = '4/5' | '3/2' | '1/1' | '21/9'

/**
 * A framed photograph at a fixed aspect, with an optional caption row. `wipe` reveals it
 * bottom-up when it scrolls in (RevealObserver). `sizes` is required: give the real slot width.
 */
export function Plate({
  id,
  aspect = '3/2',
  sizes,
  caption,
  index,
  wipe = false,
  className,
}: {
  id: PhotoId
  aspect?: PlateAspect
  sizes: string
  caption?: string
  index?: string
  wipe?: boolean
  className?: string
}) {
  const p = photos[id]
  return (
    <figure className={clsx('plate', className)}>
      <div
        className={clsx('plate-img', wipe && 'wipe')}
        style={{ '--ar': aspect.replace('/', ' / '), backgroundColor: p.dominant } as CSSProperties}
      >
        <Image
          src={p.src}
          alt={p.alt}
          fill
          sizes={sizes}
          quality={QUALITY}
          placeholder="blur"
          style={{ objectPosition: p.focal }}
        />
        {index && !caption ? (
          <span className="plate-tag t-label" aria-hidden="true">
            {index}
          </span>
        ) : null}
      </div>
      {caption ? (
        <figcaption className="plate-cap">
          <span className="t-label" aria-hidden={index ? undefined : 'true'}>
            {index ?? ''}
          </span>
          <span>{caption}</span>
          <span />
        </figcaption>
      ) : null}
    </figure>
  )
}
