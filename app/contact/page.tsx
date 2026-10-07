import type { Metadata } from 'next'
import Image from 'next/image'
import { allPosts } from 'content-collections'
import { directLine, pageMeta, pages, person, site } from '@/lib/site'
import { pageAlternates } from '@/lib/meta'
import { newsletterReady } from '@/lib/newsletter'
import { OG_DEFAULT_IMAGE } from '@/lib/og'
import { portrait } from '@/lib/photos'
import { PageHero } from '@/components/ui/PageHero'
import { Section } from '@/components/ui/Section'
import { ContactForm, type Essay } from '@/components/contact/ContactForm'
import { LocalTime } from '@/components/contact/LocalTime'
import { cleanSource, isStuck, isWorkType, type Prefill } from '@/components/contact/options'
import '@/components/contact/contact.css'

const meta = pageMeta.contact
const { hero, aside } = pages.contact

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: pageAlternates('/contact'),
  openGraph: {
    type: 'website',
    url: '/contact',
    siteName: person.name,
    locale: 'en_US',
    title: meta.title,
    description: meta.description,
    images: [OG_DEFAULT_IMAGE],
  },
}

// Latest three published notes, offered to "too early" submissions.
const essays: Essay[] = allPosts
  .filter((p) => !p.draft)
  .sort((a, b) => b.date.localeCompare(a.date))
  .slice(0, 3)
  .map((p) => ({ title: p.title, href: `/writing/${p.slug}`, docNo: p.docNo }))

type Search = { [key: string]: string | string[] | undefined }
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** `?type=workshop&stuck=pricing&source=community` (from /community and /method links). Unknown values are dropped. */
function readPrefill(q: Search): Prefill {
  const type = first(q.type)
  const stuck = (Array.isArray(q.stuck) ? q.stuck : q.stuck ? q.stuck.split(',') : []).filter(isStuck)
  return { type: isWorkType(type) ? type : 'engagement', stuck: [...new Set(stuck)], source: cleanSource(first(q.source)) }
}

export default async function ContactPage({ searchParams }: { searchParams: Promise<Search> }) {
  const prefill = readPrefill(await searchParams)
  return (
    <>
      <PageHero
        photo="hero-contact"
        kicker={hero.kicker}
        title={hero.h1}
        line={hero.line}
        height="mid"
        align="top-left"
        alt={hero.alt}
      />

      <Section tone="paper" className="ct-body" labelledBy="ct-form-title">
        <div className="wrap cols ct-grid">
          <aside className="ct-aside" aria-label="Contact details">
            <p className="t-label ct-aside-mark">{aside.label}</p>
            <p className="t-small ct-small">{aside.dmPrefix}</p>
            <a href={directLine.url} rel="me" className="ct-mail link">
              {aside.dm}
            </a>
            {site.timezone ? (
              <p className="t-label ct-time">
                <LocalTime timeZone={site.timezone} />
                <span>{site.timezone.replace(/_/g, ' ')}</span>
              </p>
            ) : null}
            <div className="ct-who">
              <div className="ct-who-plate">
                <Image src={portrait.src} alt={portrait.alt} sizes="128px" quality={75} placeholder="blur" className="ct-who-img" />
              </div>
              <p className="ct-who-text">
                <span className="ct-who-name">{person.name}</span>
                <span className="t-small ct-small">
                  {person.currentTitle}, {person.currentCompany.name}
                </span>
              </p>
            </div>
          </aside>

          <div className="ct-form-col">
            <h2 id="ct-form-title" className="sr-only">
              Six questions
            </h2>
            <ContactForm
              calLink={site.calLink}
              essays={essays}
              prefill={prefill}
              notesReady={newsletterReady()}
            />
          </div>
        </div>
      </Section>
    </>
  )
}
