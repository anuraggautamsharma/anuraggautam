import type { Metadata } from 'next'
import { aboutQa, pageMeta, pages, person } from '@/lib/site'
import { faqPage, profilePage } from '@/lib/schema'
import { pageAlternates } from '@/lib/meta'
import { OG_DEFAULT_IMAGE } from '@/lib/og'
import { JsonLd } from '@/components/ui/JsonLd'
import { PageHero } from '@/components/ui/PageHero'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { SummitCta } from '@/components/story/SummitCta'
import { Bio } from '@/components/about/Bio'
import { TrailLog } from '@/components/about/TrailLog'
import { FieldTests } from '@/components/about/FieldTests'
import { AboutQa } from '@/components/about/AboutQa'
import '@/components/about/about.css'

const meta = pageMeta.about
const hero = pages.about.hero

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: pageAlternates('/about'),
  openGraph: {
    type: 'profile',
    url: '/about',
    siteName: person.name,
    locale: 'en_US',
    title: meta.title,
    description: meta.description,
    firstName: 'Anurag',
    lastName: 'Gautam',
    images: [OG_DEFAULT_IMAGE],
  },
}

export default function AboutPage() {
  return (
    <>
      <PageHero photo="hero-about" kicker={hero.kicker} title={hero.h1} height="tall" align="top-left" alt={hero.alt}>
        <ButtonLink href="/method" variant="photo" size="lg">
          {hero.cta}
        </ButtonLink>
      </PageHero>
      <Bio />
      <TrailLog />
      <FieldTests />
      <AboutQa />
      <SummitCta />

      <JsonLd data={profilePage('/about')} />
      <JsonLd data={faqPage([...aboutQa])} />
    </>
  )
}
