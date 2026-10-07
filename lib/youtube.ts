import 'server-only'

/**
 * YouTube's public RSS feeds (PLAN_V3 §5). Unofficial, so every call is wrapped: a failure
 * or a malformed feed returns [] and the site simply shows fewer videos. Parsed with
 * regex, so there is no XML dependency. Fetches revalidate hourly.
 */

export type FeedEntry = {
  youtubeId: string
  title: string
  /** YYYY-MM-DD */
  date: string
  description: string
}

const FEED = 'https://www.youtube.com/feeds/videos.xml'
const CHANNEL_ID = /^UC[\w-]{22}$/
const VIDEO_ID = /^[\w-]{11}$/

/**
 * The uploads playlists derived from a channel id (UC…): long-form (UULF…) and Shorts (UUSH…).
 * Returns null for anything that isn't a channel id.
 */
export function uploadPlaylists(channelId: string): { long: string; short: string } | null {
  if (!CHANNEL_ID.test(channelId)) return null
  const rest = channelId.slice(2)
  return { long: `UULF${rest}`, short: `UUSH${rest}` }
}

/** Poster URLs on i.ytimg.com (allowed in next.config `images.remotePatterns`). */
export const ytThumb = (id: string, size: 'maxres' | 'hq') =>
  `https://i.ytimg.com/vi/${id}/${size === 'maxres' ? 'maxresdefault' : 'hqdefault'}.jpg`

export const ytWatchUrl = (id: string, startSeconds?: number) =>
  `https://www.youtube.com/watch?v=${id}${startSeconds ? `&t=${startSeconds}s` : ''}`

export const ytShortUrl = (id: string) => `https://www.youtube.com/shorts/${id}`

/** The privacy-enhanced embed (no cookies until the viewer plays). */
export const ytEmbedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}`

/**
 * The best poster that exists: maxres (1280×720) when YouTube generated one, else hq
 * (480×360, letterboxed; `object-fit: cover` at 16:9 trims the bars exactly). Never throws.
 */
export async function bestThumb(id: string): Promise<string> {
  const maxres = ytThumb(id, 'maxres')
  try {
    const res = await fetch(maxres, { method: 'HEAD', signal: AbortSignal.timeout(3000), next: { revalidate: 86400 } })
    if (res.ok) return maxres
  } catch {
    // Network trouble: hq always exists.
  }
  return ytThumb(id, 'hq')
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
        return Number.isFinite(code) ? String.fromCodePoint(code) : m
      }
      return ENTITIES[e.toLowerCase()] ?? m
    })
    .trim()
}

const pick = (xml: string, tag: string) => {
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(xml)
  return m ? decode(m[1]) : ''
}

/** Parse a YouTube Atom feed. Entries missing an id, title or date are dropped. */
export function parseFeed(xml: string): FeedEntry[] {
  const out: FeedEntry[] = []
  for (const chunk of xml.split('<entry>').slice(1)) {
    const entry = chunk.split('</entry>')[0]
    const youtubeId = pick(entry, 'yt:videoId')
    const title = pick(entry, 'title')
    const published = pick(entry, 'published')
    const date = /^\d{4}-\d{2}-\d{2}/.exec(published)?.[0]
    if (!VIDEO_ID.test(youtubeId) || !title || !date) continue
    out.push({ youtubeId, title, date, description: pick(entry, 'media:description') })
  }
  return out
}

/** One uploads playlist's latest entries (YouTube returns up to 15). [] on any failure. */
export async function fetchPlaylist(playlistId: string): Promise<FeedEntry[]> {
  try {
    const res = await fetch(`${FEED}?playlist_id=${encodeURIComponent(playlistId)}`, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    return parseFeed(await res.text())
  } catch {
    return []
  }
}
