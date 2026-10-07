import 'server-only'
import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'node:crypto'
import { Resend } from 'resend'
import { after } from 'next/server'
import { allPosts } from 'content-collections'
import { SITE_URL, newsletter, type SubscribeIntent, type SubscribeSource } from '@/lib/site'
import { alreadyEmail, confirmEmail, welcomeEmail } from '@/lib/email/templates'

/*
 * Field Notes by email (PLAN_V3 §4): custom double opt-in on Resend.
 *
 *   request → sealed token (AES-256-GCM, the email is never readable in the URL; no contact yet)
 *           → confirm email → GET /subscribe/confirm shows a button (link scanners never confirm)
 *           → POST confirms → contact created or re-activated in the segment, topics set → welcome.
 *
 * Nothing here pretends: without the env vars every entry point reports 'unconfigured'.
 */

const TOKEN_TTL_MS = 72 * 60 * 60 * 1000
const TOKEN_VERSION = 1

type Env = {
  apiKey: string
  secret: string
  from: string
  replyTo: string | undefined
  segmentId: string
  topics: { notes: string; events: string | null; community: string | null; cohort: string | null }
  postal: string | null
}

const val = (k: string) => {
  const v = process.env[k]?.trim()
  return v ? v : null
}

function readEnv(): Env | null {
  const apiKey = val('RESEND_API_KEY')
  const secret = val('SUBSCRIBE_SECRET')
  const from = val('NEWSLETTER_FROM') ?? val('CONTACT_FROM')
  const segmentId = val('RESEND_SEGMENT_ID')
  const notes = val('RESEND_TOPIC_NOTES_ID')
  if (!apiKey || !secret || secret.length < 32 || !from || !segmentId || !notes) return null
  return {
    apiKey,
    secret,
    from,
    // No public address: replies reach the first private inbox that receives briefs.
    replyTo: val('NEWSLETTER_REPLY_TO') ?? val('CONTACT_TO')?.split(',')[0].trim() ?? undefined,
    segmentId,
    topics: {
      notes,
      events: val('RESEND_TOPIC_EVENTS_ID'),
      community: val('RESEND_TOPIC_COMMUNITY_ID'),
      cohort: val('RESEND_TOPIC_COHORT_ID'),
    },
    postal: val('NEWSLETTER_POSTAL_ADDRESS'),
  }
}

/** True only when the API key, a 32+ character secret, a from address, the segment and the notes topic are set. */
export function newsletterReady(): boolean {
  return readEnv() !== null
}

/** For the cron route: the ready config, or null. */
export function newsletterEnv() {
  return readEnv()
}

/** Absolute links in emails. A local dev server links to itself so the flow can be tested end to end. */
export function siteBase(host?: string | null): string {
  if (process.env.NODE_ENV === 'development' && host && /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) {
    return `http://${host}`
  }
  return SITE_URL
}

// ---------------------------------------------------------------------------
// Sealed token
// ---------------------------------------------------------------------------

type Payload = {
  e: string
  i: SubscribeIntent
  s: SubscribeSource
  r?: string
  b?: string
  ev?: 1
  x: number
  v: string
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

function keyFor(secret: string) {
  return Buffer.from(hkdfSync('sha256', secret, 'anuraggautam.com', 'field-notes/subscribe-token/v1', 32))
}

function seal(payload: Payload, secret: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyFor(secret), iv)
  const ct = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  return Buffer.concat([Buffer.from([TOKEN_VERSION]), iv, cipher.getAuthTag(), ct]).toString('base64url')
}

const INTENTS = new Set<string>(['notes', 'events', 'community', 'cohort'])

function open(token: string, secret: string): Payload | null {
  try {
    if (!/^[\w-]{40,2048}$/.test(token)) return null
    const buf = Buffer.from(token, 'base64url')
    if (buf.length < 1 + 12 + 16 + 2 || buf[0] !== TOKEN_VERSION) return null
    const decipher = createDecipheriv('aes-256-gcm', keyFor(secret), buf.subarray(1, 13))
    decipher.setAuthTag(buf.subarray(13, 29))
    const json = Buffer.concat([decipher.update(buf.subarray(29)), decipher.final()]).toString('utf8')
    const p = JSON.parse(json) as Payload
    if (typeof p.e !== 'string' || !INTENTS.has(p.i) || typeof p.x !== 'number') return null
    return p
  } catch {
    return null
  }
}

/**
 * Read a token without side effects (the GET confirm page uses it to show the button or the
 * expired state up front). Never confirms anything.
 */
export function peekToken(token: string): 'valid' | 'expired' | 'invalid' | 'unconfigured' {
  const env = readEnv()
  if (!env) return 'unconfigured'
  const p = open(token, env.secret)
  if (!p) return 'invalid'
  return p.x < Date.now() ? 'expired' : 'valid'
}

// ---------------------------------------------------------------------------
// Resend helpers
// ---------------------------------------------------------------------------

type ResendError = { name?: string; message?: string; statusCode?: number | null } | null

/** A repeat of the same idempotency key means the first email already went: treat as sent. */
const isRepeat = (err: ResendError) =>
  err?.name === 'invalid_idempotent_request' || err?.name === 'concurrent_idempotent_requests' || err?.statusCode === 409

const log = (where: string, err: unknown) =>
  console.error(`[newsletter] ${where}:`, err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : err)

type ContactState = { exists: false } | { exists: true; active: boolean; source: string | null }

async function lookup(resend: Resend, email: string): Promise<ContactState | 'error'> {
  const { data, error } = await resend.contacts.get({ email })
  if (error) {
    if (error.name === 'not_found' || error.statusCode === 404) return { exists: false }
    log('contacts.get', error)
    return 'error'
  }
  const props = data.properties ?? {}
  const consented = Boolean(props.consent_at?.value)
  const source = props.source?.type === 'string' ? props.source.value || null : null
  return { exists: true, active: !data.unsubscribed && consented, source }
}

/** Published notes for the welcome email, in `newsletter.welcomeNotes` order; drafts and unknown slugs drop out. */
export function welcomeNotes() {
  return newsletter.welcomeNotes
    .map((slug) => allPosts.find((p) => p.slug === slug && !p.draft))
    .filter((p): p is (typeof allPosts)[number] => Boolean(p))
}

const clip = (s: string | undefined, max: number) => {
  const t = s?.replace(/\s+/g, ' ').trim()
  return t ? t.slice(0, max) : undefined
}

// ---------------------------------------------------------------------------
// Public API (the contract other packages import)
// ---------------------------------------------------------------------------

/**
 * Step 1–3: seal the request and send one confirm email (or an "already on the list" note).
 * The result never says whether an address is subscribed: an accepted request is always 'sent'.
 */
export async function requestSubscription(i: {
  email: string
  intent: SubscribeIntent
  source: SubscribeSource
  role?: string
  building?: string
  events?: boolean
  /** Base URL for links; defaults to the live site. */
  base?: string
}): Promise<'sent' | 'unconfigured' | 'error'> {
  const env = readEnv()
  if (!env) return 'unconfigured'
  const email = i.email.trim().toLowerCase()
  const base = i.base ?? SITE_URL

  try {
    const resend = new Resend(env.apiKey)

    // A plain notes request from an active subscriber gets "you're already on the list".
    // Waitlist and event intents always go through a confirm, which is how the topic gets added.
    if (i.intent === 'notes' && !i.events) {
      const state = await lookup(resend, email)
      if (state === 'error') return 'error'
      if (state.exists && state.active) {
        const mail = alreadyEmail({ base })
        const { error } = await resend.emails.send(
          { from: env.from, to: email, replyTo: env.replyTo, subject: mail.subject, html: mail.html, text: mail.text },
          { idempotencyKey: `already/${sha256(email)}` },
        )
        if (error && !isRepeat(error)) {
          log('emails.send(already)', error)
          return 'error'
        }
        return 'sent'
      }
    }

    const payload: Payload = {
      e: email,
      i: i.intent,
      s: i.source,
      r: clip(i.role, 60),
      b: clip(i.building, newsletter.buildingMax),
      ev: i.events || i.intent === 'events' ? 1 : undefined,
      x: Date.now() + TOKEN_TTL_MS,
      v: newsletter.consentVersion,
    }
    const url = `${base}/subscribe/confirm?t=${seal(payload, env.secret)}`
    const mail = confirmEmail({ url, intent: i.intent })
    const { error } = await resend.emails.send(
      { from: env.from, to: email, replyTo: env.replyTo, subject: mail.subject, html: mail.html, text: mail.text },
      // One confirm per address per intent per 24h: protects the 100-a-day transactional cap.
      { idempotencyKey: `confirm/${sha256(email + i.intent)}` },
    )
    if (error && !isRepeat(error)) {
      log('emails.send(confirm)', error)
      return 'error'
    }
    return 'sent'
  } catch (err) {
    log('requestSubscription', err)
    return 'error'
  }
}

/**
 * Step 5 (POST only): open the token, create or re-activate the contact in the segment with its
 * topics and consent record, and send the welcome email after the response.
 */
export async function confirmToken(token: string): Promise<'confirmed' | 'expired' | 'invalid' | 'unconfigured' | 'error'> {
  const env = readEnv()
  if (!env) return 'unconfigured'
  const p = open(token, env.secret)
  if (!p) return 'invalid'
  if (p.x < Date.now()) return 'expired'

  const topics: { id: string; subscription: 'opt_in' }[] = [{ id: env.topics.notes, subscription: 'opt_in' }]
  const extra: (string | null)[] = [
    p.ev ? env.topics.events : null,
    p.i === 'community' ? env.topics.community : null,
    p.i === 'cohort' ? env.topics.cohort : null,
  ]
  for (const id of extra) if (id) topics.push({ id, subscription: 'opt_in' })
  if ((p.ev && !env.topics.events) || (p.i === 'community' && !env.topics.community) || (p.i === 'cohort' && !env.topics.cohort)) {
    console.warn(`[newsletter] topic id for "${p.i}" is not set; the intent is kept as a contact property only.`)
  }

  const consent = { consent_at: new Date().toISOString(), consent_v: p.v }
  const answers: Record<string, string> = {}
  if (p.r) answers.role = p.r
  if (p.b) answers.building = p.b

  try {
    const resend = new Resend(env.apiKey)
    const state = await lookup(resend, p.e)
    if (state === 'error') return 'error'

    let welcome = true
    if (!state.exists) {
      const { error } = await resend.contacts.create({
        email: p.e,
        unsubscribed: false,
        segments: [{ id: env.segmentId }],
        topics,
        properties: { source: p.s, intent: p.i, ...answers, ...consent },
      })
      if (error) {
        log('contacts.create', error)
        return 'error'
      }
    } else {
      welcome = !state.active
      // First-touch attribution: keep the source that first brought them in.
      const { error } = await resend.contacts.update({
        email: p.e,
        unsubscribed: false,
        properties: { source: state.source ?? p.s, intent: p.i, ...answers, ...consent },
      })
      if (error) {
        log('contacts.update', error)
        return 'error'
      }
      const seg = await resend.contacts.segments.add({ email: p.e, segmentId: env.segmentId })
      if (seg.error && seg.error.statusCode !== 409) log('contacts.segments.add', seg.error)
      const tp = await resend.contacts.topics.update({ email: p.e, topics })
      if (tp.error) {
        log('contacts.topics.update', tp.error)
        return 'error'
      }
    }

    if (welcome) {
      after(async () => {
        try {
          const mail = welcomeEmail({
            notes: welcomeNotes().map((n) => ({ title: n.title, description: n.description, path: `/writing/${n.slug}` })),
            postal: env.postal,
          })
          const { error } = await resend.emails.send(
            {
              from: env.from,
              to: p.e,
              replyTo: env.replyTo,
              subject: mail.subject,
              html: mail.html,
              text: mail.text,
              headers: env.replyTo ? { 'List-Unsubscribe': `<mailto:${env.replyTo.replace(/^.*<|>.*$/g, '')}?subject=unsubscribe>` } : undefined,
            },
            { idempotencyKey: `welcome/${sha256(p.e)}` },
          )
          if (error && !isRepeat(error)) log('emails.send(welcome)', error)
        } catch (err) {
          log('welcome', err)
        }
      })
    }
    return 'confirmed'
  } catch (err) {
    log('confirmToken', err)
    return 'error'
  }
}

/** Which intent a token carries, for analytics after a confirm (null when it can't be read). */
export function tokenMeta(token: string): { intent: SubscribeIntent; source: SubscribeSource } | null {
  const env = readEnv()
  if (!env) return null
  const p = open(token, env.secret)
  return p ? { intent: p.i, source: p.s } : null
}
