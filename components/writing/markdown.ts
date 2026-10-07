import 'server-only'
import { SITE_URL, person } from '@/lib/site'
import { isoDate } from '@/lib/dates'
import { TOPICS, postPath, type Post } from './posts'

/** Canonical absolute URL for a post. */
export const postUrl = (slug: string) => `${SITE_URL}${postPath(slug)}`

/**
 * One post as plain markdown for agents (/md/writing/[slug], llms-full.txt):
 * title, a dated byline, the takeaways, the body, the FAQ and the references.
 */
export function postMarkdown(post: Post, { headingLevel = 1 }: { headingLevel?: 1 | 2 } = {}) {
  const h = '#'.repeat(headingLevel)
  const sub = '#'.repeat(headingLevel + 1)
  const dates = [`Published ${isoDate(post.date)}`, post.updated ? `Updated ${isoDate(post.updated)}` : null]
    .filter(Boolean)
    .join(' · ')

  const out: string[] = [
    `${h} ${post.title}`,
    '',
    `By ${person.name} · ${dates} · ${post.docNo} · ${TOPICS[post.topic].label}`,
    `Canonical: ${postUrl(post.slug)}`,
    '',
    `> ${post.description}`,
    '',
    `${sub} Key takeaways`,
    '',
    ...post.takeaways.map((t) => `- ${t}`),
    '',
    // Root-relative body links become absolute: this text is read out of context (llms-full.txt, /md).
    demote(post.markdown.trim(), headingLevel - 1).replace(/\]\(\/(?!\/)/g, `](${SITE_URL}/`),
  ]

  if (post.faqs.length) {
    out.push('', `${sub} FAQ`, '')
    for (const f of post.faqs) out.push(`**${f.q}**`, '', f.a, '')
  }
  if (post.sources.length) {
    out.push('', `${sub} References`, '')
    post.sources.forEach((s, i) => out.push(`${i + 1}. [${s.title}](${s.url})`))
  }
  out.push('', `---`, '', `${person.entityBio} ${SITE_URL}/about`)
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

// Push body headings down so they nest under the post title when posts are concatenated.
function demote(md: string, by: number) {
  if (!by) return md
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
