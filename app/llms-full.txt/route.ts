import { publishedPosts } from '@/components/writing/posts'
import { postMarkdown } from '@/components/writing/markdown'
import { llmsCorePages, llmsHeader, llmsSections } from '@/components/writing/llms'
import { publishedWatchPages, watchMarkdown } from '@/lib/videos'

export const dynamic = 'force-static'
export const revalidate = 3600

// The llms.txt head and v3 sections, then every published post in full (an H1 each with a
// dated byline), then every watch page's transcript.
export function GET() {
  const body = [
    [llmsHeader(), llmsCorePages(), llmsSections()].join('\n\n'),
    ...publishedPosts().map((p) => postMarkdown(p)),
    ...publishedWatchPages().map((v) => watchMarkdown(v)),
  ].join('\n\n---\n\n')
  return new Response(body.trimEnd() + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
