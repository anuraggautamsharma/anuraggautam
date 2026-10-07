import { SITE_URL } from '@/lib/site'
import { publishedPosts } from '@/components/writing/posts'
import { llmsCorePages, llmsHeader, llmsSections } from '@/components/writing/llms'

// Static, refreshed hourly so a Campfire that has ended drops off without a deploy.
export const dynamic = 'force-static'
export const revalidate = 3600

export function GET() {
  const posts = publishedPosts()
  const body = [
    llmsHeader(),
    '',
    llmsCorePages(),
    '',
    '## Writing',
    ...(posts.length
      ? posts.map((p) => `- [${p.title}](${SITE_URL}/md/writing/${p.slug}): ${p.description}`)
      : ['- Nothing published yet.']),
    '',
    llmsSections(),
    '',
    '## Optional',
    `- [Full text of all writing and video transcripts](${SITE_URL}/llms-full.txt)`,
    `- [RSS](${SITE_URL}/rss.xml)`,
    '',
  ].join('\n')

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
