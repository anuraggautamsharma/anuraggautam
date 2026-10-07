import type { Metadata } from 'next'
import { SITE_URL, chapters, pageMeta, pages } from '@/lib/site'
import { pageAlternates } from '@/lib/meta'
import { OG_DEFAULT_IMAGE } from '@/lib/og'
import { breadcrumbs } from '@/lib/schema'
import { JsonLd } from '@/components/ui/JsonLd'
import { PageHero } from '@/components/ui/PageHero'
import { WritingRegister } from '@/components/writing/WritingRegister'
import { FormatChips, SubscribeBlock, TopicLinks } from '@/components/writing/IndexParts'
import { hasVideos } from '@/lib/videos'
import { publishedPosts, showTopicFilter, topicsWithCounts } from '@/components/writing/posts'

const { title, description } = pageMeta.writing

// The Read | Watch chips appear once the first video does (a YouTube feed item needs no deploy).
export const revalidate = 3600

export const metadata: Metadata = {
  title,
  description,
  alternates: pageAlternates('/writing'),
  openGraph: {
    type: 'website',
    url: '/writing',
    siteName: 'Anurag Gautam',
    locale: 'en_US',
    title,
    description,
    images: [OG_DEFAULT_IMAGE],
  },
}

export default async function WritingIndex() {
  const posts = publishedPosts()
  const topics = topicsWithCounts()
  const watch = await hasVideos().catch(() => false)
  const filter = showTopicFilter(posts, topics)

  return (
    <>
      <PageHero
        photo="hero-writing"
        kicker={pages.writing.hero.kicker}
        title={pages.writing.hero.h1}
        line={pages.writing.hero.line}
        height="mid"
        align="bottom-left"
        alt={chapters.notes.alt}
      />

      <section data-tone="paper" data-nav="paper" data-alt={chapters.notes.alt} className="wr-index" aria-labelledby="all-notes">
        <div className="wrap">
          <div className="wr-index-bar">
            <h2 id="all-notes" className="t-label wr-index-count">
              <span className="blaze" aria-hidden="true" />
              {posts.length ? `${String(posts.length).padStart(2, '0')} ${posts.length === 1 ? 'note' : 'notes'} · newest first` : pages.writing.hero.h1}
            </h2>
            {watch || filter ? (
              <div className="wr-index-tools">
                {watch ? <FormatChips current="read" /> : null}
                {filter ? <TopicLinks topics={topics} /> : null}
              </div>
            ) : null}
          </div>

          {posts.length ? (
            <WritingRegister posts={posts} label="Earlier field notes" />
          ) : (
            <p className="t-label wr-empty">{pages.writing.empty}</p>
          )}
        </div>
      </section>

      <SubscribeBlock />

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': `${SITE_URL}/writing#page`,
          url: `${SITE_URL}/writing`,
          name: title,
          description,
          isPartOf: { '@id': `${SITE_URL}/#website` },
          author: { '@id': `${SITE_URL}/#person` },
          breadcrumb: breadcrumbs([{ name: 'Home', path: '' }, { name: 'Field Notes' }]),
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: posts.map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `${SITE_URL}/writing/${p.slug}`,
              name: p.title,
            })),
          },
        }}
      />
    </>
  )
}
