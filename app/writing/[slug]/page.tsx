import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MDXContent } from '@content-collections/mdx/react'
import { SITE_URL, chapters, person } from '@/lib/site'
import { breadcrumbs, faqPage, ids } from '@/lib/schema'
import { slashDate } from '@/lib/dates'
import { JsonLd } from '@/components/ui/JsonLd'
import { ArticleHeader, KeyTakeaways } from '@/components/writing/ArticleHeader'
import { ArticleFaq, AuthorBox, ContextCta, PrevNext, References } from '@/components/writing/EndMatter'
import { ReadingProgress } from '@/components/writing/ReadingProgress'
import { Toc, type TocEntry } from '@/components/writing/Toc'
import { mdxComponents, sectionLabel } from '@/components/writing/mdx-components'
import { postUrl } from '@/components/writing/markdown'
import { Subscribe } from '@/components/subscribe/Subscribe'
import { TOPICS, adjacentPosts, getPost, postPath, routablePosts, topicAccent, type Post } from '@/components/writing/posts'

export const dynamicParams = false

export function generateStaticParams() {
  return routablePosts().map((p) => ({ slug: p.slug }))
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return {}
  const path = postPath(slug)
  const isPaper = post.kind === 'paper'

  return {
    title: post.seoTitle ?? post.title,
    description: post.description,
    keywords: post.tags,
    authors: [{ name: person.name, url: `${SITE_URL}/about` }],
    alternates: {
      canonical: path,
      types: { 'text/markdown': `/md/writing/${slug}`, 'application/rss+xml': '/rss.xml' },
    },
    openGraph: {
      type: 'article',
      url: path,
      siteName: person.name,
      locale: 'en_US',
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      authors: [`${SITE_URL}/about`],
      section: TOPICS[post.topic].label,
      tags: post.tags,
    },
    twitter: { card: 'summary_large_image', title: post.title, description: post.description },
    ...(post.draft ? { robots: { index: false, follow: false } } : {}),
    // Highwire Press tags let Google Scholar and reference managers pick up papers.
    ...(isPaper
      ? {
          other: {
            citation_title: post.title,
            citation_author: `${person.name.split(' ').slice(1).join(' ')}, ${person.name.split(' ')[0]}`,
            citation_publication_date: slashDate(post.date),
            ...(post.pdf ? { citation_pdf_url: new URL(post.pdf, SITE_URL).toString() } : {}),
            citation_abstract_html_url: postUrl(slug),
          },
        }
      : {}),
  }
}

function articleJsonLd(post: Post) {
  const url = postUrl(post.slug)
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': post.kind === 'paper' ? 'Article' : 'BlogPosting',
        ...(post.kind === 'paper' ? { genre: 'Research paper' } : {}),
        '@id': `${url}#article`,
        mainEntityOfPage: url,
        headline: post.title,
        description: post.description,
        image: [`${url}/opengraph-image`],
        datePublished: post.date,
        dateModified: post.updated ?? post.date,
        author: [{ '@type': 'Person', '@id': ids.person, name: person.name, url: `${SITE_URL}/about` }],
        publisher: { '@id': ids.person },
        isPartOf: { '@id': ids.website },
        inLanguage: 'en',
        articleSection: TOPICS[post.topic].label,
        keywords: post.tags,
        wordCount: post.wordCount,
        ...(post.abstract ? { abstract: post.abstract } : {}),
        ...(post.sources.length ? { citation: post.sources.map((s) => s.url) } : {}),
      },
      breadcrumbs([
        { name: 'Home', path: '' },
        { name: 'Field Notes', path: '/writing' },
        { name: TOPICS[post.topic].label, path: `/writing/topic/${post.topic}` },
        { name: post.title },
      ]),
    ],
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  const { prev, next } = adjacentPosts(slug)
  const h2s = post.toc.filter((t) => t.depth === 2)
  const tocItems: TocEntry[] = [
    ...h2s.map((t, i) => ({ id: t.id, text: t.text, n: sectionLabel(i + 1).replace('§ ', '') })),
    ...(post.faqs.length ? [{ id: 'faq', text: 'Questions' }] : []),
    ...(post.sources.length ? [{ id: 'references', text: 'References' }] : []),
  ]

  return (
    <article
      className="wr-article"
      data-tone="paper"
      data-nav="paper"
      data-alt={chapters.notes.alt}
      style={{ '--hue': topicAccent(post.topic) } as React.CSSProperties}
    >
      {post.draft ? (
        <p className="wr-draft t-label" role="note">
          Draft · not published · only visible in development
        </p>
      ) : null}

      <ArticleHeader post={post} />

      <div className="wr-doc">
        <ReadingProgress />
        <aside className="wr-toc-slot no-print">
          <Toc items={tocItems} />
        </aside>

        <div className="prose">
          <details className="wr-toc-m no-print">
            <summary>
              <span className="t-label">Contents</span>
              <span className="t-label wr-toc-m-count">{String(h2s.length).padStart(2, '0')} sections</span>
            </summary>
            <ol>
              {tocItems.map((it) => (
                <li key={it.id}>
                  <a href={`#${it.id}`}>
                    <span className="wr-toc-n" aria-hidden="true">
                      {it.n ?? '··'}
                    </span>
                    {it.text}
                  </a>
                </li>
              ))}
            </ol>
          </details>

          <KeyTakeaways items={post.takeaways} />

          <MDXContent code={post.mdx} components={mdxComponents(post.toc)} />

          <ArticleFaq items={post.faqs} />
          <References sources={post.sources} />
        </div>
      </div>

      <footer className="wr-foot">
        <div className="wrap wr-foot-grid">
          <AuthorBox />
          <ContextCta topic={post.topic} />
        </div>
        {/* Field Notes by email: after the page's lead action (ContextCta), before previous/next. */}
        <div className="wrap wr-foot-sub">
          <Subscribe variant="card" source="article" id="subscribe" />
        </div>
        <div className="wrap">
          <PrevNext prev={prev} next={next} />
        </div>
      </footer>

      <JsonLd data={articleJsonLd(post)} />
      {post.faqs.length ? <JsonLd data={faqPage(post.faqs)} /> : null}
    </article>
  )
}
