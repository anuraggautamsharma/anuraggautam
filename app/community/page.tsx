import type { Metadata } from 'next'
import { newsletter, pageMeta, pages, person } from '@/lib/site'
import { pageAlternates } from '@/lib/meta'
import { OG_DEFAULT_IMAGE } from '@/lib/og'
import { eventJsonLd, faqPage, webPageJsonLd } from '@/lib/schema'
import { pastEvents, upcomingEvents } from '@/lib/events'
import { JsonLd } from '@/components/ui/JsonLd'
import { PageHero } from '@/components/ui/PageHero'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { Section } from '@/components/ui/Section'
import { Subscribe } from '@/components/subscribe/Subscribe'
import { FaqList } from '@/components/method/FaqList'
import { ForNotFor } from '@/components/community/ForNotFor'
import { FormatCards } from '@/components/community/FormatCards'
import { EventCard, PastEvent } from '@/components/community/EventCard'
import { Curriculum } from '@/components/community/Curriculum'
import '@/components/community/community.css'

const meta = pageMeta.community
const copy = pages.community

// Events drop off (and the next one appears) without a deploy.
export const revalidate = 3600

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: pageAlternates('/community'),
  openGraph: {
    type: 'website',
    url: '/community',
    siteName: person.name,
    locale: 'en_US',
    title: meta.title,
    description: meta.description,
    images: [OG_DEFAULT_IMAGE],
  },
}

/**
 * /community: The Rope Team at its founding stage. No member counts and no dates until
 * they're real: Campfires render only from `events`, and every sign-up is an honest list
 * (or the "opens soon" state while email isn't configured). The founding list is the one
 * primary action; the footer sign-off carries the hire action.
 */
export default function CommunityPage() {
  const upcoming = upcomingEvents()
  const past = pastEvents().slice(0, 3)

  return (
    <>
      <PageHero
        photo={copy.photo}
        kicker={copy.kicker}
        title={copy.title}
        line={copy.line}
        height="mid"
        align="bottom-left"
        alt={copy.alt}
      >
        <ButtonLink href="#join" variant="photo" size="lg" arrow="none" magnetic={false}>
          {newsletter.intents.community.cta}
        </ButtonLink>
      </PageHero>

      <ForNotFor />
      <FormatCards />

      <Section id="campfires" tone="alpine" alt="3,300 M" labelledBy="cm-camp-title" className="cm-camp topo">
        <div className="wrap cols cm-camp-grid">
          <h2 id="cm-camp-title" className="t-h2 cm-camp-title reveal">
            {copy.campfiresH}
          </h2>
          <div className="cm-camp-body">
            {upcoming.length > 0 ? (
              <div className="cm-ev-list">
                {upcoming.map((e, i) => (
                  <EventCard key={e.id} event={e} i={i} />
                ))}
              </div>
            ) : (
              <>
                <p className="t-lead cm-camp-empty reveal">{copy.campfiresEmpty}</p>
                <Subscribe source="community" variant="page" intent="events" headingLevel="h3" id="campfire-invite" className="cm-sb reveal" />
              </>
            )}
            {past.length > 0 ? (
              <div className="cm-past-wrap">
                <h3 className="t-label cm-past-h">{copy.past}</h3>
                <ul className="cm-past-list">
                  {past.map((e) => (
                    <PastEvent key={e.id} event={e} />
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </Section>

      <Section id="join-list" tone="paper" alt="3,700 M" labelledBy="join-title" className="cm-join">
        <div className="wrap cols cm-join-grid">
          <Subscribe source="community" variant="page" intent="community" id="join" className="cm-sb cm-join-form reveal" />
        </div>
      </Section>

      <Section id="field-school" tone="sand" alt="4,000 M" labelledBy="cm-school-title" className="cm-school topo">
        <div className="wrap">
          <div className="cm-school-head">
            <h2 id="cm-school-title" className="t-h2 reveal">
              {copy.schoolH}
            </h2>
            <div className="cm-cohort reveal">
              <p className="cm-status cm-status-inline">{copy.cohortMeta}</p>
              <h3 className="t-h3 cm-cohort-name">{copy.cohortName}</h3>
              <p className="t-lead cm-cohort-line">{copy.cohortLine}</p>
            </div>
          </div>
          <Curriculum />
          <div className="cols cm-school-foot">
            <Subscribe source="community" variant="page" intent="cohort" headingLevel="h3" id="cohort" className="cm-sb cm-cohort-form reveal" />
            <aside className="cm-workshop reveal" aria-label={copy.workshopCta}>
              <p className="t-h4">{copy.workshopLine}</p>
              <ButtonLink href={copy.workshopHref} variant="secondary" magnetic={false}>
                {copy.workshopCta}
              </ButtonLink>
            </aside>
          </div>
        </div>
      </Section>

      <Section id="faq" tone="paper" alt="4,200 M" labelledBy="cm-faq-title" className="cm-faq">
        <div className="wrap cols cm-faq-grid">
          <h2 id="cm-faq-title" className="t-h2 cm-faq-title reveal">
            {copy.faqH}
          </h2>
          <div className="cm-faq-list">
            <FaqList items={copy.faqs} idPrefix="cm-faq" />
          </div>
        </div>
      </Section>

      <JsonLd data={webPageJsonLd({ path: '/community', name: meta.title, description: meta.description })} />
      {upcoming.map((e) => (
        <JsonLd key={e.id} data={eventJsonLd(e)} />
      ))}
      <JsonLd data={faqPage([...copy.faqs])} />
    </>
  )
}
