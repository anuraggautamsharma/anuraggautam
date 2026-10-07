import { SITE_URL, newsletter, pages, person, site } from '@/lib/site'
import { rfc822 } from '@/lib/dates'
import { TOPICS, newestDate, publishedPosts } from '@/components/writing/posts'
import { postUrl } from '@/components/writing/markdown'

export const dynamic = 'force-static'

// XML 1.0 text escaping, plus stripping control characters XML cannot carry at all.
const esc = (s: string) =>
  s
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

// Summary feed: MDX compiles to code, not HTML, so there is no content:encoded.
export function GET() {
  const posts = publishedPosts()
  const built = newestDate(posts) ?? site.updated

  const items = posts
    .map((p) => {
      const url = postUrl(p.slug)
      const categories = [TOPICS[p.topic].label, ...p.tags].map((c) => `      <category>${esc(c)}</category>`).join('\n')
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${rfc822(p.date)}</pubDate>
      <dc:creator>${esc(person.name)}</dc:creator>
      <description>${esc(p.description)}</description>
${categories}
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${esc(`${newsletter.name} · ${person.name}`)}</title>
    <link>${SITE_URL}/writing</link>
    <description>${esc(pages.writing.hero.line)}</description>
    <language>en</language>
    <copyright>${esc(`© ${built.slice(0, 4)} ${person.name}`)}</copyright>
    <lastBuildDate>${rfc822(built)}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`
  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
