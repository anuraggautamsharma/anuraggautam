import Image from 'next/image'
import { Icon } from '@/components/ui/Icon'
import type { Video } from '@/lib/videos'
import './video.css'

const PLATFORM = { short: 'YouTube Shorts', reel: 'Instagram', long: 'YouTube' } as const

/**
 * A Short or Reel as a 9:16 poster that links out to the native app (PLAN_V3 §5).
 * Never an embed: no Instagram embed.js, no YouTube iframe. The whole tile is the link.
 */
export function ShortTile({ video }: { video: Video }) {
  const platform = PLATFORM[video.kind]
  return (
    <a href={video.href} rel="noopener" className="vd-short">
      <span className="vd-short-poster">
        {/* hq posters are 4:3 with the vertical frame pillarboxed; cover at 9:16 keeps exactly that frame. */}
        <Image src={video.poster} alt="" fill sizes="(min-width: 64rem) 208px, 42vw" quality={60} />
        <span className="vd-short-scrim" aria-hidden="true" />
        <span className="vd-short-platform t-label" aria-hidden="true">
          {platform}
        </span>
        <span className="vd-short-title">
          {video.title}
          <span className="sr-only"> ({platform})</span>
          <Icon name="arrow-up-right" size={16} className="vd-short-out" />
        </span>
      </span>
    </a>
  )
}
