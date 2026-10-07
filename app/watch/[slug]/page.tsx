import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MDXContent } from '@content-collections/mdx/react'
import { SITE_URL, chapters, pages, person, videoSeries } from '@/lib/site'
import { isoDate, longDate } from '@/lib/dates'
import { breadcrumbs, videoJsonLd } from '@/lib/schema'
import { bestThumb, ytThumb, ytWatchUrl } from '@/lib/youtube'
import {
  chapterSeconds,
  durationMinutes,
  formatDuration,
  getWatchPage,
  routableWatchPages,
  watchMarkdownPath,
  watchPath,
  type WatchPage,
} from '@/lib/videos'
import { JsonLd } from '@/components/ui/JsonLd'
import { Icon } from '@/components/ui/Icon'
import { NoteCard } from '@/components/writing/NoteCard'
import { publishedPosts } from '@/components/writing/posts'
import { Subscribe } from '@/components/subscribe/Subscribe'
import { VideoFacade } from '@/components/video/VideoFacade'
import '@/components/video/video.css'

// One static page per watch page (content/watch/*.mdx). With none, every slug 404s.
export const dynamicParams = false

export function generateStaticParams() {
  return routableWatchPages().map((v) => ({ slug: v.slug }))
}

type Props = { params: Promise<{ slug: string }> }

// Long titles step the H1 down so they hold to four lines on a phone (as articles do).
const LONG_TITLE = 56

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const v = getWatchPage(slug)
  if (!v) return {}
  const path = watchPath(slug)
  return {
    title: v.title,
    description: v.description,
    authors: [{ name: person.name, url: `${SITE_URL}/about` }],
    alternates: {
      canonical: path,
      types: { 'text/markdown': watchMarkdownPath(slug), 'application/rss+xml': '/rss.xml' },
    },
    openGraph: {
      type: 'video.other',
      url: path,
      siteName: person.name,
      locale: 'en_US',
      title: v.title,
      description: v.description,
      images: [{ url: await bestThumb(v.youtubeId), alt: v.title }],
    },
    twitter: { card: 'summary_large_image', title: v.title, description: v.description },
    ...(v.draft ? { robots: { index: false, follow: false } } : {}),
  }
}

function pageJsonLd(v: WatchPage) {
  const series = videoSeries[v.series].name
  return {
    '@context': 'https://schema.org',
    ...breadcrumbs([
      { name: 'Home', path: '' },
      { name: 'Field Notes', path: '/writing' },
      { name: pages.watch.tabs.watch, path: '/watch' },
      { name: `${series}: ${v.title}` },
    ]),
  }
}

export default async function WatchPageRoute({ params }: Props) {
  const { slug } = await params
  const v = getWatchPage(slug)
  if (!v) notFound()

  const copy = pages.watch
  const series = videoSeries[v.series]
  const time = formatDuration(v.duration)
  const poster = await bestThumb(v.youtubeId).catch(() => ytThumb(v.youtubeId, 'hq'))
  const related = v.relatedNote ? publishedPosts().find((p) => p.slug === v.relatedNote) : undefined
  const words = v.wordCount

  return (
    <article className="vd-page" data-tone="paper" data-nav="paper" data-alt={chapters.notes.alt}>
      {v.draft ? (
        <p className="vd-draft t-label" role="note">
          Draft · not published · only visible in development
        </p>
      ) : null}

      <header className="wrap vd-head">
        <nav aria-label="Breadcrumb" className="vd-crumbs t-label">
          <ol>
            <li>
              <span className="vd-blaze" aria-hidden="true" />
              <Link href="/writing">Field Notes</Link>
            </li>
            <li>
              <Link href="/watch">{copy.tabs.watch}</Link>
            </li>
            <li>{series.name}</li>
          </ol>
        </nav>

        <h1 className="t-h1 vd-title" data-long={v.title.length > LONG_TITLE || undefined}>
          {v.title}
        </h1>
        <p className="t-lead vd-dek">{v.description}</p>

        <div className="vd-meta">
          <p className="vd-byline">
            By{' '}
            <Link rel="author" href="/about" className="link">
              {person.name}
            </Link>
          </p>
          <p className="t-label vd-meta-line">
            <time dateTime={isoDate(v.date)}>{longDate(v.date)}</time>
            {time ? (
              <time dateTime={v.duration} aria-label={durationMinutes(v.duration)}>
                {time}
              </time>
            ) : null}
            <span>{series.name}</span>
          </p>
        </div>
      </header>

      <div className="wrap vd-stage">
        <VideoFacade youtubeId={v.youtubeId} title={v.title} poster={poster} priority />
      </div>

      <div className="wrap vd-doc">
        {v.chapters.length ? (
          <aside className="vd-aside" aria-labelledby="chapters">
            <nav className="vd-chapters" aria-labelledby="chapters">
              <h2 id="chapters" className="t-label vd-label">
                <span className="vd-blaze" aria-hidden="true" />
                {copy.chaptersH}
              </h2>
              <ol>
                {v.chapters.map((c) => {
                  const s = chapterSeconds(c.t)
                  return (
                    <li key={c.t}>
                      <a className="vd-chapter" href={ytWatchUrl(v.youtubeId, s)} rel="noopener" data-seek={s} data-seek-for={v.youtubeId}>
                        <span className="vd-chapter-t">{c.t}</span>
                        <span>{c.label}</span>
                        <span className="vd-chapter-go" aria-hidden="true">
                          <Icon name="arrow-right" size={16} />
                        </span>
                      </a>
                    </li>
                  )
                })}
              </ol>
            </nav>
          </aside>
        ) : null}

        <div className="vd-main">
          <section className="vd-takeaways" aria-labelledby="takeaways">
            <h2 id="takeaways" className="t-label vd-label">
              {copy.takeawaysH}
            </h2>
            <ol>
              {v.takeaways.map((t, i) => (
                <li key={i}>
                  <span className="vd-n" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </section>

          {v.markdown.trim() ? (
            <details className="vd-transcript" id="transcript">
              <summary>
                <span className="t-label vd-label">
                  <span className="vd-blaze" aria-hidden="true" />
                  {copy.transcript}
                </span>
                <span className="t-label vd-transcript-words">{words.toLocaleString('en-US')} words</span>
              </summary>
              <div className="vd-transcript-body">
                <MDXContent code={v.mdx} />
              </div>
            </details>
          ) : null}

          {related ? (
            <section className="vd-related" aria-labelledby="related-note">
              <h2 id="related-note" className="t-label vd-label">
                <span className="vd-blaze" aria-hidden="true" />
                {copy.related}
              </h2>
              <NoteCard post={related} size="md" headingLevel="h3" />
            </section>
          ) : null}
        </div>
      </div>

      <div className="wrap vd-foot">
        <Subscribe variant="card" source="watch" headingLevel="h2" />
      </div>

      <JsonLd
        data={videoJsonLd({
          slug: v.slug,
          title: v.title,
          description: v.description,
          date: isoDate(v.date),
          youtubeId: v.youtubeId,
          duration: v.duration,
          chapters: v.chapters,
          transcript: v.markdown,
        })}
      />
      <JsonLd data={pageJsonLd(v)} />
    </article>
  )
}
