import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { pageMeta, pages, person } from '@/lib/site'
import { portrait } from '@/lib/photos'
import { pageAlternates } from '@/lib/meta'
import { OG_DEFAULT_IMAGE } from '@/lib/og'
import { webPageJsonLd } from '@/lib/schema'
import { latestVideos } from '@/lib/videos'
import { publishedPosts, postPath } from '@/components/writing/posts'
import { JsonLd } from '@/components/ui/JsonLd'
import { PageHero } from '@/components/ui/PageHero'
import { Section } from '@/components/ui/Section'
import { Icon } from '@/components/ui/Icon'
import { Subscribe } from '@/components/subscribe/Subscribe'
import { Doors, type DoorLink } from '@/components/start/Doors'
import '@/components/start/start.css'

const meta = pageMeta.start
const copy = pages.start

// The latest video (once there is one) appears in the "learn" door without a deploy.
export const revalidate = 3600

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: pageAlternates('/start'),
  openGraph: {
    type: 'website',
    url: '/start',
    siteName: person.name,
    locale: 'en_US',
    title: meta.title,
    description: meta.description,
    images: [OG_DEFAULT_IMAGE],
  },
}

/** The hand-picked notes that are published (drafts never list), in the order they were picked. */
function pickedNotes(): DoorLink[] {
  const posts = publishedPosts()
  return copy.notes
    .map((slug) => posts.find((p) => p.slug === slug))
    .filter((p) => p !== undefined)
    .map((p) => ({ kind: 'read' as const, title: p.title, href: postPath(p.slug) }))
}

/**
 * /start: the link-in-bio page (≤ 180 words, phone first). Three photo doors, then the
 * one primary action (Field Notes by email), then three lines on who's behind it.
 */
export default async function StartPage() {
  const [video] = await latestVideos({ kind: 'long', limit: 1 })
  const learn: DoorLink[] = [
    ...(video ? [{ kind: 'watch' as const, title: video.title, href: video.href, external: video.external }] : []),
    ...pickedNotes(),
  ].slice(0, 3)

  return (
    <>
      <PageHero
        photo={copy.photo}
        kicker={copy.kicker}
        title={copy.title}
        line={copy.line}
        height="band"
        align="top-left"
        alt={copy.alt}
      />

      <Section id="doors" tone="paper" alt="2,400 M" className="st-doors-wrap" data-nav="photo">
        <Doors learn={learn} />
      </Section>

      <Section id="notes" tone="paper" alt="3,600 M" className="st-sub">
        <div className="wrap">
          <Subscribe source="start" variant="row" className="st-sub-row reveal" />
        </div>
      </Section>

      <Section id="who" tone="paper" alt="4,300 M" labelledBy="st-who-title" className="st-who">
        <div className="wrap st-who-inner reveal">
          <div className="st-who-plate">
            <Image src={portrait.src} alt={portrait.alt} sizes="96px" quality={75} placeholder="blur" className="st-who-img" />
          </div>
          <div className="st-who-text">
            <h2 id="st-who-title" className="t-label st-who-h">
              {copy.whoH}
            </h2>
            <p className="st-who-line">{person.oneLiner}</p>
            <p className="t-small st-who-role">
              {person.currentTitle}, {person.currentCompany.name}
            </p>
            <Link href="/about" className="link-go st-who-cta">
              {copy.whoCta}
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        </div>
      </Section>

      <JsonLd data={webPageJsonLd({ path: '/start', name: meta.title, description: meta.description })} />
    </>
  )
}
