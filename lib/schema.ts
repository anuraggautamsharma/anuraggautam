import { SITE_URL, camps, offers, person, profiles, site, summitRoute, type CampId, type SiteEvent } from './site'
import { PORTRAIT_URL, photos } from './photos'

export const ids = {
  website: `${SITE_URL}/#website`,
  person: `${SITE_URL}/#person`,
  portrait: `${SITE_URL}/#portrait`,
  videodb: `${SITE_URL}/#org-videodb`,
  pipelineLab: `${SITE_URL}/#org-pipelinelab`,
  zecway: `${SITE_URL}/#org-zecway`,
  suggaa: `${SITE_URL}/#org-suggaa`,
  service: `${SITE_URL}/#gtm`,
  summitRoute: `${SITE_URL}/method#summit-route`,
  summitRouteCamps: `${SITE_URL}/method#camps`,
}

const thing = (name: string, sameAs: string) => ({ '@type': 'Thing', name, sameAs })

/** Camp titles are headlines with a full stop; a schema name reads cleaner without it. */
const campTitle = (c: { title: string }) => c.title.replace(/\.$/, '')

/** The service each camp delivers, as named in the Occupation description. */
const campService: Record<CampId, string> = {
  position: 'Positioning',
  price: 'Pricing',
  market: 'Pipeline',
  systems: 'Systems',
  team: 'Team training',
}

/** Site-wide @graph rendered once in the root layout. Per-page nodes reference these @ids. */
export function siteGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': ids.website,
        url: SITE_URL,
        name: person.name,
        inLanguage: 'en',
        description: 'Consulting, writing and research on taking complex technology to market.',
        publisher: { '@id': ids.person },
      },
      {
        '@type': 'Person',
        '@id': ids.person,
        name: person.name,
        alternateName: [person.alternateName],
        givenName: 'Anurag',
        familyName: 'Gautam',
        image: {
          '@type': 'ImageObject',
          '@id': ids.portrait,
          url: `${SITE_URL}${PORTRAIT_URL}`,
          contentUrl: `${SITE_URL}${PORTRAIT_URL}`,
          width: 1200,
          height: 1200,
          caption: person.name,
        },
        url: `${SITE_URL}/about`,
        mainEntityOfPage: `${SITE_URL}/about`,
        description: person.entityBio,
        jobTitle: person.currentTitle,
        worksFor: { '@id': ids.videodb },
        hasOccupation: {
          '@type': 'Occupation',
          name: 'Go-to-market consultant',
          description:
            'End-to-end go-to-market for complex technology: positioning, pricing, pipeline, systems and team training.',
        },
        alumniOf: {
          '@type': 'CollegeOrUniversity',
          name: 'Birsa Institute of Technology Sindri',
          sameAs: ['https://en.wikipedia.org/wiki/Birsa_Institute_of_Technology_Sindri', 'https://www.wikidata.org/wiki/Q4916968'],
        },
        knowsAbout: [
          thing('Go-to-market strategy', 'https://en.wikipedia.org/wiki/Go-to-market_strategy'),
          thing('Commercialization', 'https://en.wikipedia.org/wiki/Commercialization'),
          thing('Deep technology', 'https://en.wikipedia.org/wiki/Deep_tech'),
          thing('Artificial intelligence', 'https://en.wikipedia.org/wiki/Artificial_intelligence'),
          thing('Physical artificial intelligence', 'https://en.wikipedia.org/wiki/Physical_artificial_intelligence'),
          thing('Pricing strategy', 'https://en.wikipedia.org/wiki/Pricing_strategies'),
          thing('Positioning (marketing)', 'https://en.wikipedia.org/wiki/Positioning_(marketing)'),
          thing('User experience design', 'https://en.wikipedia.org/wiki/User_experience_design'),
          'Paid pilot design',
          'Developer tools go-to-market',
          'AI search visibility',
          summitRoute.name,
        ],
        sameAs: profiles.map((p) => p.url),
      },
      { '@type': 'Organization', '@id': ids.videodb, name: 'VideoDB', url: person.currentCompany.url },
      {
        '@type': 'Organization',
        '@id': ids.pipelineLab,
        name: 'The Pipeline Lab',
        description: 'GTM agency that set up GTM and outbound systems for 45–50 enterprises, mostly service and SaaS companies.',
        founder: { '@id': ids.person },
      },
      {
        '@type': 'Organization',
        '@id': ids.zecway,
        name: 'Zecway',
        description: 'Marketing agency building inbound acquisition channels and content distribution systems.',
        founder: { '@id': ids.person },
      },
      { '@type': 'Organization', '@id': ids.suggaa, name: 'Suggaa', description: 'Ride-hailing startup.', founder: { '@id': ids.person } },
      {
        // Service, not ProfessionalService: the latter is a LocalBusiness and would need an address.
        '@type': 'Service',
        '@id': ids.service,
        name: 'Anurag Gautam GTM Consulting',
        url: `${SITE_URL}/method`,
        provider: { '@id': ids.person },
        areaServed: 'Worldwide',
        serviceType: 'Go-to-market consulting for complex and deep technology companies',
        description: summitRoute.definition,
        subjectOf: { '@id': ids.summitRoute },
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: summitRoute.name,
          itemListElement: [
            ...camps.map((c) => ({
              '@type': 'Offer',
              itemOffered: { '@type': 'Service', name: `${campService[c.id]}: ${campTitle(c)}`, description: c.line },
            })),
            ...offers.map((o) => ({
              '@type': 'Offer',
              itemOffered: { '@type': 'Service', name: `${o.name} (${o.length})`, description: o.line },
            })),
          ],
        },
      },
      {
        '@type': 'DefinedTerm',
        '@id': ids.summitRoute,
        name: summitRoute.name,
        description: summitRoute.definition,
        url: `${SITE_URL}/method`,
      },
    ],
  }
}

/**
 * The five camps as a DefinedTermSet, for /method only (the site graph already carries the
 * Summit Route term itself). Each camp's url is its section anchor on /method.
 */
export function summitRouteCamps() {
  return {
    '@type': 'DefinedTermSet',
    '@id': ids.summitRouteCamps,
    name: `${summitRoute.name}: the five camps`,
    description: summitRoute.definition,
    url: `${SITE_URL}/method`,
    hasDefinedTerm: camps.map((c) => ({
      '@type': 'DefinedTerm',
      '@id': `${SITE_URL}/method#${c.id}`,
      name: `${c.name}: ${campTitle(c)}`,
      termCode: String(c.n).padStart(2, '0'),
      description: c.line,
      url: `${SITE_URL}/method#${c.id}`,
      inDefinedTermSet: { '@id': ids.summitRouteCamps },
    })),
  }
}

export function faqPage(items: readonly { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
}

export function breadcrumbs(items: readonly { name: string; path?: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      ...(it.path !== undefined ? { item: `${SITE_URL}${it.path}` } : {}),
    })),
  }
}

/** /about: a ProfilePage whose main entity is the site-wide Person node. */
export function profilePage(path = '/about') {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${SITE_URL}${path}#profilepage`,
    url: `${SITE_URL}${path}`,
    name: `About ${person.name}`,
    dateModified: site.updated,
    isPartOf: { '@id': ids.website },
    mainEntity: { '@id': ids.person },
    primaryImageOfPage: { '@id': ids.portrait },
    breadcrumb: breadcrumbs([
      { name: 'Home', path: '' },
      { name: 'About', path },
    ]),
  }
}

/* ───────────── v3 helpers (PLAN_V3 §8) ───────────── */

/**
 * A plain WebPage node for the v3 pages (/community, /start, /subscribe), with
 * its breadcrumb. `name` is the page's own title, without the site suffix.
 */
export function webPageJsonLd({ path, name, description }: { path: string; name: string; description: string }) {
  const url = `${SITE_URL}${path}`
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name,
    description,
    inLanguage: 'en',
    isPartOf: { '@id': ids.website },
    author: { '@id': ids.person },
    breadcrumb: breadcrumbs([{ name: 'Home', path: '' }, { name, path }]),
  }
}

/**
 * One real, upcoming event (Campfire, Summit Session or workshop). The caller emits it only for
 * upcoming events (lib/events.ts). There is no price field on SiteEvent: every event is free
 * until one carries a price, so the offer is 0.
 */
export function eventJsonLd(e: SiteEvent) {
  const image = e.photo ? `${SITE_URL}${photos[e.photo].src.src}` : `${SITE_URL}/opengraph-image`
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': `${SITE_URL}/community#event-${e.id}`,
    name: e.title,
    description: e.line,
    startDate: e.start,
    endDate: e.end,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: e.place.online
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
    location: e.place.online
      ? { '@type': 'VirtualLocation', url: e.url }
      : {
          '@type': 'Place',
          name: e.place.venue ?? e.place.city,
          address: { '@type': 'PostalAddress', addressLocality: e.place.city },
        },
    image: [image],
    url: e.url,
    inLanguage: 'en',
    organizer: { '@id': ids.person },
    performer: { '@id': ids.person },
    offers: {
      '@type': 'Offer',
      url: e.url,
      price: 0,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  }
}

/** "1:02:03" / "3:10" / "45" → seconds. */
function clipSeconds(t: string): number {
  return t
    .trim()
    .split(':')
    .reduce((s, part) => s * 60 + (Number(part) || 0), 0)
}

/** ISO 8601 duration ("PT14M32S") → seconds. */
function isoSeconds(d: string): number {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(d.trim())
  if (!m) return 0
  const [, days, h, min, s] = m
  return Number(days ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(min ?? 0) * 60 + Number(s ?? 0)
}

/**
 * A watch page's VideoObject. Chapters become Clip parts that deep-link into the YouTube video;
 * the last clip ends at the video's duration. `transcript` is the cleaned-up body text.
 */
export function videoJsonLd(v: {
  slug: string
  title: string
  description: string
  date: string
  youtubeId: string
  duration: string
  chapters: { t: string; label: string }[]
  transcript: string
}) {
  const url = `${SITE_URL}/watch/${v.slug}`
  const total = isoSeconds(v.duration)
  const starts = v.chapters.map((c) => clipSeconds(c.t))
  const watch = `https://www.youtube.com/watch?v=${v.youtubeId}`
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    '@id': `${url}#video`,
    name: v.title,
    description: v.description,
    thumbnailUrl: [`https://i.ytimg.com/vi/${v.youtubeId}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`],
    uploadDate: v.date,
    duration: v.duration,
    embedUrl: `https://www.youtube-nocookie.com/embed/${v.youtubeId}`,
    url,
    mainEntityOfPage: url,
    inLanguage: 'en',
    isPartOf: { '@id': ids.website },
    author: { '@id': ids.person },
    publisher: { '@id': ids.person },
    ...(v.transcript.trim() ? { transcript: v.transcript.trim() } : {}),
    ...(v.chapters.length
      ? {
          hasPart: v.chapters.map((c, i) => {
            const end = starts[i + 1] ?? total
            return {
              '@type': 'Clip',
              name: c.label,
              startOffset: starts[i],
              ...(end > starts[i] ? { endOffset: end } : {}),
              url: `${watch}&t=${starts[i]}`,
            }
          }),
        }
      : {}),
  }
}
