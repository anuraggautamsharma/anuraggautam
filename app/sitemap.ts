import type { MetadataRoute } from 'next'
import { SITE_URL, pages, site } from '@/lib/site'
import { hasVideos, publishedWatchPages, watchPath } from '@/lib/videos'
import {
  HUB_INDEX_THRESHOLD,
  newestDate,
  postPath,
  postsByTopic,
  publishedPosts,
  topicPath,
  topicsWithCounts,
} from '@/components/writing/posts'

// /watch appears once the first real video does (a YouTube feed can add one without a deploy).
export const revalidate = 3600

// lastModified comes from real content dates only. Never new Date().
// Not listed: /gtm (a permanent redirect to /method), /newsletter and /links (aliases that
// redirect to /subscribe and /start), /subscribe/confirm (noindex, per-person links) and
// /credits (noindex, spec §5.6, §7.5; crawlers still reach it via the footer).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = publishedPosts()
  const newest = newestDate(posts) ?? site.updated
  const hubs = topicsWithCounts().filter((t) => t.count >= HUB_INDEX_THRESHOLD)
  const watchPages = publishedWatchPages()
  const showWatch = await hasVideos().catch(() => false)

  return [
    { url: SITE_URL, lastModified: site.updated },
    { url: `${SITE_URL}/method`, lastModified: site.updated },
    { url: `${SITE_URL}/about`, lastModified: site.updated },
    { url: `${SITE_URL}/contact`, lastModified: site.updated },
    { url: `${SITE_URL}/community`, lastModified: site.updated },
    { url: `${SITE_URL}/start`, lastModified: site.updated },
    { url: `${SITE_URL}/subscribe`, lastModified: newest },
    { url: `${SITE_URL}/writing`, lastModified: newest },
    ...posts.map((p) => ({
      url: `${SITE_URL}${postPath(p.slug)}`,
      lastModified: p.updated ?? p.date,
      images: [`${SITE_URL}${postPath(p.slug)}/opengraph-image`],
    })),
    // Only hubs deep enough to be indexable (the others are noindex).
    ...hubs.map((h) => ({
      url: `${SITE_URL}${topicPath(h.topic)}`,
      lastModified: newestDate(postsByTopic(h.topic)) ?? newest,
    })),
    ...(showWatch ? [{ url: `${SITE_URL}/watch`, lastModified: watchPages[0]?.date ?? site.updated }] : []),
    ...(showWatch
      ? watchPages.map((v) => ({
          url: `${SITE_URL}${watchPath(v.slug)}`,
          lastModified: v.date,
          videos: [
            {
              title: v.title,
              thumbnail_loc: `https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`,
              description: v.description,
              player_loc: `https://www.youtube-nocookie.com/embed/${v.youtubeId}`,
              publication_date: v.date,
            },
          ],
        }))
      : []),
    { url: `${SITE_URL}/privacy`, lastModified: pages.privacy.updated },
  ]
}
