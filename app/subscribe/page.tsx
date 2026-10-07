import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { SITE_URL, chapters, home, newsletter, pageMeta, person } from '@/lib/site'
import { pageAlternates } from '@/lib/meta'
import { OG_DEFAULT_IMAGE } from '@/lib/og'
import { breadcrumbs, ids } from '@/lib/schema'
import { PageHero } from '@/components/ui/PageHero'
import { Section } from '@/components/ui/Section'
import { Icon } from '@/components/ui/Icon'
import { JsonLd } from '@/components/ui/JsonLd'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { NoteCard } from '@/components/writing/NoteCard'
import { publishedPosts } from '@/components/writing/posts'
import { Subscribe } from '@/components/subscribe/Subscribe'
import './subscribe-page.css'

const meta = pageMeta.subscribe
const copy = newsletter.page

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: pageAlternates('/subscribe'),
  openGraph: {
    type: 'website',
    url: '/subscribe',
    siteName: person.name,
    locale: 'en_US',
    title: meta.title,
    description: meta.description,
    images: [OG_DEFAULT_IMAGE],
  },
}

/** /subscribe (PLAN_V3 §4, ≤ 200 words): the form first, then what arrives and who it's for, then the latest notes. */
export default function SubscribePage() {
  const latest = publishedPosts().slice(0, 3)

  return (
    <>
      <PageHero
        photo="notes-forest-path"
        kicker={copy.kicker}
        title={copy.title}
        line={copy.line}
        height="band"
        align="bottom-left"
        alt={chapters.notes.alt}
      />

      <Section tone="paper" topo alt={chapters.notes.alt} className="sp-main" labelledBy="sp-form-title">
        <div className="wrap sp-grid">
          <div className="sp-form">
            <h2 id="sp-form-title" className="sr-only">
              {newsletter.variants.row.label}
            </h2>
            <Subscribe variant="page" source="subscribe" />
            <p className="sp-proof">
              <span className="blaze" aria-hidden="true" />
              <span>{newsletter.proof}</span>
            </p>
          </div>

          <div className="sp-facts">
            <div className="sp-fact reveal">
              <h2 className="t-label sp-fact-h">{copy.getH}</h2>
              <ol className="rule-list sp-list">
                {copy.get.map((g, i) => (
                  <li key={g}>
                    <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                    <span>{g}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="sp-fact reveal" style={{ '--i': 1 } as CSSProperties}>
              <h2 className="t-label sp-fact-h">{copy.forH}</h2>
              <ul className="rule-list sp-list">
                {copy.for.map((f) => (
                  <li key={f}>
                    <span aria-hidden="true">
                      <Icon name="check" size={16} />
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {latest.length ? (
        <Section tone="sand" alt={chapters.notes.alt} className="sp-latest" labelledBy="sp-latest-title">
          <div className="wrap">
            <div className="sp-latest-head">
              <h2 id="sp-latest-title" className="t-h2 reveal">
                {copy.latestH}
              </h2>
              <ButtonLink href="/writing" variant="secondary" size="sm" className="sp-all">
                {home.notes.cta}
              </ButtonLink>
            </div>
            <div className="sp-notes" data-count={latest.length}>
              {latest.map((post, i) => (
                <div key={post.slug} className="reveal" style={{ '--i': i } as CSSProperties}>
                  <NoteCard post={post} size={latest.length === 1 ? 'lg' : 'md'} />
                </div>
              ))}
            </div>
          </div>
        </Section>
      ) : null}

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          '@id': `${SITE_URL}/subscribe#webpage`,
          url: `${SITE_URL}/subscribe`,
          name: meta.title,
          description: meta.description,
          isPartOf: { '@id': ids.website },
          author: { '@id': ids.person },
          breadcrumb: breadcrumbs([{ name: 'Home', path: '' }, { name: 'Field Notes', path: '/writing' }, { name: meta.title }]),
        }}
      />
    </>
  )
}
