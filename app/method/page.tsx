import type { Metadata } from 'next'
import { SITE_URL, camps, methodFaqs, pageMeta, pages, person, summitRoute } from '@/lib/site'
import { breadcrumbs, faqPage, ids, summitRouteCamps } from '@/lib/schema'
import { pageAlternates } from '@/lib/meta'
import { OG_DEFAULT_IMAGE } from '@/lib/og'
import { JsonLd } from '@/components/ui/JsonLd'
import { PageHero } from '@/components/ui/PageHero'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { SummitCta } from '@/components/story/SummitCta'
import { RouteGlance } from '@/components/method/RouteGlance'
import { CampSection } from '@/components/method/CampSection'
import { Offers } from '@/components/method/Offers'
import { FitBand } from '@/components/home/FitBand'
import { MethodFaq } from '@/components/method/MethodFaq'
import '@/components/method/method.css'

const meta = pageMeta.method
const hero = pages.method.hero
const PAGE = `${SITE_URL}/method`

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: pageAlternates('/method'),
  openGraph: {
    type: 'website',
    url: '/method',
    siteName: person.name,
    locale: 'en_US',
    title: meta.title,
    description: meta.description,
    images: [OG_DEFAULT_IMAGE],
  },
}

// The Summit Route DefinedTerm itself lives in the site graph (ids.summitRoute); this page
// adds itself, the five camps as a DefinedTermSet, and its breadcrumb trail.
const structured = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${PAGE}#webpage`,
      url: PAGE,
      name: meta.title,
      description: meta.description,
      isPartOf: { '@id': ids.website },
      about: { '@id': ids.summitRoute },
      author: { '@id': ids.person },
      breadcrumb: breadcrumbs([
        { name: 'Home', path: '' },
        { name: summitRoute.name, path: '/method' },
      ]),
    },
    summitRouteCamps(),
  ],
}

export default function MethodPage() {
  return (
    <>
      <PageHero
        photo="hero-gtm"
        kicker={hero.kicker}
        title={hero.h1}
        line={hero.line}
        height="tall"
        align="top-left"
        alt={hero.alt}
      >
        <ButtonLink href="/contact" variant="primary" size="lg" magnetic>
          {hero.cta}
        </ButtonLink>
      </PageHero>

      <RouteGlance />

      {camps.map((camp) => (
        <CampSection key={camp.id} camp={camp} tone="paper" />
      ))}

      <Offers />
      <FitBand chapter={false} notFit={pages.method.fit.notFit} />
      <MethodFaq />
      <SummitCta />

      <JsonLd data={structured} />
      <JsonLd data={faqPage([...methodFaqs])} />
    </>
  )
}
