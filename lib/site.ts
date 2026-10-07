// Single source of truth for facts and copy (spec v2, "The Expedition").
// Components read every visible string from here; JSON-LD, llms.txt and the OG card
// read the same facts, so the entity stays consistent everywhere.
// Rule: anything unconfirmed is null/empty and its component does not render.
// Copy budgets live in docs/SPEC_V2.md §1: change a string only within its beat's cap.

import type { PhotoId } from './photos'

export const SITE_URL = 'https://anuraggautam.com'

export const site = {
  email: 'hello@anuraggautam.com', // CONFIRM the mailbox exists before launch (spec §12.2)
  timezone: null as string | null, // e.g. 'Asia/Kolkata'. LocalTime hides while null
  city: null as string | null,
  status: 'OPEN FOR GTM ENGAGEMENTS',
  prices: null as null | { teardown: string; build: string; advisory: string },
  calLink: null as string | null, // Cal.com event for "fit" leads
  updated: '2026-10-06',
  rev: '2026.10',
}

// ---------------------------------------------------------------------------
// Entity
// ---------------------------------------------------------------------------

/** Spec §7.1. Identical in the footer, Person.description, llms.txt and the about page. */
const ENTITY_STATEMENT =
  'Anurag Gautam (also Anurag Gautam Sharma) is a go-to-market (GTM) consultant for complex technology, from AI and physical AI to infrastructure and hardware. He is Founding GTM Lead at VideoDB, co-founded Suggaa, and founded Zecway and The Pipeline Lab. He created the Summit Route, a five-camp GTM method.'

export const person = {
  name: 'Anurag Gautam',
  alternateName: 'Anurag Gautam Sharma',
  role: 'GTM consultant for complex technology',
  currentTitle: 'Founding GTM Lead',
  currentCompany: { name: 'VideoDB', url: 'https://videodb.io' },
  oneLiner: 'I take complex technology to market, end to end: positioning, pricing, pipeline, systems and team.',
  // Article author box: third person like a byline, without the machine-facing alias.
  authorBio:
    'Founding GTM Lead at VideoDB. Co-founded Suggaa, founded Zecway and The Pipeline Lab, and created the Summit Route, an end-to-end GTM method for complex technology.',
  // Kept identical everywhere so assistants can tell him apart from namesakes.
  entityBio: ENTITY_STATEMENT,
  aboutLead:
    'Anurag Gautam is a founder and go-to-market (GTM) consultant who takes complex technology to market, end to end: positioning, pricing, pipeline, systems and team. He co-founded Suggaa (raised $2M; its application sold for ~$4M), founded Zecway and The Pipeline Lab, and is Founding GTM Lead at VideoDB.',
}

/**
 * Video and social channels (PLAN_V3 §5). Everything stays null until the channel really exists:
 * while `youtube.id` is null no feed is fetched, and while a handle is null its link never renders.
 * `youtube.id` is the channel id (UC…); the feed playlists derive from it (UULF… long-form, UUSH… Shorts).
 */
export const channels = {
  youtube: { id: null as string | null, handle: null as string | null },
  instagram: { handle: null as string | null },
}

/** Shorts and Reels shown as 9:16 posters on /watch. `poster` is a self-hosted AVIF path. Empty until real. */
export const reels: readonly { permalink: string; title: string; poster: string }[] = []

const at = (h: string) => h.replace(/^@/, '')

// Only real, existing profiles belong here (they feed JSON-LD sameAs, rel="me", the menu foot,
// the footer and AuthorBox). YouTube and Instagram join only once their handle is set.
export const profiles: { label: string; url: string }[] = [
  { label: 'LinkedIn', url: 'https://www.linkedin.com/in/anuraggautamsharma/' },
  ...(channels.youtube.handle ? [{ label: 'YouTube', url: `https://www.youtube.com/@${at(channels.youtube.handle)}` }] : []),
  ...(channels.instagram.handle ? [{ label: 'Instagram', url: `https://www.instagram.com/${at(channels.instagram.handle)}/` }] : []),
]

// Frozen figures. Same wording everywhere.
export const stats = [
  { value: '$2M', num: 2000000, label: 'Raised as co-founder, Suggaa', note: 'Capital raised by Suggaa, the ride-hailing startup I co-founded and worked on until 2024.' },
  { value: '~$4M', num: 4000000, label: 'Suggaa application sale', note: 'Suggaa’s application was sold for approximately $4M. Its software was also sold to large fleet operators in the US and UAE.' },
  { value: '500+', num: 500, label: 'Qualified meetings for clients', note: 'Qualified meetings generated for clients of The Pipeline Lab.' },
  { value: '$7M+', num: 7000000, label: 'Client revenue generated', note: 'Revenue generated for The Pipeline Lab’s clients from the GTM and outbound systems we set up.' },
  { value: '45+', num: 45, label: 'Companies, mostly service & SaaS', note: 'Between 45 and 50 enterprises whose GTM and outbound systems The Pipeline Lab set up. The Pipeline Lab’s work spans customers outside India.' },
] as const

/** /about trail log (spec §5.2). `years` renders only when known. */
export const buildLog: readonly { code: string; title: string; body: string; years: string | null }[] = [
  { code: '01', title: 'BIT Sindri, Computer Science.', body: 'Left in second year to build.', years: null },
  { code: '02', title: 'First company: a marketing agency.', body: 'Ran it for about a year.', years: null },
  {
    code: '03',
    title: 'Suggaa, co-founder.',
    body: 'Raised $2M. Built the design team and design system from scratch; designed the rider app, the driver app and the website. Ran launch, campaigns and events as CMO. The application sold for ~$4M; the software went to large fleet operators in the US and UAE.',
    years: 'Until 2024',
  },
  {
    code: '04',
    title: 'Zecway, founder.',
    body: 'A marketing agency that builds a company’s “marketing brain”: inbound acquisition channels and content distribution. I designed its website.',
    years: null,
  },
  {
    code: '05',
    title: 'The Pipeline Lab, founder.',
    body: 'A GTM agency. Set up GTM and outbound systems for 45–50 enterprises, mostly service and SaaS. 500+ qualified meetings and $7M+ in revenue for clients; its work spans customers outside India. I designed its website.',
    years: null,
  },
  { code: '06', title: 'VideoDB, Founding GTM Lead.', body: 'Taking AI video infrastructure to market.', years: 'NOW' },
]

// ---------------------------------------------------------------------------
// The Summit Route
// ---------------------------------------------------------------------------

export type CampId = 'position' | 'price' | 'market' | 'systems' | 'team'

export type Camp = {
  n: 1 | 2 | 3 | 4 | 5
  id: CampId
  name: string
  title: string
  line: string
  items: [string, string, string]
  hazard: string
  /** /method story copy (spec §5.1), verbatim. */
  detail: string
  leaveWith: string[]
  icon: 'compass' | 'scale' | 'beacon' | 'carabiner' | 'rope'
  photo: PhotoId
  hue: `var(--camp-${CampId})`
  /** The Field Notes topic that maps to this camp (posts.ts `topicCamp`). */
  topic: 'positioning' | 'pricing' | 'pipeline' | 'workflows' | 'team'
}

export const summitRoute = {
  name: 'The Summit Route',
  definition:
    'The Summit Route is Anurag Gautam’s end-to-end go-to-market method for complex technology: five camps (Position, Price, Pipeline, Systems, Team), climbed in order until the client’s team can run it without him.',
  short: 'An end-to-end go-to-market method for complex technology: Position, Price, Pipeline, Systems, Team.',
} as const satisfies { name: 'The Summit Route'; definition: string; short: string }

export const camps: readonly Camp[] = [
  {
    n: 1,
    id: 'position',
    name: 'Position',
    title: 'Find true north.',
    line: 'Make the extraordinary obvious: who it’s for, why now.',
    items: ['ICP & category', 'Messaging & narrative', 'Website & deck'],
    hazard: 'Nobody can repeat your pitch.',
    detail:
      'If buyers can’t repeat your pitch, nothing downstream works. I find who feels the pain most, the alternative you really compete with, and the one sentence that makes you obvious. Then we rewrite the story everywhere it lives.',
    leaveWith: ['ICP', 'Messaging', 'Sales narrative', 'Website and deck'],
    icon: 'compass',
    photo: 'waypoint-position',
    hue: 'var(--camp-position)',
    topic: 'positioning',
  },
  {
    n: 2,
    id: 'price',
    name: 'Price',
    title: 'Make yes easy.',
    line: 'Price on value, so a heavy decision feels light.',
    items: ['Value metric', 'Packaging & tiers', 'Paid pilots'],
    hazard: 'Discounts decide every deal.',
    detail:
      'Complex products are heavy decisions. Good pricing makes them lighter. I find the value metric buyers understand, package it into clear tiers, and design pilots that are paid, scoped and built to end in a rollout.',
    leaveWith: ['Value metric', 'Price sheet', 'Paid-pilot terms'],
    icon: 'scale',
    photo: 'waypoint-price',
    hue: 'var(--camp-price)',
    topic: 'pricing',
  },
  {
    n: 3,
    id: 'market',
    name: 'Pipeline',
    title: 'Light the beacons.',
    line: 'Qualified demand every week, not once per launch.',
    items: ['Launches & content', 'Inbound & AI search', 'Signal-based outbound'],
    hazard: 'Pipeline runs on the founder.',
    detail:
      'Launches spike and fade. A market needs a steady signal. I build the channels that create qualified demand every week: launches, founder-led content, search and AI-assistant visibility, events, partners and signal-based outbound.',
    leaveWith: ['Channel plan', 'Launch plan', 'Content engine', 'Outbound system'],
    icon: 'beacon',
    photo: 'waypoint-market',
    hue: 'var(--camp-market)',
    topic: 'pipeline',
  },
  {
    n: 4,
    id: 'systems',
    name: 'Systems',
    title: 'Bridge the crevasses.',
    line: 'Close the gaps where deals stall.',
    items: ['CRM & routing', 'AI agents & automation', 'Pilot-to-production playbook'],
    hazard: 'Pilots never become contracts.',
    detail:
      'Deals stall in security review, context dies between tools, and pilots drift. I bridge those gaps: CRM, enrichment and routing, AI agents and automation, procurement kits, and a pilot-to-production playbook.',
    leaveWith: ['CRM architecture', 'Automations', 'Procurement kit', 'Pilot playbook'],
    icon: 'carabiner',
    photo: 'waypoint-systems',
    hue: 'var(--camp-systems)',
    topic: 'workflows',
  },
  {
    n: 5,
    id: 'team',
    name: 'Team',
    title: 'Hand over the rope.',
    line: 'A team that sells without you in the room.',
    items: ['First GTM hires', 'Enablement & call reviews', 'Weekly operating rhythm'],
    hazard: 'Nothing closes when you’re away.',
    detail:
      'The route only works if it runs when the founder is on a plane. I help hire the first GTM people, train them on the story, review calls, and set a weekly rhythm. Then I hand over the rope.',
    leaveWith: ['Hiring scorecards', 'Enablement library', 'Weekly dashboard'],
    icon: 'rope',
    photo: 'waypoint-team',
    hue: 'var(--camp-team)',
    topic: 'team',
  },
]

/** Terrain hazards (home Beat 02), in camp order. Each camp clears its own. */
export const hazards: readonly string[] = camps.map((c) => c.hazard)

export const campById = (id: CampId): Camp => camps.find((c) => c.id === id)!

/** "CAMP 01 · POSITION" */
export const campLabel = (c: Pick<Camp, 'n' | 'name'>) => `Camp ${String(c.n).padStart(2, '0')} · ${c.name}`.toUpperCase()

// ---------------------------------------------------------------------------
// Homepage (spec §4). Word budget: ≤ 425 visible words in <main> (450 hard cap; SPEC_V2 §1).
// ---------------------------------------------------------------------------

/** ChapterLabel data per homepage beat (`n` is the beat number; `alt` the decorative altitude). */
export const chapters = {
  basecamp: { n: '01', name: 'Basecamp', alt: '1,250 M' },
  terrain: { n: '02', name: 'Terrain', alt: '2,050 M' },
  route: { n: '03', name: 'The Route', alt: '2,900 M' },
  guide: { n: '04', name: 'The Guide', alt: '3,600 M' },
  expeditions: { n: '05', name: 'Track record', alt: '4,300 M' },
  notes: { n: '06', name: 'From the trail', alt: '4,900 M' },
  fit: { n: '07', name: 'Fit', alt: '5,200 M' },
  summit: { n: '08', name: 'Summit', alt: '5,600 M' },
} as const

const CTA_CLIMB = 'Start the climb'

const fitChips = ['AI', 'Physical AI', 'Robotics', 'Infra', 'Dev tools', 'Hardware']

export const home: {
  basecamp: { kicker: string; h1: string; line: string; cta: string; cta2: string; cta2Href: string; cue: string }
  terrain: { h2: string; line: string }
  route: { h2: string; line: string; cta: string }
  /** v3 drops the stack line. `line` stays an optional, never-set key only until StackBand stops reading it. */
  stack: { label: string; h2: string; line?: undefined }
  guide: { h2: string; line: string; badges: [string, string, string]; cta: string }
  expeditions: { h2: string; line: string }
  fit: {
    h2: string
    chips: string[]
    yes: [string, string, string]
    no: string
    /** The down-sell under the ✗ line: "Not ready for a guide yet? Get the field notes →". */
    notReady: { text: string; cta: string; href: string }
  }
  /**
   * Beat 06 "From the trail". `line` is the honest default (notes only). `lineVideo` replaces it
   * only once a long-form video exists, so the page never promises footage it doesn't have.
   */
  notes: { h2: string; line: string; lineVideo: string; cta: string; empty: string }
  summit: { h2: string; line: string; cta: string; emailPrefix: string }
} = {
  basecamp: {
    kicker: 'Anurag Gautam · GTM for complex technology',
    h1: 'You built something the world hasn’t seen yet.',
    line: 'I take complex tech to market: positioning, pricing, pipeline, systems and team.',
    cta: CTA_CLIMB,
    cta2: 'Score your route',
    cta2Href: '/scorecard',
    cue: 'Scroll to climb',
  },
  terrain: {
    h2: 'Great tech doesn’t find its market.',
    line: 'It has to be taken there. Most stall in the same five places.',
  },
  route: {
    h2: 'Five camps between your product and its market.',
    line: 'The Summit Route: one camp to clear each stall.',
    cta: 'See every camp',
  },
  stack: {
    label: 'The stack',
    h2: 'The stack I build with.',
  },
  guide: {
    h2: 'I’ve made this climb. From the founder’s side.',
    line: 'I don’t hand you a deck and leave. I climb with your team.',
    badges: ['Left BIT Sindri CS to build companies', 'Product designer: I make hard things clear', 'Founding GTM Lead, VideoDB'],
    cta: 'Meet the guide',
  },
  expeditions: {
    h2: 'The climbs so far.',
    line: 'Companies I built, and the one I’m taking to market now.',
  },
  fit: {
    h2: 'Built for cutting‑edge tech that’s hard to explain.',
    chips: fitChips,
    yes: [
      'You built something hard, and it works.',
      'Buyers love the demo but can’t explain it back.',
      'You want a system your team runs, not a deck.',
    ],
    no: 'Not a fit: pre-product ideas, or “just send more emails.”',
    notReady: { text: 'Not ready for a guide yet?', cta: 'Get the field notes', href: '/subscribe' },
  },
  notes: {
    h2: 'What the trail taught me.',
    line: 'Short, practical notes from the climb.',
    lineVideo: 'Notes and footage from the climb.',
    cta: 'All field notes',
    empty: 'Fresh tracks coming soon.',
  },
  summit: {
    h2: 'Let’s take it to market.',
    line: 'Tell me what you built and where it’s stuck. Two minutes.',
    cta: CTA_CLIMB,
    emailPrefix: 'Prefer email?',
  },
}

/** Expeditions (home Beat 05), chronological. Stats are server-rendered finals; `countTo` drives CountUp. */
export const ventures: readonly {
  id: 'suggaa' | 'zecway' | 'pipeline-lab' | 'videodb'
  name: string
  role: string
  when: string | null
  line: string
  photo: PhotoId
  stats: { value: string; label: string; countTo?: number; format?: 'money-m' | 'plus' | 'plain' }[]
}[] = [
  {
    id: 'suggaa',
    name: 'Suggaa',
    role: 'Co-founder · CMO',
    when: 'Until 2024',
    line: 'Ride-hailing. Designed both apps, ran launch.',
    photo: 'expedition-canyon',
    stats: [
      { value: '$2M', label: 'Raised', countTo: 2, format: 'money-m' },
      { value: '~$4M', label: 'App sale', countTo: 4, format: 'money-m' },
    ],
  },
  {
    id: 'zecway',
    name: 'Zecway',
    role: 'Founder',
    when: null,
    line: 'A “marketing brain”: inbound, content distribution.',
    photo: 'expedition-aurora',
    stats: [],
  },
  {
    id: 'pipeline-lab',
    name: 'The Pipeline Lab',
    role: 'Founder',
    when: null,
    line: 'GTM for 45–50 enterprises, mostly SaaS and services.',
    photo: 'expedition-alpine-lake',
    stats: [
      { value: '$7M+', label: 'Client revenue', countTo: 7, format: 'money-m' },
      { value: '500+', label: 'Qualified meetings', countTo: 500, format: 'plus' },
    ],
  },
  {
    id: 'videodb',
    name: 'VideoDB',
    role: 'Founding GTM Lead',
    when: 'Now',
    line: 'Taking AI video infrastructure to market.',
    photo: 'expedition-ice-cave',
    stats: [],
  },
]

// ---------------------------------------------------------------------------
// /method, /about
// ---------------------------------------------------------------------------

/** "Four ways to climb" (spec §5.1.4, PLAN_V3 §6). Formats carried over from v1, plus Team workshop (v3): CONFIRM before launch (§12.3). No public prices. */
export const offers: readonly { name: string; length: string; line: string }[] = [
  { name: 'Recon', length: '2 weeks', line: 'Find the stall. One page: the three moves that matter most.' },
  { name: 'Expedition', length: '~90 days', line: 'I build all five camps with your team, then hand them over.' },
  { name: 'Guide on call', length: 'Monthly', line: 'On call while your team runs the route.' },
  { name: 'Team workshop', length: '1–2 days', line: 'Your team learns the route on your own product.' },
]

/** /method FAQ (spec §7.4). Visible text and the FAQPage JSON-LD read this same array. */
export const methodFaqs: readonly { q: string; a: string }[] = [
  {
    q: 'What is the Summit Route?',
    a: 'The Summit Route is my end-to-end go-to-market method for complex technology. It moves through five camps in order: Position, Price, Pipeline, Systems and Team. It ends when your team can run it without me.',
  },
  {
    q: 'What does a GTM consultant do for deep tech companies?',
    a: 'I turn a product the market doesn’t understand yet into revenue you can repeat. For deep tech, that means five jobs in order: positioning something new, pricing the risk and the pilot, building pipeline, fixing the sales systems, and training the team that runs it.',
  },
  {
    q: 'Who is the Summit Route for?',
    a: 'Founders and leaders of cutting-edge technology that’s hard to explain: AI, physical AI and robotics, infrastructure, developer tools, climate tech, biotech platforms and hardware. The common thread is a product that works and a market that doesn’t get it yet.',
  },
  {
    q: 'What is physical AI go-to-market?',
    a: 'Go-to-market for AI that acts in the physical world: robots, autonomy, vision and sensors. The demo is rarely the problem. Pricing the risk, designing a pilot that converts, and turning one site into many usually are.',
  },
  {
    q: 'How is this different from an outbound agency?',
    a: 'An outbound agency runs one channel. I work the whole route, starting upstream with positioning and pricing, where most stalls begin. I’ve built agencies, so I know exactly where their job ends.',
  },
  {
    q: 'How does an engagement work, and what does it cost?',
    a: 'Four ways in: a two-week Recon to diagnose the route, a roughly 90-day Expedition to build and install it, monthly guidance on call, or a one-to-two-day workshop for your team. Every fee is fixed and scoped on a 30-minute fit call.',
  },
]

/** /about Q&A (spec §5.2.5). Also feeds the /about FAQPage. "Consultant or operator?" needs sign-off (§12.1). */
export const aboutQa: readonly { q: string; a: string }[] = [
  {
    q: 'Where else can I find you?',
    a: 'On LinkedIn, as Anurag Gautam Sharma. Same person: I co-founded Suggaa, founded Zecway and The Pipeline Lab, and lead GTM at VideoDB.',
  },
  {
    q: 'Why the mountains?',
    a: 'Because taking new technology to market is uncharted terrain. There’s no trail to follow, only a route you build. I love exploring new places. Same instinct.',
  },
  {
    q: 'Consultant or operator?',
    a: 'Both. I’m Founding GTM Lead at VideoDB and I consult alongside it. I advise from the operator’s seat, not the sidelines.',
  },
  {
    q: 'Do you work with companies outside India?',
    a: 'Yes. Suggaa’s software went to fleet operators in the US and UAE, and The Pipeline Lab’s work spans customers outside India.',
  },
]

/** /about bio, 63 words (spec §5.2.2). The trail log below carries the venture facts. */
export const bio =
  'I’m Anurag Gautam: a founder first, and a go-to-market guide for complex technology. I left computer science at BIT Sindri in my second year to build, and I’ve worked every side of the climb since: product, design, marketing and sales. Today I’m Founding GTM Lead at VideoDB, and I consult alongside it. I design, explore new places and write down what I learn.'

/** /about "At a glance" rows. */
export const glance: readonly { k: string; v: string }[] = [
  { k: 'Does', v: 'End-to-end GTM for complex technology' },
  { k: 'Now', v: 'Founding GTM Lead, VideoDB' },
  { k: 'Built', v: 'Suggaa, Zecway, The Pipeline Lab' },
  { k: 'Off the clock', v: 'Design, content, new places' },
]

// ---------------------------------------------------------------------------
// Field Notes by email (PLAN_V3 §4). One <Subscribe> component reads all of this.
// Honest by default: while email isn't configured the form shows `states.unconfigured`
// and an RSS link, never a fake success. No subscriber counts until there are ≥ 1,000.
// ---------------------------------------------------------------------------

export type SubscribeIntent = 'notes' | 'events' | 'community' | 'cohort'
export type SubscribeSource =
  | 'home'
  | 'article'
  | 'writing'
  | 'footer'
  | 'subscribe'
  | 'start'
  | 'community'
  | 'scorecard'
  | 'contact'
  | 'watch'
export type SubscribeVariant = 'row' | 'card' | 'night' | 'page'

export const newsletter = {
  name: 'Field Notes',
  /** Posts dated before this never go out as an email blast (the cron's floor). */
  since: '2026-10-08',
  /** Stored on the contact as `consent_v`; bump it whenever the consent wording changes. */
  consentVersion: '2026-10-a',
  promise: 'How hard tech actually gets to market. In your inbox when a new note lands.',
  proof: 'From the operator behind 500+ qualified meetings and $7M+ in client revenue.',
  micro: 'Double opt-in. One-click unsubscribe. No spam.',
  emailLabel: 'Work email',
  placeholder: 'you@company.com',
  privacy: 'Privacy',
  privacyHref: '/privacy',
  /** Slugs for the welcome email. Readers filter out any slug that doesn't exist. */
  welcomeNotes: ['pilot-purgatory-is-a-gtm-problem', 'pricing-ai-when-margins-move'] as string[],
  variants: {
    row: { label: 'Field Notes, by email', line: 'New notes in your inbox.', cta: 'Send me the notes' },
    card: {
      h: 'Get the next field note.',
      line: 'Pricing, pilots, pipeline: how hard tech gets to market. Only when there’s something worth sending.',
      cta: 'Send me the notes',
    },
    night: { h: 'Field notes from the climb.', line: 'In your inbox when a new one lands.', cta: 'Subscribe' },
    page: { cta: 'Send me the notes' },
  },
  intents: {
    events: {
      h: 'Get the Campfire invite.',
      cta: 'Get the invite',
      checkbox: 'Also tell me about Campfires and events',
      subject: 'Campfire invite',
    },
    community: {
      h: 'Join the founding list.',
      cta: 'Join the founding list',
      role: 'Your role',
      roles: ['Founder', 'GTM lead', 'Exec at an enterprise', 'Other'] as string[],
      building: 'What are you taking to market?',
      subject: 'Founding list',
    },
    cohort: {
      h: 'Join the cohort waitlist.',
      cta: 'Join the waitlist',
      building: 'Biggest GTM question right now?',
      subject: 'Cohort waitlist',
    },
  },
  /** Max length of the optional "building" answer. */
  buildingMax: 140,
  states: {
    sending: 'Sending…',
    sent: 'Check your inbox. One click confirms it.',
    invalid: 'That email looks off. Try again?',
    error: 'Something broke on my side. Try again in a minute.',
    unconfigured: 'Email sign-up opens soon. Follow by RSS meanwhile.',
    rss: 'RSS feed',
    /** Closed state for the waitlists (events, founding list, cohort): RSS can't hold a seat, an email can. */
    unconfiguredList: 'The list opens soon. Email me and I’ll add you by hand.',
    mail: 'Email me',
  },
  confirm: {
    title: 'One click to confirm.',
    line: 'Confirm and the next field note comes straight to you.',
    cta: 'Confirm my subscription',
    done: 'You’re on the rope.',
    doneLine: 'Start with these while the next note is on its way.',
    expired: 'This link has expired. Subscribe again and a fresh one arrives.',
    paused: 'Confirmations are paused for a moment. Try the link again later.',
  },
  page: {
    kicker: 'Field Notes, by email',
    title: 'Field notes from the climb.',
    line: 'How hard tech actually gets to market: positioning, pricing, pilots, pipeline.',
    getH: 'What you get',
    get: ['Every new field note, the day it lands.', 'The video behind it, when there is one.', 'First word on Campfires and the cohort.'],
    forH: 'Who it’s for',
    for: ['Founders building technology that’s hard to explain.', 'First GTM hires and the leaders who back them.'],
    latestH: 'Read the latest first',
  },
  email: {
    confirmSubject: 'Confirm your Field Notes subscription',
    alreadySubject: 'You’re already on the list',
    alreadyLine: 'You’re already on the list. Nothing to do: the next note comes straight to you.',
    welcomeSubject: 'You’re on the rope',
    welcomeAsk: 'Reply and tell me: what are you taking to market right now?',
    readCta: 'Read the note',
    scorecardCta: 'Score your route',
    unsubscribe: 'Unsubscribe',
  },
}

// ---------------------------------------------------------------------------
// Events (PLAN_V3 §6). Managed here; Luma handles registration. Empty until a date is real:
// every events module renders only from this array (lib/events.ts filters by time).
// ---------------------------------------------------------------------------

export type EventKind = 'campfire' | 'summit-session' | 'workshop'
export type SiteEvent = {
  id: string
  kind: EventKind
  title: string
  line: string
  /** ISO 8601 with offset, e.g. 2026-11-20T19:00:00+05:30 */
  start: string
  end: string
  place: { online: true } | { online: false; city: string; venue?: string }
  /** The public luma.com page (also the no-JS fallback for the checkout button). */
  url: string
  lumaEventId: string | null
  photo?: PhotoId
  /** Link to the recap (note or video) once the event has happened. */
  recap?: string
}

export const events: readonly SiteEvent[] = []

/** Long-form video series (PLAN_V3 §1). Shown only once a video in that series exists. */
export const videoSeries = {
  'route-teardown': { name: 'Route Teardown', line: 'One company, five camps: how it went to market.' },
  'trail-build': { name: 'Trail Build', line: 'A real GTM system, built on screen.' },
  'summit-talks': { name: 'Summit Talks', line: 'Founders and operators. Five camps, five questions.' },
} as const

export const shortsLabel = 'Trail Markers'

/** Inner-page copy (spec §5). Each page reads its own block. */
export const pages = {
  method: {
    hero: {
      kicker: 'How I work',
      h1: 'The Summit Route',
      line: 'Five camps that take complex technology from “what is it?” to “where do I sign?”',
      cta: CTA_CLIMB,
      alt: '2,900 M',
    },
    glance: {
      h2: 'The route at a glance',
      line: 'My end-to-end GTM method for complex technology: five camps, climbed in order, until your team can run it without me.',
    },
    camp: { leaveWith: 'You leave with', clears: 'Clears:' },
    offers: { h2: 'Four ways to climb', note: 'Every fee is fixed and scoped on a 30-minute fit call.' },
    fit: { notFit: home.fit.no },
    faq: { h2: 'Questions from the trail' },
  },
  about: {
    hero: { kicker: 'Anurag Gautam', h1: 'Founder first. GTM guide by trade.', cta: 'How I work', alt: '3,600 M' },
    bio: { glanceLabel: 'At a glance' },
    trail: { h2: 'The trail so far' },
    qa: { h2: 'Straight answers' },
  },
  contact: {
    hero: {
      kicker: CTA_CLIMB,
      h1: 'Tell me what you built.',
      line: 'Six questions, about two minutes. If it’s a fit, we book a 30-minute call.',
      alt: '5,600 M',
    },
    aside: { label: 'Direct line', emailPrefix: 'Prefer email?' },
    submit: { idle: 'Send my answers', pending: 'Packing it up…' },
    /** "What's this about?" chips (TYPE_VALUES in components/contact/options.ts). Only `engagement` runs fit routing. */
    types: {
      label: 'What’s this about?',
      engagement: 'GTM engagement',
      workshop: 'Team workshop',
      speaking: 'Speaking or podcast',
      other: 'Something else',
      /** Optional, unticked. Goes through double opt-in like every other sign-up. */
      alsoNotes: 'Also send me Field Notes',
    },
    states: {
      fit: 'Got it. I’ll reply to your work email.',
      maybe: 'Got it. While you wait, here’s how I work.',
      notFit: 'Too early for a guide. Not too early to join the crew.',
      /** Not-fit result: the founding list (/community#join) first, then the field notes. */
      notFitCta: 'Join the founding list',
      notFitNotes: 'Get the field notes',
      failed: 'That didn’t send. Copy your answers and email me.',
    },
    stamp: 'Received',
  },
  writing: {
    hero: { kicker: 'Notes from the climb', h1: 'Field Notes', line: 'Short, practical notes on positioning, pricing, pilots and pipeline.' },
    empty: 'Fresh tracks coming soon.',
    breadcrumb: 'Field Notes',
    contextCta: { route: 'See the Summit Route', camp: 'See Camp', climb: CTA_CLIMB },
  },
  notFound: {
    h1: 'Off the map.',
    line: 'This page went exploring and never came back. Happens to the best of us.',
    cta: 'Back to basecamp',
    cta2: 'How I work',
  },
  credits: {
    h1: 'Photo credits',
    line: 'These landscapes are stock photos, not my travel shots. Every one is CC0 or public domain. Thank you to the photographers.',
  },

  /** /privacy (≤ 150 words). Linked next to every form. */
  privacy: {
    title: 'Privacy',
    updated: '2026-10-07',
    body: [
      'Forms on this site collect your email, plus the answers you choose to give. They are used only for what the form says: Field Notes, event invites, waitlists or a reply to your work order.',
      'Email runs on Resend. Sign-up is double opt-in; every email has a one-click unsubscribe, and you can withdraw consent at any time.',
      'Nothing is sold or shared. To see, correct or delete your data, or to raise a grievance, write to hello@anuraggautam.com.',
    ],
  },

  /**
   * /community: The Rope Team (≤ 350 words). Founding stage: no member counts, no dates
   * until they are real. Campfires render from `events`; when empty, `campfiresEmpty` + a sign-up.
   * Format cards use Anurag's own field plates (lib/photos.ts fieldPlates), never stock crowds.
   */
  community: {
    photo: 'community-golden',
    alt: '1,800 M',
    kicker: 'The Rope Team',
    title: 'Climb with people taking hard tech to market.',
    line: 'A small crew of founders and GTM leads. The founding list is open.',
    forH: 'Who it’s for',
    for: [
      'Founders and GTM leads at companies building hard tech.',
      'You want real decks, prices and pilots, not theory.',
      'You share what works, not just take.',
    ],
    notFor: ['Growth hacks and template hunting.', 'Selling to the group.'],
    happensH: 'What happens',
    formats: [
      {
        id: 'campfire',
        name: 'Campfires',
        line: 'A live teardown of a member’s pitch, pricing or pipeline.',
        sign: 'Monthly · Online · Dates by email',
        plate: 'hilltop',
        href: '#campfires',
      },
      {
        id: 'summit-session',
        name: 'Summit Sessions',
        line: 'Dinners and seminars in a city near you.',
        sign: 'City dinners · Later',
        plate: 'boat',
        href: '#join',
      },
      {
        id: 'field-school',
        name: 'Field School',
        line: 'The Summit Route, taught live in five weeks.',
        sign: 'Cohort and workshops · Waitlist',
        plate: 'lighthouse',
        href: '#field-school',
      },
    ],
    campfiresH: 'Campfires',
    campfiresEmpty: 'The first Campfire is announced to the list first.',
    register: 'Save a seat',
    past: 'Past campfires',
    recap: 'Read the recap',
    joinH: 'Join the founding list.',
    schoolH: 'Field School',
    cohortName: 'The Summit Route Cohort',
    cohortLine: 'Five live weeks, one camp a week. You leave with your own GTM plan.',
    cohortMeta: 'Live · Small cohort · Dates TBA',
    /** Curriculum label per week, read with `camps` (week n = camp n). */
    week: 'Week',
    workshopLine: 'Want it for your whole team?',
    workshopCta: 'Ask about a team workshop',
    workshopHref: '/contact?type=workshop',
    faqH: 'Straight answers',
    faqs: [
      {
        q: 'What does it cost?',
        a: 'Joining the founding list is free. If a paid tier ever opens, founding members hear first and decide for themselves.',
      },
      {
        q: 'Where does it happen?',
        a: 'Campfires run online and the list gets the link. A members’ space opens once there’s a crew worth gathering.',
      },
      { q: 'How much time does it take?', a: 'One hour a month, if you want it. Field Notes when they land.' },
    ],
  },

  /** /start: the link-in-bio page (≤ 180 words). Three photo doors, then a subscribe row. */
  start: {
    photo: 'start-matterhorn',
    alt: '1,250 M',
    kicker: 'Anurag Gautam',
    title: 'Start here.',
    line: 'Three ways in. Pick the one that fits today.',
    doors: [
      {
        id: 'build',
        h: 'I’m taking hard tech to market.',
        cta: 'See how I work',
        href: '/method',
        alt: { label: 'Score your route', href: '/scorecard' },
        photo: 'route-valley',
      },
      { id: 'learn', h: 'I want to get better at GTM.', cta: 'Read the field notes', href: '/writing', photo: 'notes-forest-path' },
      { id: 'room', h: 'I want to be in the room.', cta: 'Join the Rope Team', href: '/community', photo: 'community-golden' },
    ],
    /** Hand-picked notes for the "learn" door, newest-first fallback when a slug is missing. */
    notes: ['pilot-purgatory-is-a-gtm-problem', 'pricing-ai-when-margins-move'] as string[],
    whoH: 'Who’s Anurag',
    whoCta: 'More about me',
  },

  /**
   * /scorecard: the Summit Route Scorecard (≤ 260 words). Ten statements, two per camp, scored
   * 0/1/2. Answers live only in the URL hash; nothing is sent anywhere.
   */
  scorecard: {
    photo: 'scorecard-panorama',
    alt: '1,250 M',
    kicker: 'Summit Route Scorecard',
    title: 'How high is your GTM?',
    line: 'Ten statements. Two minutes. Find the camp where you’re stuck.',
    // Not "Start the climb": that label is the site-wide hire CTA (/contact), shown on this page too.
    start: 'Score your route',
    scale: ['Not yet', 'Partly', 'Yes'],
    next: 'Next camp',
    back: 'Back',
    see: 'See my altitude',
    progress: 'Statement',
    resultH: 'Your altitude',
    stallH: 'Your stall',
    states: { stalled: 'Stalled', climbing: 'Climbing', clear: 'Clear' },
    /** Shown instead of a stall when every camp is clear. */
    summit: 'Every camp is clear. Keep the rope tight.',
    cta: 'Book a Recon',
    ctaLine: 'Two weeks. One page: the three moves that matter most.',
    campLink: 'Read about this camp',
    retake: 'Retake',
    share: 'Copy link to result',
    copied: 'Link copied',
    privacy: 'Your answers stay in this page’s link. Nothing is sent anywhere.',
    questions: [
      { camp: 'position', q: 'A buyer can repeat what you do, in one sentence, after one call.' },
      { camp: 'position', q: 'You can name the buyer who feels the pain most, and why now.' },
      { camp: 'price', q: 'Your price is anchored to the value you create, not to cost or a rival.' },
      { camp: 'price', q: 'Deals close without a discount deciding them.' },
      { camp: 'market', q: 'Qualified meetings arrive every week without the founder sourcing them.' },
      { camp: 'market', q: 'You know which signals mean an account is ready to buy.' },
      { camp: 'systems', q: 'Pilots start with written success criteria and a path to contract.' },
      { camp: 'systems', q: 'Your CRM shows where every deal stalls, without asking anyone.' },
      { camp: 'team', q: 'Someone other than the founder closed a deal this quarter.' },
      { camp: 'team', q: 'A new seller could run your playbook from what’s written down.' },
    ],
  },

  /** /watch and /watch/[slug]. These routes 404 until a real video exists. */
  watch: {
    kicker: 'Field Notes · Watch',
    title: 'Footage from the climb.',
    line: 'Teardowns, builds and conversations on taking hard tech to market.',
    transcript: 'Read the transcript',
    related: 'Read the field note',
    onYouTube: 'Watch on YouTube',
    play: 'Play',
    chaptersH: 'Chapters',
    takeawaysH: 'Takeaways',
    shortsH: shortsLabel,
    tabs: { read: 'Read', watch: 'Watch' },
  },
} as const

/** Page titles and descriptions (spec §7.2). The root template adds " | Anurag Gautam". */
export const pageMeta = {
  home: {
    title: 'Anurag Gautam | GTM Consultant for Complex Technology', // title.absolute
    description:
      'You built something the world hasn’t seen yet. I take it to market: end-to-end GTM for cutting-edge and deep tech founders, from AI to hardware.',
  },
  method: {
    title: 'The Summit Route: GTM Strategy for Complex Tech',
    description:
      'My five-camp GTM method for complex technology: positioning, pricing, pipeline, systems and team. Built for cutting-edge and deep tech founders.',
  },
  about: {
    title: 'About: Founder and GTM Consultant',
    description:
      'Founder first. Co-founded Suggaa ($2M raised), founded Zecway and The Pipeline Lab ($7M+ client revenue), now Founding GTM Lead at VideoDB.',
  },
  contact: {
    title: 'Start the Climb',
    description: 'Tell me what you built and where it’s stuck. Six quick questions to see if we should take it to market together.',
  },
  writing: {
    title: 'Field Notes on Complex Tech GTM',
    description:
      'Short, practical notes on positioning, pricing, pilots and pipeline for AI, physical AI and complex technology. Notes from the climb.',
  },
  notFound: { title: 'Off the Map' },
  credits: { title: 'Photo credits' },
  subscribe: {
    title: 'Field Notes by Email',
    description:
      'How hard tech actually gets to market: positioning, pricing, pilots and pipeline. New field notes in your inbox when they land. Double opt-in.',
  },
  community: {
    title: 'The Rope Team',
    description:
      'A small crew of founders and GTM leads taking hard tech to market. Live Campfire teardowns and a Field School cohort. The founding list is open.',
  },
  start: {
    title: 'Start Here',
    description: 'Three ways in: work with me on your go-to-market, read the field notes, or join the Rope Team. Pick the one that fits today.',
  },
  scorecard: {
    title: 'Summit Route Scorecard',
    description:
      'Ten statements, two minutes. Score your go-to-market across five camps, see your altitude and find the camp where you’re stuck.',
  },
  watch: {
    title: 'Watch: GTM Teardowns',
    description: 'Route Teardowns, Trail Builds and Summit Talks: videos on taking hard tech to market, each with a full transcript.',
  },
  privacy: {
    title: 'Privacy',
    description: 'What the forms on this site collect, what it’s used for, and how to unsubscribe, see or delete your data.',
  },
} as const

// ---------------------------------------------------------------------------
// Chrome
// ---------------------------------------------------------------------------

export const nav: readonly { label: string; href: string }[] = [
  { label: 'How I work', href: '/method' },
  { label: 'Field Notes', href: '/writing' },
  { label: 'Community', href: '/community' },
  { label: 'About', href: '/about' },
]

/** Header/menu/footer CTA labels (spec §3). */
export const chrome = {
  cta: CTA_CLIMB,
  ctaShort: 'Let’s talk',
  wordmark: 'ANURAG GAUTAM',
  photoCredits: 'Photo credits',
} as const

/** Footer copy (spec §3). Labels stay plain; the sign-off is the one line of voice. */
export const footer = {
  signoff: 'Go somewhere new.',
  contactLabel: 'Contact',
  cols: { route: 'How I work', notes: 'Field Notes', community: 'Community', about: 'About' },
  links: {
    summitRoute: 'The Summit Route',
    scorecard: 'Score your route',
    workshop: 'Team workshop',
    allNotes: 'All notes',
    /** Only when a video exists. */
    watch: 'Watch',
    subscribe: 'Subscribe',
    rss: 'RSS',
    community: 'The Rope Team',
    campfires: 'Campfires',
    fieldSchool: 'Field School',
    start: 'Start here',
    about: 'About Anurag',
    linkedin: 'LinkedIn',
    /** Only when `channels.youtube.handle` / `channels.instagram.handle` is set. */
    youtube: 'YouTube',
    instagram: 'Instagram',
    privacy: 'Privacy',
    /** Kept for machine-facing use only. Never rendered: the client wants machine-facing things out of human view. */
    llms: 'llms.txt (for AI assistants)',
  },
  /** Hrefs for the links above that aren't obvious from the label. */
  hrefs: {
    scorecard: '/scorecard',
    workshop: '/contact?type=workshop',
    subscribe: '/subscribe',
    watch: '/watch',
    community: '/community',
    campfires: '/community#campfires',
    fieldSchool: '/community#field-school',
    start: '/start',
    privacy: '/privacy',
  },
} as const

export const footerSignoff = footer.signoff
