'use server'

import { z } from 'zod'
import { after } from 'next/server'
import { headers } from 'next/headers'
import { newsletter, type SubscribeIntent, type SubscribeSource } from '@/lib/site'
import { requestSubscription, siteBase } from '@/lib/newsletter'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export type SubscribeState = {
  status: 'idle' | 'sent' | 'invalid' | 'unconfigured' | 'error'
  message?: string
  /** Echoed back on 'invalid' / 'error' so a retry doesn't start from an empty field. */
  email?: string
}

const MIN_FILL_MS = 1500

const INTENTS = ['notes', 'events', 'community', 'cohort'] as const satisfies readonly SubscribeIntent[]
const SOURCES = [
  'home',
  'article',
  'writing',
  'footer',
  'subscribe',
  'start',
  'community',
  'scorecard',
  'contact',
  'watch',
] as const satisfies readonly SubscribeSource[]

const schema = z.object({
  email: z.string().trim().max(254).pipe(z.email()),
  intent: z.enum(INTENTS).catch('notes'),
  source: z.enum(SOURCES).catch('subscribe'),
  role: z.string().trim().max(60).optional(),
  building: z.string().trim().max(newsletter.buildingMax).optional(),
  events: z.literal('on').optional(),
})

const str = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v : undefined)

/** Too quick, too many, or a filled honeypot: honest, and nothing is sent. */
const SLOW_DOWN = 'That was quicker than a person types. Give it a second and send again.'

/**
 * The one Server Action behind every <Subscribe>. Works without JS (a plain form post).
 * Fields: email, intent, source, role?, building?, events?('on'), company_website (honeypot), t0, t1.
 */
export async function subscribe(_prev: SubscribeState, fd: FormData): Promise<SubscribeState> {
  const email = str(fd.get('email')) ?? ''
  const parsed = schema.safeParse({
    email,
    intent: str(fd.get('intent')),
    source: str(fd.get('source')),
    role: str(fd.get('role')) || undefined,
    building: str(fd.get('building')) || undefined,
    events: str(fd.get('events')) || undefined,
  })
  if (!parsed.success) {
    const emailIssue = parsed.error.issues.some((i) => i.path[0] === 'email')
    return { status: 'invalid', message: emailIssue ? newsletter.states.invalid : newsletter.states.error, email }
  }

  // Bots: a filled honeypot, or faster than a person can type an address. With JS both stamps come
  // from the visitor's clock; without JS, t0 is the server's render time and the check uses ours.
  const t0 = Number(str(fd.get('t0')))
  const t1 = Number(str(fd.get('t1')))
  const elapsed = (Number.isFinite(t1) && t1 > 0 ? t1 : Date.now()) - t0
  if ((str(fd.get('company_website')) ?? '').trim() !== '' || !(t0 > 0) || elapsed < MIN_FILL_MS) {
    return { status: 'error', message: SLOW_DOWN, email }
  }

  const h = await headers()
  if (!rateLimit(`subscribe:${clientIp(h)}`).ok) {
    return { status: 'error', message: SLOW_DOWN, email }
  }

  const d = parsed.data
  const result = await requestSubscription({
    email: d.email,
    intent: d.intent,
    source: d.source,
    role: d.role,
    building: d.building,
    events: d.events === 'on',
    base: siteBase(h.get('host')),
  })

  if (result === 'unconfigured') return { status: 'unconfigured', message: newsletter.states.unconfigured }
  if (result === 'error') return { status: 'error', message: newsletter.states.error, email }

  // Vercel custom events record on the Pro plan only; failures never touch the visitor.
  after(async () => {
    try {
      const { track } = await import('@vercel/analytics/server')
      await track('subscribe_requested', { source: d.source, intent: d.intent }, { headers: h })
      if (d.intent === 'community' || d.intent === 'cohort') await track('waitlist_join', { source: d.source, intent: d.intent }, { headers: h })
    } catch {
      /* analytics is best-effort */
    }
  })

  return { status: 'sent', message: newsletter.states.sent }
}
