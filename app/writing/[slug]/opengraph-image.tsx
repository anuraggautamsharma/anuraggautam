import { OG_SIZE } from '@/lib/og'
import { dotDate } from '@/lib/dates'
import { renderOgCard } from '@/components/writing/OgCard'
import { TOPICS, TOPIC_HUE, getPost } from '@/components/writing/posts'

export const alt = 'Field note by Anurag Gautam on taking complex technology to market'
export const size = OG_SIZE
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) {
    return renderOgCard({ label: 'ANURAGGAUTAM.COM · FIELD NOTES', title: 'Field Notes on taking complex technology to market.' })
  }
  return renderOgCard({
    label: `FIELD NOTES · ${post.docNo}`,
    meta: dotDate(post.updated ?? post.date),
    title: post.title,
    section: TOPICS[post.topic].label.toUpperCase(),
    hue: TOPIC_HUE[post.topic],
  })
}
