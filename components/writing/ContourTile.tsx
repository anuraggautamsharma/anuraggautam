import { TOPICS, TOPIC_HUE, topicCamp, type Post } from './posts'

// Small, stable string hash (FNV-1a), so every note gets its own patch of terrain and
// keeps it across builds, cards and its own cover.
function hash(s: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

const pct = (n: number) => `${Math.round(n * 10) / 10}%`

/**
 * Where a note sits on the map: which contour sheet, which patch of it, and where the pin
 * and the trail to it land. All values are derived from the slug.
 */
export function tileGeometry(slug: string) {
  const h = hash(slug)
  const r = (shift: number) => ((h >>> shift) & 0xff) / 255
  const px = 34 + r(0) * 40 // pin x 34–74%
  const py = 30 + r(8) * 30 // pin y 30–60%
  return {
    sheet: h & 1 ? 'b' : 'a',
    tx: pct(r(16) * 100),
    ty: pct(r(24) * 100),
    zoom: pct(150 + r(4) * 70), // 150–220%: the contour weight reads at card size
    px,
    py,
    // Trail: from the lower-left edge, bending through a hashed control point to the pin.
    route: `M ${Math.round(4 + r(12) * 14)} 104 Q ${Math.round(px * 0.35 + r(20) * 20)} ${Math.round(py + 18 + r(28) * 16)} ${Math.round(px)} ${Math.round(py)}`,
  }
}

/**
 * The contour tile: a note's thumbnail on cards and its cover on the article. A patch of
 * topographic map in the topic's hue, with the camp pin and the trail that reaches it.
 * Purely decorative (aria-hidden); the title and meta live in real text beside it.
 */
export function ContourTile({
  post,
  aspect = '3/2',
  variant = 'card',
  className,
}: {
  post: Post
  aspect?: '3/2' | '21/9'
  variant?: 'card' | 'cover'
  className?: string
}) {
  const g = tileGeometry(post.slug)
  const camp = topicCamp(post.topic)
  const mark = camp ? String(camp.n).padStart(2, '0') : null
  const tag = camp ? `Camp ${mark} · ${camp.name}` : TOPICS[post.topic].label

  return (
    <div
      className={['wr-tile', className].filter(Boolean).join(' ')}
      data-hue={TOPIC_HUE[post.topic]}
      data-variant={variant}
      aria-hidden="true"
      style={
        {
          '--ar': aspect.replace('/', ' / '),
          '--topo-src': `url(/textures/topo-${g.sheet}.svg)`,
          '--tx': g.tx,
          '--ty': g.ty,
          '--tz': g.zoom,
          '--px': `${g.px}%`,
          '--py': `${g.py}%`,
        } as React.CSSProperties
      }
    >
      <svg className="wr-tile-route" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
        <path d={g.route} className="wr-tile-route-casing" vectorEffect="non-scaling-stroke" />
        <path d={g.route} className="wr-tile-route-line" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="wr-tile-pin">{mark ?? <span className="wr-tile-pin-dot" />}</span>
      <span className="wr-tile-tag t-label">{tag}</span>
    </div>
  )
}
