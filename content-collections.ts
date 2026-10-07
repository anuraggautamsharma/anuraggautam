import { defineCollection, defineConfig } from '@content-collections/core'
import { compileMDX } from '@content-collections/mdx'
import { z } from 'zod'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypePrettyCode from 'rehype-pretty-code'
import readingTime from 'reading-time'
import GithubSlugger from 'github-slugger'

/** Field Notes topics, shared by posts and watch pages. */
const TOPICS = ['positioning', 'pricing', 'pipeline', 'workflows', 'team', 'physical-ai', 'ai-infra'] as const

type TocItem = { depth: number; text: string; id: string }

// Collect h2/h3 headings for the table of contents, skipping fenced code blocks.
function toc(markdown: string): TocItem[] {
  const slugger = new GithubSlugger()
  const items: TocItem[] = []
  let inFence = false
  for (const line of markdown.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence
    if (inFence) continue
    const match = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line)
    if (!match) continue
    const text = match[2].replace(/[*_`]/g, '')
    items.push({ depth: match[1].length, text, id: slugger.slug(text) })
  }
  return items
}

// Plain markdown for agents (llms-full.txt, /md routes). Self-closing MDX islands are
// dropped (they keep an SSR table fallback in the page), inline components are reduced
// to their text, and MDX comments (editor notes) never leak out.
function agentMarkdown(src: string) {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^<[A-Z][^>]*\/>\s*$/gm, '')
    .replace(/<Sidenote>([\s\S]*?)<\/Sidenote>/g, ' ($1)')
    .replace(/<PullQuote[^>]*>([\s\S]*?)<\/PullQuote>/g, (_, q: string) => `> ${q.trim().replace(/\n+/g, ' ')}`)
    .replace(/<Figure[^>]*\bcaption="([^"]*)"[^>]*>/g, '*Figure: $1*\n')
    .replace(/<Callout[^>]*\blabel="([^"]*)"[^>]*>/g, '**$1.** ')
    .replace(/<\/?[A-Z][A-Za-z]*(?:\s[^>]*)?>/g, '')
    .replace(/\n{3,}/g, '\n\n')
}

const posts = defineCollection({
  name: 'posts',
  directory: 'content/writing',
  include: '**/*.mdx',
  schema: z.object({
    title: z.string(),
    seoTitle: z.string().max(60).optional(),
    description: z.string().max(160),
    date: z.iso.date(),
    updated: z.iso.date().optional(),
    kind: z.enum(['essay', 'paper', 'note']).default('essay'),
    docNo: z.string().regex(/^AG-[EPN]-\d{3}$/),
    topic: z.enum(TOPICS),
    tags: z.array(z.string()).default([]),
    takeaways: z.array(z.string()).min(3).max(5),
    abstract: z.string().optional(),
    pdf: z.string().optional(),
    faqs: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    sources: z.array(z.object({ title: z.string(), url: z.url() })).default([]),
    cover: z.string().optional(),
    draft: z.boolean().default(false),
    /** Auto-email this note to Field Notes subscribers (app/api/cron/field-notes). Posts dated before `newsletter.since` never go out. */
    notify: z.boolean().default(true),
    content: z.string(),
  }),
  transform: async (doc, ctx) => {
    const mdx = await compileMDX(ctx, doc, {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [
        rehypeSlug,
        [rehypeAutolinkHeadings, { behavior: 'wrap' }],
        [rehypePrettyCode, { theme: 'github-light', keepBackground: false }],
      ],
    })
    const markdown = agentMarkdown(doc.content)
    const words = readingTime(markdown)
    return {
      ...doc,
      slug: doc._meta.path,
      mdx,
      readingMinutes: Math.max(1, Math.round(words.minutes)),
      wordCount: words.words,
      toc: toc(doc.content),
      markdown,
    }
  },
})

// Watch pages (content/watch/*.mdx): one long-form video each, with the transcript as the body.
// README.md in that folder is ignored by the include. While the folder holds no .mdx, /watch 404s.
const videos = defineCollection({
  name: 'videos',
  directory: 'content/watch',
  include: '**/*.mdx',
  schema: z.object({
    title: z.string(),
    description: z.string().max(160),
    date: z.iso.date(),
    youtubeId: z.string().regex(/^[\w-]{11}$/, 'An 11-character YouTube video id'),
    series: z.enum(['route-teardown', 'trail-build', 'summit-talks']),
    topic: z.enum(TOPICS),
    /** ISO 8601, e.g. PT14M32S. */
    duration: z.string().regex(/^PT(?=\d)(?:\d+H)?(?:\d+M)?(?:\d+S)?$/, 'ISO 8601 duration, e.g. PT14M32S'),
    /** `t` is a timestamp, "m:ss" or "h:mm:ss". */
    chapters: z.array(z.object({ t: z.string().regex(/^(?:\d+:)?\d{1,2}:\d{2}$/), label: z.string() })).default([]),
    /** Slug of the Field Note this video pairs with. */
    relatedNote: z.string().optional(),
    takeaways: z.array(z.string()).min(3).max(5),
    draft: z.boolean().default(false),
    content: z.string(),
  }),
  transform: async (doc, ctx) => {
    const mdx = await compileMDX(ctx, doc, {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }]],
    })
    const markdown = agentMarkdown(doc.content)
    return {
      ...doc,
      slug: doc._meta.path,
      mdx,
      /** The transcript as plain markdown (watch page <details>, /md/watch, VideoObject.transcript). */
      markdown,
      wordCount: readingTime(markdown).words,
    }
  },
})

export default defineConfig({ content: [posts, videos] })
