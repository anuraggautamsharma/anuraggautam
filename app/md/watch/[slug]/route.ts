import { notFound } from 'next/navigation'
import { publishedWatchPages, watchMarkdown, watchUrl } from '@/lib/videos'

// Markdown twin of each published watch page (chapters, takeaways, transcript), for agents.
// Static, one file per video; with no watch pages, every slug 404s.
export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return publishedWatchPages().map((v) => ({ slug: v.slug }))
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const v = publishedWatchPages().find((p) => p.slug === slug)
  if (!v) notFound()
  return new Response(watchMarkdown(v), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      Link: `<${watchUrl(v.slug)}>; rel="canonical"`,
    },
  })
}
