import 'server-only'
import { allPosts, type Post } from 'content-collections'
import { camps, type Camp } from '@/lib/site'
import { newestFirst } from '@/lib/dates'

export type { Post }
export type Topic = Post['topic']

// Draft posts never list, never enter feeds or the sitemap. In `next dev` the article
// route still serves them (with a DRAFT banner and noindex) so they can be reviewed.
export const SHOW_DRAFTS = process.env.NODE_ENV === 'development'

const byDate = (a: Post, b: Post) => newestFirst(a.date, b.date) || a.docNo.localeCompare(b.docNo)

/** Published posts, newest first. */
export function publishedPosts(): Post[] {
  return allPosts.filter((p) => !p.draft).sort(byDate)
}

/** Posts the article route can render. */
export function routablePosts(): Post[] {
  return (SHOW_DRAFTS ? [...allPosts] : allPosts.filter((p) => !p.draft)).sort(byDate)
}

export function getPost(slug: string): Post | undefined {
  return routablePosts().find((p) => p.slug === slug)
}

/** Older and newer neighbours among published posts. */
export function adjacentPosts(slug: string): { prev?: Post; next?: Post } {
  const list = publishedPosts()
  const i = list.findIndex((p) => p.slug === slug)
  if (i === -1) return {}
  return { prev: list[i + 1], next: list[i - 1] }
}

/** Newest publish-or-update date across published posts (for feeds and the sitemap). */
export function newestDate(posts: Post[] = publishedPosts()): string | undefined {
  return posts.map((p) => p.updated ?? p.date).sort().at(-1)
}

export const TOPICS: Record<Topic, { label: string; intro: string }> = {
  positioning: {
    label: 'Positioning',
    intro: 'Who you are for, what you replace, and why a buyer should care.',
  },
  pricing: {
    label: 'Pricing',
    intro: 'Value metrics, packaging and paid pilots: how to make a heavy buying decision feel light.',
  },
  pipeline: {
    label: 'Pipeline',
    intro: 'Launches, founder-led content, AI search and outbound: qualified attention every week, not every launch.',
  },
  workflows: {
    label: 'Workflows',
    intro: 'CRM, routing, procurement kits and automation. The seams where deals sit and wait.',
  },
  team: {
    label: 'Team',
    intro: 'First GTM hires, enablement and operating rhythm. Making the machine run when the founder is on a plane.',
  },
  'physical-ai': {
    label: 'Physical AI',
    intro: 'Robots, pilots, sites and fleets, and why the hard part is rarely the demo.',
  },
  'ai-infra': {
    label: 'AI infrastructure',
    intro: 'Selling infrastructure and developer tools to developers and enterprises at the same time.',
  },
}

/** The Summit Route camp a topic belongs to. Physical AI and AI infra span every camp, so they have none. */
export function topicCamp(topic: Topic): Camp | undefined {
  return camps.find((c) => c.topic === topic)
}

/** Note-tile hue per topic (spec §5.4). Drives `.wr-tile[data-hue]` and the card's tile palette. */
export type NoteHue = 'glacier' | 'sunrise' | 'alpine' | 'granite'
export const TOPIC_HUE: Record<Topic, NoteHue> = {
  positioning: 'glacier',
  pricing: 'sunrise',
  pipeline: 'alpine',
  workflows: 'granite',
  team: 'alpine',
  'physical-ai': 'glacier',
  'ai-infra': 'granite',
}

// Text-safe accent per hue (every value ≥ 5.6:1 on paper), used where no camp applies.
const HUE_INK: Record<NoteHue, string> = {
  glacier: 'var(--c-glacier-700)',
  sunrise: 'var(--c-sunrise-700)',
  alpine: 'var(--c-alpine-700)',
  granite: 'var(--c-granite-800)',
}

/** The accent colour for a topic: its camp hue when it has a camp, else its tile hue's text tone. */
export function topicAccent(topic: Topic): string {
  return topicCamp(topic)?.hue ?? HUE_INK[TOPIC_HUE[topic]]
}

/** "FIELD NOTE · 6 MIN" / "PAPER · 12 MIN" */
export function noteMeta(post: Post): string {
  return `${post.kind === 'paper' ? 'Paper' : 'Field note'} · ${post.readingMinutes} min`
}

/**
 * The topic filter only earns its place once there is something to filter: at least four
 * published notes across at least two topics. Below that, the count line stands alone.
 */
export function showTopicFilter(posts: Post[] = publishedPosts(), topics = topicsWithCounts()): boolean {
  return posts.length >= 4 && topics.length >= 2
}

/** Topics with at least one published post, in a stable order, with counts. */
export function topicsWithCounts(): { topic: Topic; label: string; count: number }[] {
  const counts = new Map<Topic, number>()
  for (const p of publishedPosts()) counts.set(p.topic, (counts.get(p.topic) ?? 0) + 1)
  return (Object.keys(TOPICS) as Topic[])
    .filter((t) => (counts.get(t) ?? 0) > 0)
    .map((t) => ({ topic: t, label: TOPICS[t].label, count: counts.get(t) ?? 0 }))
}

export function postsByTopic(topic: Topic): Post[] {
  return publishedPosts().filter((p) => p.topic === topic)
}

/** A topic hub is indexable only once it has real depth. */
export const HUB_INDEX_THRESHOLD = 3

/** Group posts by year, newest year first. */
export function groupByYear(posts: Post[]): { year: string; posts: Post[] }[] {
  const groups = new Map<string, Post[]>()
  for (const p of posts) {
    const y = p.date.slice(0, 4)
    groups.set(y, [...(groups.get(y) ?? []), p])
  }
  return [...groups.entries()].sort((a, b) => newestFirst(a[0], b[0])).map(([year, list]) => ({ year, posts: list }))
}

export const postPath = (slug: string) => `/writing/${slug}`
export const topicPath = (topic: Topic) => `/writing/topic/${topic}`
