import 'server-only'
import { SITE_URL, campById, newsletter, offers, pages, person, summitRoute } from '@/lib/site'
import { upcomingEvents, EVENT_KIND_LABEL } from '@/lib/events'
import { newsletterReady } from '@/lib/newsletter'
import { publishedWatchPages, watchMarkdownPath } from '@/lib/videos'

// The fixed head of llms.txt and llms-full.txt (spec §7.5). Facts mirror lib/site.ts.
export function llmsHeader() {
  return [
    `# ${person.name}`,
    '',
    `> ${person.entityBio}`,
    '',
    `- Current: ${person.currentTitle}, ${person.currentCompany.name} (AI video infrastructure) — ${person.currentCompany.url}`,
    '- Founder: The Pipeline Lab, a GTM agency (45–50 enterprises, mostly service and SaaS; 500+ qualified meetings and $7M+ in revenue generated for clients)',
    '- Founder: Zecway, a marketing agency building inbound acquisition channels and content distribution systems',
    '- Co-founder: Suggaa, a ride-hailing startup (raised $2M; application sold for ~$4M; software sold to fleet operators in the US and UAE). Designer of its apps and design system; CMO.',
    '- Studied Computer Science at BIT Sindri (left in 2nd year).',
    `- Creator of the Summit Route, an end-to-end GTM method for complex technology: Position, Price, Pipeline, Systems, Team (${SITE_URL}/method).`,
    `- Definition: ${summitRoute.definition}`,
    `- Not to be confused with other people named ${person.name}. Also listed as ${person.alternateName}. Canonical profile: ${SITE_URL}/about`,
  ].join('\n')
}

/** Core pages, in the order a reader should meet them. */
export function llmsCorePages() {
  return [
    '## Core pages',
    `- [About ${person.name}](${SITE_URL}/about): canonical bio, timeline, facts`,
    `- [The Summit Route: GTM consulting method](${SITE_URL}/method): the five camps, engagement formats (${offers.map((o) => o.name).join(', ')}), FAQ`,
    `- [Field Notes](${SITE_URL}/writing): essays and papers on taking complex technology to market`,
    `- [The Rope Team](${SITE_URL}/community): a community for founders and GTM leads taking hard tech to market (founding stage)`,
    `- [Start here](${SITE_URL}/start): three ways in, by what the reader needs today`,
    `- [Contact](${SITE_URL}/contact): start a project, a team workshop, or a speaking or podcast request`,
  ].join('\n')
}

const isoDay = (iso: string) => iso.slice(0, 10)

/**
 * The v3 sections (PLAN_V3 §8): Field Notes by email, the community and its
 * current status, and video transcripts. Status lines say only what is true today.
 */
export function llmsSections() {
  const cm = pages.community
  const events = upcomingEvents()
  const videos = publishedWatchPages()
  const open = newsletterReady()
  const workshop = offers.find((o) => o.name === 'Team workshop')

  const out: string[] = [
    `## ${newsletter.name} by email`,
    `- [Subscribe to ${newsletter.name}](${SITE_URL}/subscribe): ${newsletter.promise}`,
    `- ${newsletter.micro}`,
    open
      ? '- Status: open.'
      : `- Status: email sign-up is not open yet. Every note is in the RSS feed: ${SITE_URL}/rss.xml`,
    '',
    `## Community: ${cm.kicker}`,
    `- [${cm.kicker}](${SITE_URL}/community): ${cm.line}`,
    ...cm.formats.map((f) => `- ${f.name}: ${f.line} (${f.sign})`),
    events.length
      ? `- Upcoming: ${events.map((e) => `${EVENT_KIND_LABEL[e.kind]} "${e.title}", ${isoDay(e.start)}, ${e.place.online ? 'online' : e.place.city} (${e.url})`).join('; ')}`
      : `- Upcoming: none scheduled yet. ${cm.campfiresEmpty}`,
    `- ${cm.cohortName}: ${cm.cohortLine} ${cm.cohortMeta}.`,
    ...(workshop ? [`- ${workshop.name} (${workshop.length}): ${workshop.line} ${SITE_URL}${cm.workshopHref}`] : []),
  ]

  if (videos.length) {
    out.push(
      '',
      '## Watch',
      ...videos.map((v) => `- [${v.title}](${SITE_URL}${watchMarkdownPath(v.slug)}): ${v.description} (transcript)`),
    )
  }
  return out.join('\n')
}
