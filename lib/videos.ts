import 'server-only'
import { cache } from 'react'
import { allVideos, type Video as WatchPage } from 'content-collections'
import { SITE_URL, channels, person, reels, videoSeries } from './site'
import { isoDate, newestFirst } from './dates'
import { bestThumb, fetchPlaylist, uploadPlaylists, ytShortUrl, ytWatchUrl } from './youtube'

/**
 * Every video the site knows about (PLAN_V3 §5), merged from three sources:
 * 1. watch pages, `content/watch/*.mdx` (a transcript each; served at /watch/[slug]);
 * 2. the YouTube uploads feeds, only once `channels.youtube.id` is set;
 * 3. Instagram Reels listed in `reels`.
 * De-duplicated by YouTube id; a watch page always wins over its feed item.
 * Nothing here is invented: with no channel, no pages and no reels, every list is empty
 * and every /watch route 404s.
 */

export type { WatchPage }
export type VideoKind = 'long' | 'short' | 'reel'
export type SeriesId = keyof typeof videoSeries

export type Video = {
  youtubeId?: string
  title: string
  /** YYYY-MM-DD */
  date: string
  kind: VideoKind
  /** /watch/[slug] for a watch page, else the YouTube or Instagram URL. */
  href: string
  poster: string
  /** ISO 8601, e.g. PT14M32S. Only watch pages know it (the feed doesn't carry it). */
  duration?: string
  series?: SeriesId
  slug?: string
  /** True when `href` leaves the site. */
  external: boolean
  /** Watch pages only, in `next dev` previews. Never true in production lists. */
  draft?: boolean
}

// Draft watch pages are routable in `next dev` (with a banner and noindex), like draft posts.
export const SHOW_DRAFTS = process.env.NODE_ENV === 'development'

const byDate = (a: { date: string; title: string }, b: { date: string; title: string }) =>
  newestFirst(a.date, b.date) || a.title.localeCompare(b.title)

/** Published watch pages, newest first. */
export function publishedWatchPages(): WatchPage[] {
  return allVideos.filter((v) => !v.draft).sort(byDate)
}

/** Watch pages the /watch/[slug] route can render (drafts too, in development). */
export function routableWatchPages(): WatchPage[] {
  return (SHOW_DRAFTS ? [...allVideos] : allVideos.filter((v) => !v.draft)).sort(byDate)
}

export function getWatchPage(slug: string): WatchPage | undefined {
  return routableWatchPages().find((v) => v.slug === slug)
}

export const watchPath = (slug: string) => `/watch/${slug}`
export const watchUrl = (slug: string) => `${SITE_URL}${watchPath(slug)}`
export const watchMarkdownPath = (slug: string) => `/md/watch/${slug}`

/** "PT14M32S" → "14:32", "PT1H2M5S" → "1:02:05". Undefined for anything unparseable. */
export function formatDuration(iso?: string): string | undefined {
  const m = iso ? /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso) : null
  if (!m) return undefined
  const [h, min, s] = [m[1], m[2], m[3]].map((x) => Number(x ?? 0))
  const pad = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(min)}:${pad(s)}` : `${min}:${pad(s)}`
}

/** "PT14M32S" → "14 min" (for screen readers and meta lines). */
export function durationMinutes(iso?: string): string | undefined {
  const m = iso ? /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso) : null
  if (!m) return undefined
  const total = Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0) + (Number(m[3] ?? 0) >= 30 ? 1 : 0)
  return `${Math.max(1, total)} min`
}

/** A chapter timestamp ("3:10", "1:02:05") in seconds. */
export function chapterSeconds(t: string): number {
  return t.split(':').reduce((acc, part) => acc * 60 + Number(part), 0)
}

// One poster lookup per id per render (the HEAD request itself is cached for a day).
const poster = cache(bestThumb)

type Entry = Omit<Video, 'poster'> & { posterFor: () => Promise<string> }

const fromWatchPage = (v: WatchPage): Entry => ({
  youtubeId: v.youtubeId,
  title: v.title,
  date: isoDate(v.date),
  kind: 'long',
  href: watchPath(v.slug),
  duration: v.duration,
  series: v.series,
  slug: v.slug,
  external: false,
  ...(v.draft ? { draft: true } : {}),
  posterFor: () => poster(v.youtubeId),
})

// Both uploads feeds, fetched together and once per render. [] without a channel.
const feeds = cache(async () => {
  const lists = channels.youtube.id ? uploadPlaylists(channels.youtube.id) : null
  if (!lists) return { long: [], short: [] }
  const [long, short] = await Promise.all([fetchPlaylist(lists.long), fetchPlaylist(lists.short)])
  return { long, short }
})

const entries = cache(async (includeDrafts: boolean): Promise<Entry[]> => {
  const pages = includeDrafts ? routableWatchPages() : publishedWatchPages()
  const out: Entry[] = pages.map(fromWatchPage)
  const seen = new Set(out.map((e) => e.youtubeId))

  const { long, short } = await feeds()
  for (const [kind, list] of [['long', long], ['short', short]] as const) {
    for (const f of list) {
      if (seen.has(f.youtubeId)) continue
      seen.add(f.youtubeId)
      out.push({
        youtubeId: f.youtubeId,
        title: f.title,
        date: f.date,
        kind,
        href: kind === 'long' ? ytWatchUrl(f.youtubeId) : ytShortUrl(f.youtubeId),
        external: true,
        posterFor: () => poster(f.youtubeId),
      })
    }
  }

  for (const r of reels) {
    out.push({
      title: r.title,
      // Reels carry no date in config; they sort after dated items of the same kind.
      date: '0000-00-00',
      kind: 'reel',
      href: r.permalink,
      external: true,
      posterFor: async () => r.poster,
    })
  }
  return out.sort(byDate)
})

/**
 * The newest videos, optionally of one kind. Never throws: any failure returns [].
 * `includeDrafts` is for the /watch preview in `next dev` only.
 */
export async function latestVideos(o: { kind?: VideoKind; limit?: number; includeDrafts?: boolean } = {}): Promise<Video[]> {
  try {
    const list = (await entries(Boolean(o.includeDrafts && SHOW_DRAFTS))).filter((e) => !o.kind || e.kind === o.kind)
    const picked = o.limit != null ? list.slice(0, Math.max(0, o.limit)) : list
    return await Promise.all(
      picked.map(async ({ posterFor, ...v }) => ({ ...v, poster: await posterFor().catch(() => '') })),
    ).then((vs) => vs.filter((v) => v.poster))
  } catch {
    return []
  }
}

/** True once at least one real video exists (any kind). Gates /watch, its nav chip and the sitemap. */
export async function hasVideos(): Promise<boolean> {
  if (publishedWatchPages().length || reels.length) return true
  if (!channels.youtube.id) return false
  return (await latestVideos({ limit: 1 })).length > 0
}

/**
 * One watch page as plain markdown for agents (/md/watch/[slug], llms-full.txt): title,
 * byline, links, chapters, takeaways and the transcript.
 */
export function watchMarkdown(v: WatchPage, { headingLevel = 1 }: { headingLevel?: 1 | 2 } = {}): string {
  const h = '#'.repeat(headingLevel)
  const sub = '#'.repeat(headingLevel + 1)
  const meta = [
    `Published ${isoDate(v.date)}`,
    videoSeries[v.series].name,
    formatDuration(v.duration),
  ].filter(Boolean)

  const out: string[] = [
    `${h} ${v.title}`,
    '',
    `Video by ${person.name} · ${meta.join(' · ')}`,
    `Canonical: ${watchUrl(v.slug)}`,
    `YouTube: ${ytWatchUrl(v.youtubeId)}`,
    ...(v.relatedNote ? [`Related field note: ${SITE_URL}/writing/${v.relatedNote}`] : []),
    '',
    `> ${v.description}`,
    '',
  ]
  if (v.chapters.length) {
    out.push(`${sub} Chapters`, '')
    for (const c of v.chapters) out.push(`- ${c.t} ${c.label}`)
    out.push('')
  }
  out.push(`${sub} Takeaways`, '', ...v.takeaways.map((t) => `- ${t}`), '', `${sub} Transcript`, '')
  // Transcript headings nest under "Transcript"; root-relative links become absolute.
  out.push(
    demote(v.markdown.trim(), headingLevel).replace(/\]\(\/(?!\/)/g, `](${SITE_URL}/`),
    '',
    '---',
    '',
    `${person.entityBio} ${SITE_URL}/about`,
  )
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

function demote(md: string, by: number) {
  let inFence = false
  return md
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) inFence = !inFence
      if (inFence) return line
      return line.replace(/^(#{1,5})(\s)/, (_, hashes: string, sp: string) => '#'.repeat(Math.min(6, hashes.length + by)) + sp)
    })
    .join('\n')
}
