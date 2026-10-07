import { notFound } from 'next/navigation'
import { publishedPosts } from '@/components/writing/posts'
import { postMarkdown, postUrl } from '@/components/writing/markdown'

// Markdown twin of each published article, for agents. Static, one file per post.
export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return publishedPosts().map((p) => ({ slug: p.slug }))
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = publishedPosts().find((p) => p.slug === slug)
  if (!post) notFound()
  return new Response(postMarkdown(post), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      Link: `<${postUrl(post.slug)}>; rel="canonical"`,
    },
  })
}
