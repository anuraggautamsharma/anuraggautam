import type { Metadata } from 'next'
import { SITE_URL, camps, pageMeta, pages, person } from '@/lib/site'
import { CAMP_ORDER, QUESTION_COUNT } from '@/lib/scorecard'
import { pageAlternates } from '@/lib/meta'
import { OG_DEFAULT_IMAGE } from '@/lib/og'
import { webPageJsonLd } from '@/lib/schema'
import { JsonLd } from '@/components/ui/JsonLd'
import { PageHero } from '@/components/ui/PageHero'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { Section } from '@/components/ui/Section'
import { Scorecard, type ScorecardCamp } from '@/components/scorecard/Scorecard'
import { Subscribe } from '@/components/subscribe/Subscribe'

const meta = pageMeta.scorecard
const copy = pages.scorecard

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: pageAlternates('/scorecard'),
  openGraph: {
    type: 'website',
    url: '/scorecard',
    siteName: person.name,
    locale: 'en_US',
    title: meta.title,
    description: meta.description,
    images: [OG_DEFAULT_IMAGE],
  },
}

// The scoring maths (lib/scorecard) reads statement i as camp CAMP_ORDER[i >> 1]. If the copy
// in lib/site ever reorders, fail loudly rather than score the wrong camp.
if (
  copy.questions.length !== QUESTION_COUNT ||
  copy.questions.some((q, i) => q.camp !== CAMP_ORDER[i >> 1]) ||
  camps.some((c, i) => c.id !== CAMP_ORDER[i])
) {
  throw new Error('pages.scorecard.questions must be two statements per camp, in camp order')
}

const scorecardCamps: ScorecardCamp[] = camps.map((c) => ({
  id: c.id,
  n: c.n,
  name: c.name,
  hue: c.hue,
  hazard: c.hazard,
  line: c.line,
}))

export default function ScorecardPage() {
  return (
    <>
      <PageHero
        photo={copy.photo}
        kicker={copy.kicker}
        title={copy.title}
        line={copy.line}
        height="band"
        align="bottom-left"
        alt={copy.alt}
      >
        <ButtonLink href="#climb" variant="primary" size="lg" arrow="none">
          {copy.start}
        </ButtonLink>
      </PageHero>

      <Section id="climb" tone="paper" alt="2,900 M" className="sc" aria-label={copy.kicker} data-cta-owner="">
        <div className="wrap">
          <Scorecard
            copy={{
              scale: copy.scale,
              next: copy.next,
              back: copy.back,
              see: copy.see,
              progress: copy.progress,
              resultH: copy.resultH,
              stallH: copy.stallH,
              states: copy.states,
              summit: copy.summit,
              cta: copy.cta,
              ctaLine: copy.ctaLine,
              campLink: copy.campLink,
              retake: copy.retake,
              share: copy.share,
              copied: copy.copied,
              privacy: copy.privacy,
            }}
            questions={copy.questions}
            camps={scorecardCamps}
            shareUrl={`${SITE_URL}/scorecard`}
            subscribe={<Subscribe variant="row" source="scorecard" headingLevel="h3" />}
          />
        </div>
      </Section>

      <JsonLd data={webPageJsonLd({ path: '/scorecard', name: meta.title, description: meta.description })} />
    </>
  )
}
