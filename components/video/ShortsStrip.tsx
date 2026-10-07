import { pages } from '@/lib/site'
import type { Video } from '@/lib/videos'
import { ShortTile } from './ShortTile'
import './video.css'

/**
 * Trail Markers: Shorts and Reels in one horizontal snap strip (the only sideways scroll on
 * the site). Renders nothing without real items.
 */
export function ShortsStrip({ videos, id = 'trail-markers' }: { videos: Video[]; id?: string }) {
  if (!videos.length) return null
  const titleId = `${id}-title`
  return (
    <section id={id} className="vd-strip-sec" aria-labelledby={titleId}>
      <div className="wrap vd-rowhead">
        <h2 id={titleId} className="t-label vd-rowhead-title">
          <span className="vd-blaze" aria-hidden="true" />
          {pages.watch.shortsH}
        </h2>
        <span className="vd-rowhead-rule" aria-hidden="true" />
        <span className="t-label vd-rowhead-n" aria-hidden="true">
          {String(videos.length).padStart(2, '0')}
        </span>
      </div>
      <ul className="vd-strip" role="list">
        {videos.map((v) => (
          <li key={v.href}>
            <ShortTile video={v} />
          </li>
        ))}
      </ul>
    </section>
  )
}
