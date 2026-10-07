'use server'

import { z } from 'zod'
import { Resend } from 'resend'
import { after } from 'next/server'
import { headers } from 'next/headers'
import { requestSubscription, siteBase } from '@/lib/newsletter'
import {
  TYPE_LABELS,
  TYPE_VALUES,
  cleanSource,
  isWorkType,
  STAGE_LABELS,
  STAGE_VALUES,
  STUCK_LABELS,
  STUCK_VALUES,
  TIMELINE_LABELS,
  TIMELINE_VALUES,
  type Field,
  type Route,
  type WorkOrderState,
  type WorkOrderValues,
  type WorkType,
} from '@/components/contact/options'

const MIN_FILL_MS = 3000
const URL_MSG = 'Company URL looks off. Try https://…'

/** Accepts "acme.ai", "www.acme.ai/robots" or a full URL. Returns a normalised https URL, or null. */
function normaliseUrl(raw: string): string | null {
  const v = raw.trim()
  if (!v || /\s/.test(v)) return null
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`)
    if (!/^https?:$/.test(u.protocol)) return null
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(u.hostname)) return null
    return u.href
  } catch {
    return null
  }
}

const base = z.object({
  type: z.enum(TYPE_VALUES).catch('engagement'),
  name: z
    .string()
    .trim()
    .min(1, { error: 'Need a name. First name is fine.' })
    .max(120, { error: 'That name is a little long. 120 characters max.' }),
  email: z
    .string()
    .trim()
    .max(254, { error: "Need a work email. That's where the next step goes." })
    .pipe(z.email({ error: "Need a work email. That's where the next step goes." })),
  company_url: z
    .string()
    .trim()
    .max(300, { error: URL_MSG })
    .refine((v) => normaliseUrl(v) !== null, { error: URL_MSG })
    .transform((v) => normaliseUrl(v) as string),
  sell: z
    .string()
    .trim()
    .min(3, { error: 'One line on what you built.' })
    .max(280, { error: 'One line, please. 280 characters max.' }),
})

// Stuck, stage and timing belong to a GTM engagement (they drive the fit routing).
// Workshop, speaking and other requests skip them: the form hides those questions too.
const engagement = base.extend({
  stuck: z.array(z.enum(STUCK_VALUES)).max(STUCK_VALUES.length),
  stage: z.enum(STAGE_VALUES, { error: 'Pick the stage closest to yours.' }),
  timeline: z.enum(TIMELINE_VALUES, { error: 'Pick a timeline.' }),
})

type WorkOrder = z.infer<typeof base> & Partial<Pick<z.infer<typeof engagement>, 'stuck' | 'stage' | 'timeline'>>

/** Routing table from the spec (§7 /contact). Pre-product is checked first. Engagements only. */
function route(d: WorkOrder): Route {
  if (d.type !== 'engagement' || !d.stage || !d.timeline || !d.stuck) return 'fit'
  if (d.stage === 'pre-product') return 'not-fit'
  if (d.timeline === 'exploring') return 'maybe'
  if (d.timeline === 'now' || d.timeline === 'quarter') return d.stuck.length > 0 ? 'fit' : 'maybe'
  return 'maybe'
}

const companyName = (url: string) => new URL(url).hostname.replace(/^www\./, '')

function summary(d: WorkOrder, r: Route, source: string | null, alsoNotes: boolean) {
  const isEngagement = d.type === 'engagement'
  return [
    isEngagement ? `WORK ORDER (${r.toUpperCase()})` : `WORK ORDER (${TYPE_LABELS[d.type].toUpperCase()})`,
    '',
    `About: ${TYPE_LABELS[d.type]}`,
    `Name: ${d.name}`,
    `Email: ${d.email}`,
    `Company: ${d.company_url}`,
    `${isEngagement ? 'Sells' : 'Details'}: ${d.sell}`,
    ...(isEngagement && d.stuck && d.stage && d.timeline
      ? [
          `Stuck: ${d.stuck.length ? d.stuck.map((s) => STUCK_LABELS[s]).join(', ') : 'Not specified'}`,
          `Stage: ${STAGE_LABELS[d.stage]}`,
          `Timeline: ${TIMELINE_LABELS[d.timeline]}`,
        ]
      : []),
    ...(source ? [`Source: ${source}`] : []),
    ...(alsoNotes ? ['Field Notes: asked to subscribe (double opt-in email sent)'] : []),
  ].join('\n')
}

const str = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v : '')

function readValues(fd: FormData): WorkOrderValues {
  return {
    type: str(fd.get('type')),
    also_notes: str(fd.get('also_notes')) === 'on',
    name: str(fd.get('name')),
    email: str(fd.get('email')),
    company_url: str(fd.get('company_url')),
    sell: str(fd.get('sell')),
    stage: str(fd.get('stage')),
    timeline: str(fd.get('timeline')),
    stuck: fd.getAll('stuck').filter((v): v is string => typeof v === 'string'),
  }
}

export async function submitWorkOrder(_prev: WorkOrderState, fd: FormData): Promise<WorkOrderState> {
  const values = readValues(fd)

  const type: WorkType = isWorkType(values.type) ? values.type : 'engagement'
  values.type = type
  const source = cleanSource(str(fd.get('source')))

  // Validate first: a fast autofill with a missing field should see field errors, not the bot message.
  const schema = type === 'engagement' ? engagement : base
  const parsed = schema.safeParse({ ...values, type, stage: values.stage || undefined, timeline: values.timeline || undefined })
  if (!parsed.success) {
    const errors: Partial<Record<Field, string>> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as Field | undefined
      if (key && !errors[key]) errors[key] = issue.message
    }
    return { status: 'invalid', errors, values }
  }

  // Bots (valid submissions only): a filled honeypot, or faster than a person can fill six questions.
  // t0 (form ready) and t1 (submit) both come from the visitor's clock, so server/client skew can't block a person.
  const t0 = Number(str(fd.get('t0')))
  const t1 = Number(str(fd.get('t1')))
  const tooFast = !(t0 > 0 && Number.isFinite(t1) && t1 - t0 >= MIN_FILL_MS)
  if (str(fd.get('company_website')).trim() !== '' || tooFast) {
    return { status: 'blocked', values }
  }

  const data: WorkOrder = parsed.data
  const r = route(data)
  const alsoNotes = Boolean(values.also_notes)
  const text = summary(data, r, source, alsoNotes)

  const { RESEND_API_KEY, CONTACT_FROM, CONTACT_TO } = process.env
  if (!RESEND_API_KEY || !CONTACT_FROM || !CONTACT_TO) {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[work-order] email not configured; submission not sent:\n${text}`)
    }
    return { status: 'unsent', route: r, type, summary: text }
  }

  try {
    const resend = new Resend(RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: CONTACT_FROM,
      to: CONTACT_TO.split(',').map((s) => s.trim()).filter(Boolean),
      replyTo: data.email,
      subject: `Work order · ${TYPE_LABELS[type]}: ${companyName(data.company_url)}`,
      text: `${text}\n\nReceived: ${new Date().toISOString()}`,
    })
    if (error) {
      console.error('[work-order] send failed:', error.message)
      return { status: 'failed', values }
    }
  } catch (err) {
    console.error('[work-order] send threw:', err instanceof Error ? err.message : err)
    return { status: 'failed', values }
  }

  // The optional, unticked "Also send me Field Notes": the same double opt-in as every other
  // sign-up (a confirm email, never a silent add), sent after the response so it can't slow it.
  if (alsoNotes) {
    const h = await headers()
    after(async () => {
      const res = await requestSubscription({ email: data.email, intent: 'notes', source: 'contact', base: siteBase(h.get('host')) })
      if (res !== 'sent') {
        console.warn(`[work-order] Field Notes request: ${res}`)
        return
      }
      try {
        const { track } = await import('@vercel/analytics/server')
        await track('subscribe_requested', { source: 'contact', intent: 'notes' }, { headers: h })
      } catch {
        /* analytics is best-effort */
      }
    })
  }

  return { status: 'sent', route: r, type }
}
