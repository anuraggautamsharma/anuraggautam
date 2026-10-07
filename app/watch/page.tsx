import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SITE_URL, chapters, pageMeta, pages, videoSeries } from '@/lib/site'
import { pageAlternates } from '@/lib/meta'
import { OG_DEFAULT_IMAGE } from '@/lib/og'
import { breadcrumbs } from '@/lib/schema'
import { SHOW_DRAFTS, latestVideos, type SeriesId, type Video } from '@/lib/videos'
import { ChapterLabel } from '@/components/ui/ChapterLabel'
import { JsonLd } from '@/components/ui/JsonLd'
import { Subscribe } from '@/components/subscribe/Subscribe'
import { VideoCard } from '@/components/video/VideoCard'
import { ShortsStrip } from '@/components/video/ShortsStrip'
import '@/components/video/video.css'

// The YouTube feed (when a channel is set) refreshes hourly, without a deploy.
export const revalidate = 3600

const { title, description } = pageMeta.watch

export const metadata: Metadata = {
  title,
  description,
  alternates: pageAlternates('/watch'),
  openGraph: {
    type: 'website',
    url: '/watch',
    siteName: 'Anurag Gautam',
    locale: 'en_US',
    title,
    description,
    images: [OG_DEFAULT_IMAGE],
  },
}

const absolute = (v: Video) => (v.external ? v.href : `${SITE_URL}${v.href}`)

/**
 * /watch: the video side of Field Notes. Lead video, then each series that has videos,
 * then the Trail Markers strip and the subscribe card. 404 until a real video exists
 * (drafts preview here in `next dev` only).
 */
export default async function WatchIndex() {
  const all = await latestVideos({ includeDrafts: SHOW_DRAFTS })
  if (!all.length) notFound()

  const copy = pages.watch
  const long = all.filter((v) => v.kind === 'long')
  const markers = all.filter((v) => v.kind !== 'long')
  const [lead, ...rest] = long
  const unsorted = rest.filter((v) => !v.series)
  const series = (Object.keys(videoSeries) as SeriesId[])
    .map((id) => ({ id, ...videoSeries[id], videos: rest.filter((v) => v.series === id) }))
    .filter((s) => s.videos.length)

  return (
    <div className="vd-hub" data-tone="paper" data-nav="paper" data-alt={chapters.notes.alt}>
      <header className="wrap vd-hub-head">
        <ChapterLabel name={copy.kicker} alt={chapters.notes.alt} />
        <h1 className="t-h1 vd-hub-title">{copy.title}</h1>
        <p className="t-lead vd-hub-line">{copy.line}</p>
        <nav className="vd-tabs" aria-label="Field Notes">
          <ul>
            <li>
              <Link className="chip" href="/writing">
                {copy.tabs.read}
              </Link>
            </li>
            <li>
              <Link className="chip" href="/watch" aria-current="page">
                {copy.tabs.watch}
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      {lead ? (
        <div className="wrap vd-hub-lead">
          <VideoCard video={lead} size="lg" headingLevel="h2" priority />
        </div>
      ) : null}

      {unsorted.length ? (
        <div className="wrap vd-hub-more">
          <ul className="vd-grid" role="list">
            {unsorted.map((v) => (
              <li key={v.href}>
                <VideoCard video={v} size="md" headingLevel="h2" />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {series.map((s) => (
        <section key={s.id} id={s.id} className="wrap vd-series" aria-labelledby={`${s.id}-title`}>
          <div className="vd-series-head">
            <div className="vd-rowhead">
              <h2 id={`${s.id}-title`} className="t-label vd-rowhead-title">
                <span className="vd-blaze" aria-hidden="true" />
                {s.name}
              </h2>
              <span className="vd-rowhead-rule" aria-hidden="true" />
              <span className="t-label vd-rowhead-n" aria-hidden="true">
                {String(s.videos.length).padStart(2, '0')}
              </span>
            </div>
            <p className="t-lead vd-series-line">{s.line}</p>
          </div>
          <ul className="vd-grid" role="list">
            {s.videos.map((v) => (
              <li key={v.href}>
                <VideoCard video={v} size="md" headingLevel="h3" />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <ShortsStrip videos={markers} />

      <div className="wrap vd-hub-sub">
        <Subscribe variant="card" source="watch" headingLevel="h2" />
      </div>

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': `${SITE_URL}/watch#page`,
          url: `${SITE_URL}/watch`,
          name: title,
          description,
          isPartOf: { '@id': `${SITE_URL}/#website` },
          author: { '@id': `${SITE_URL}/#person` },
          breadcrumb: breadcrumbs([{ name: 'Home', path: '' }, { name: 'Field Notes', path: '/writing' }, { name: copy.tabs.watch }]),
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: long
              .filter((v) => !v.draft)
              .map((v, i) => ({ '@type': 'ListItem', position: i + 1, url: absolute(v), name: v.title })),
          },
        }}
      />
    </div>
  )
}
