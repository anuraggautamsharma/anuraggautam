import type { CSSProperties } from 'react'
import Image from 'next/image'
import clsx from 'clsx'
import type { FieldPlate as FieldPlateData } from '@/lib/photos'

/**
 * One of Anurag's own photographs, in the site's plate language: square 4:5 frame, the
 * dominant colour behind it while it decodes, a bottom-up wipe, and the ruled caption row.
 * Same markup as ui/Photo's <Plate>, which only takes the stock nature photos.
 */
export function FieldPlate({
  plate,
  sizes,
  caption = plate.caption,
  index,
  className,
}: {
  plate: FieldPlateData
  sizes: string
  caption?: string
  index?: string
  className?: string
}) {
  return (
    <figure className={clsx('plate', className)}>
      <div className="plate-img wipe" style={{ '--ar': '4 / 5', backgroundColor: plate.dominant } as CSSProperties}>
        <Image
          src={plate.src}
          alt={plate.alt}
          fill
          sizes={sizes}
          quality={75}
          placeholder="blur"
          style={{ objectPosition: plate.focal }}
        />
      </div>
      {caption ? (
        index ? (
          <figcaption className="plate-cap">
            <span className="t-label tnum" aria-hidden="true">
              {index}
            </span>
            <span>{caption}</span>
            <span />
          </figcaption>
        ) : (
          <figcaption className="plate-cap a-cap-plain">
            <span>{caption}</span>
          </figcaption>
        )
      ) : null}
    </figure>
  )
}
