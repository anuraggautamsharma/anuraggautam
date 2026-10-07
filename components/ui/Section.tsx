import clsx from 'clsx'
import type { HTMLAttributes } from 'react'

export type Tone = 'paper' | 'sand' | 'ice' | 'alpine' | 'forest' | 'glacier' | 'sunrise' | 'night' | 'photo' | 'photo-light'
export type NavMode = 'photo' | 'paper' | 'deep'

/** Which header treatment a tone asks for (HeaderState reads data-nav). */
export function navFor(tone: Tone): NavMode {
  if (tone === 'photo') return 'photo'
  if (tone === 'alpine' || tone === 'forest' || tone === 'glacier' || tone === 'night') return 'deep'
  return 'paper'
}

type SectionProps = Omit<HTMLAttributes<HTMLElement>, 'id' | 'className'> & {
  id?: string
  tone: Tone
  /** Altimeter reading for the header, e.g. "2,900 M". */
  alt?: string
  /** Adds the contour motif behind the content. */
  topo?: boolean
  className?: string
  labelledBy?: string
  as?: 'section' | 'div'
}

/**
 * A story beat. Sets data-tone (re-themes everything inside), data-nav (derived from the
 * tone; pass data-nav to override) and data-alt. No padding: each beat sets its own.
 */
export function Section({ id, tone, alt, topo, className, labelledBy, as = 'section', children, ...rest }: SectionProps) {
  const Tag = as
  return (
    <Tag
      id={id}
      data-tone={tone}
      data-nav={navFor(tone)}
      data-alt={alt}
      aria-labelledby={labelledBy}
      className={clsx('relative', topo && 'topo', className)}
      {...rest}
    >
      {children}
    </Tag>
  )
}
