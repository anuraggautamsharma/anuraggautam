import Image from 'next/image'
import Link from 'next/link'
import clsx from 'clsx'
import { Icon } from '@/components/ui/Icon'
import { videoSeries } from '@/lib/site'
import { isoDate, longDate } from '@/lib/dates'
import { durationMinutes, formatDuration, type Video } from '@/lib/videos'
import { PlayGlyph } from './PlayGlyph'
import './video.css'

const SIZES = {
  lg: '(min-width: 90rem) 880px, (min-width: 64rem) 62vw, 100vw',
  md: '(min-width: 64rem) 30vw, (min-width: 40rem) 46vw, 100vw',
} as const

/**
 * A long-form video as a poster link: no iframe, no JS (PLAN_V3 §5). The poster carries a
 * series sign, a play glyph and a duration chip; the title link stretches over the card.
 * It goes to /watch/[slug] when a watch page exists, else straight to YouTube.
 * In a container ≥ 60rem the lead (`lg`) card sets its text beside the poster.
 */
export function VideoCard({
  video,
  size,
  headingLevel = 'h3',
  priority = false,
}: {
  video: Video
  size: 'lg' | 'md'
  headingLevel?: 'h2' | 'h3'
  priority?: boolean
}) {
  const Heading = headingLevel
  const series = video.series ? videoSeries[video.series] : undefined
  const time = formatDuration(video.duration)
  const linkProps = { href: video.href, className: 'vd-card-link' }
  const title = (
    <>
      {video.title}
      {video.external ? (
        <>
          <span className="sr-only"> (YouTube)</span>
          <Icon name="arrow-up-right" size={size === 'lg' ? 24 : 20} className="vd-card-out" />
        </>
      ) : null}
    </>
  )

  return (
    <article className={clsx('vd-card', video.draft && 'vd-is-draft')} data-size={size}>
      <div className="vd-card-in">
        <div className="vd-poster">
          <Image
            src={video.poster}
            alt=""
            fill
            sizes={SIZES[size]}
            quality={60}
            {...(priority ? { preload: true, loading: 'eager' as const, fetchPriority: 'high' as const } : {})}
          />
          {series ? (
            <span className="vd-sign t-label" aria-hidden="true">
              {series.name}
            </span>
          ) : null}
          <PlayGlyph className="vd-card-play" />
          {time ? (
            <span className="vd-dur t-label" aria-hidden="true">
              {time}
            </span>
          ) : null}
        </div>
        <div className="vd-card-body">
          <p className="t-label vd-card-meta">
            <span className="vd-blaze" aria-hidden="true" />
            {video.draft ? <span className="vd-draft-tag">Draft</span> : null}
            {series ? <span className="sr-only">{series.name}</span> : null}
            <time dateTime={isoDate(video.date)}>{longDate(video.date)}</time>
            {time ? <span>{durationMinutes(video.duration)}</span> : null}
            {video.external ? <span>YouTube</span> : null}
          </p>
          <Heading className="note-title vd-card-title">
            {video.external ? (
              <a {...linkProps} rel="noopener">
                {title}
              </a>
            ) : (
              <Link {...linkProps}>{title}</Link>
            )}
          </Heading>
          {size === 'lg' && series ? <p className="vd-card-dek">{series.line}</p> : null}
        </div>
      </div>
    </article>
  )
}
