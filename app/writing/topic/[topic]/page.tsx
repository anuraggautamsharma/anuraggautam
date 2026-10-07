import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { SITE_URL, chapters, pages } from '@/lib/site'
import { pageAlternates } from '@/lib/meta'
import { OG_DEFAULT_IMAGE } from '@/lib/og'
import { breadcrumbs } from '@/lib/schema'
import { JsonLd } from '@/components/ui/JsonLd'
import { Arrow } from '@/components/ui/Arrow'
import { WritingRegister } from '@/components/writing/WritingRegister'
import { SubscribeBlock, TopicLinks } from '@/components/writing/IndexParts'
import { campLink } from '@/components/writing/EndMatter'
import {
  HUB_INDEX_THRESHOLD,
  TOPICS,
  postsByTopic,
  showTopicFilter,
  topicAccent,
  topicPath,
  topicsWithCounts,
  type Topic,
} from '@/components/writing/posts'

export const dynamicParams = false

export function generateStaticParams() {
  return topicsWithCounts().map((t) => ({ topic: t.topic }))
}

type Props = { params: Promise<{ topic: string }> }

function resolve(topic: string): Topic | null {
  return topic in TOPICS && postsByTopic(topic as Topic).length ? (topic as Topic) : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const topic = resolve((await params).topic)
  if (!topic) return {}
  const { label, intro } = TOPICS[topic]
  const count = postsByTopic(topic).length
  const title = `${label}: Field Notes on Complex Tech GTM`
  return {
    title,
    description: intro,
    alternates: pageAlternates(topicPath(topic)),
    openGraph: {
      type: 'website',
      url: topicPath(topic),
      siteName: 'Anurag Gautam',
      locale: 'en_US',
      title,
      description: intro,
      images: [OG_DEFAULT_IMAGE],
    },
    // Thin hubs stay out of the index until they have real depth.
    robots: { index: count >= HUB_INDEX_THRESHOLD, follow: true },
  }
}

export default async function TopicHub({ params }: Props) {
  const topic = resolve((await params).topic)
  if (!topic) notFound()
  const { label, intro } = TOPICS[topic]
  const posts = postsByTopic(topic)
  const camp = campLink(topic)

  return (
    <>
      <section
        data-tone="paper"
        data-nav="paper"
        data-alt={chapters.notes.alt}
        className="wr-hub"
        aria-labelledby="hub-title"
        style={{ '--hub-hue': topicAccent(topic) } as React.CSSProperties}
      >
        <div className="wrap">
          <nav aria-label="Breadcrumb" className="wr-crumbs t-label">
            <ol>
              <li>
                <span className="wr-crumbs-blaze" aria-hidden="true" />
                <Link href="/writing">{pages.writing.breadcrumb}</Link>
              </li>
              <li aria-current="page">{label}</li>
            </ol>
          </nav>
          <h1 id="hub-title" className="t-h1 wr-hub-title">
            {label}
          </h1>
          <p className="t-lead wr-hub-intro">{intro}</p>
          <p className="wr-hub-camp">
            <Link href={camp.href} className="link-go">
              {camp.label} <Arrow />
            </Link>
          </p>
        </div>
      </section>

      <section data-tone="paper" data-nav="paper" data-alt={chapters.notes.alt} className="wr-index wr-index-hub" aria-labelledby="hub-notes">
        <div className="wrap">
          <div className="wr-index-bar">
            <h2 id="hub-notes" className="t-label wr-index-count">
              <span className="blaze" aria-hidden="true" />
              {`${String(posts.length).padStart(2, '0')} ${posts.length === 1 ? 'note' : 'notes'} on ${label.toLowerCase()}`}
            </h2>
            {showTopicFilter() ? <TopicLinks topics={topicsWithCounts()} current={topic} /> : null}
          </div>
          <WritingRegister posts={posts} label={`Earlier notes on ${label.toLowerCase()}`} />
        </div>
      </section>

      <SubscribeBlock />

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': `${SITE_URL}${topicPath(topic)}#page`,
          url: `${SITE_URL}${topicPath(topic)}`,
          name: `${label}: Field Notes by Anurag Gautam`,
          description: intro,
          isPartOf: { '@id': `${SITE_URL}/#website` },
          breadcrumb: breadcrumbs([
            { name: 'Home', path: '' },
            { name: 'Field Notes', path: '/writing' },
            { name: label },
          ]),
        }}
      />
    </>
  )
}
