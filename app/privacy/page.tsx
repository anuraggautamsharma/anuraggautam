import Link from 'next/link'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { SITE_URL, pageMeta, pages, person } from '@/lib/site'
import { pageAlternates } from '@/lib/meta'
import { OG_DEFAULT_IMAGE } from '@/lib/og'
import { breadcrumbs, ids } from '@/lib/schema'
import { dotDate, isoDate } from '@/lib/dates'
import { Section } from '@/components/ui/Section'
import { JsonLd } from '@/components/ui/JsonLd'
import './privacy.css'

const meta = pageMeta.privacy
const copy = pages.privacy

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: pageAlternates('/privacy'),
  openGraph: {
    type: 'website',
    url: '/privacy',
    siteName: person.name,
    locale: 'en_US',
    title: meta.title,
    description: meta.description,
    images: [OG_DEFAULT_IMAGE],
  },
}

/** 'the contact page' inside the copy becomes a link. */
const CONTACT_PHRASE = "the contact page"
function withContact(text: string): ReactNode {
  const i = text.indexOf(CONTACT_PHRASE)
  if (i === -1) return text
  return (
    <>
      {text.slice(0, i)}
      <Link href="/contact" className="link">
        {CONTACT_PHRASE}
      </Link>
      {text.slice(i + CONTACT_PHRASE.length)}
    </>
  )
}

/** /privacy (≤ 150 words): the short consent notice linked beside every form. A plain paper ledger. */
export default function PrivacyPage() {
  return (
    <>
      <Section tone="paper" topo className="pv" labelledBy="pv-title">
        <div className="wrap pv-grid">
          <header className="pv-head">
            <h1 id="pv-title" className="t-h1">
              {copy.title}
            </h1>
            <p className="t-label pv-date">
              <span className="blaze" aria-hidden="true" />
              <time dateTime={isoDate(copy.updated)}>{dotDate(copy.updated)}</time>
            </p>
          </header>
          <ol className="rule-list pv-list">
            {copy.body.map((para, i) => (
              <li key={i}>
                <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <p className="t-body">{withContact(para)}</p>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          '@id': `${SITE_URL}/privacy#webpage`,
          url: `${SITE_URL}/privacy`,
          name: meta.title,
          description: meta.description,
          dateModified: isoDate(copy.updated),
          isPartOf: { '@id': ids.website },
          publisher: { '@id': ids.person },
          breadcrumb: breadcrumbs([{ name: 'Home', path: '' }, { name: meta.title }]),
        }}
      />
    </>
  )
}
