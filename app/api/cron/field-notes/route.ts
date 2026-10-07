import { timingSafeEqual } from 'node:crypto'
import { Resend } from 'resend'
import { newsletter } from '@/lib/site'
import { newsletterEnv } from '@/lib/newsletter'
import { fieldNoteEmail } from '@/lib/email/templates'
import { publishedPosts } from '@/components/writing/posts'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_AGE_DAYS = 14
const PREFIX = 'field-note:'

/** Today in IST (the cron fires at 09:00 IST), as YYYY-MM-DD, to compare with frontmatter dates. */
const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000)

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const got = Buffer.from(req.headers.get('authorization') ?? '')
  const want = Buffer.from(`Bearer ${secret}`)
  return got.length === want.length && timingSafeEqual(got, want)
}

/**
 * Auto-send for new notes (PLAN_V3 §4), daily from vercel.json at 03:30 UTC.
 * Picks published posts with `notify`, dated on or after `newsletter.since`, not in the future,
 * under 14 days old, and with no broadcast already named `field-note:<slug>` (the name is the
 * idempotency guard). Manual run:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://anuraggautam.com/api/cron/field-notes
 */
export async function GET(req: Request) {
  if (!authorised(req)) return Response.json({ reason: 'unauthorised' }, { status: 401 })

  const env = newsletterEnv()
  if (!env) return Response.json({ reason: 'not-configured' }, { status: 503 })
  if (!env.postal) return Response.json({ reason: 'no-postal-address' }, { status: 412 })

  const resend = new Resend(env.apiKey)

  // Every broadcast name already used (paged; the list is small for years).
  const names = new Set<string>()
  let after: string | undefined
  for (let page = 0; page < 20; page++) {
    const { data, error } = await resend.broadcasts.list(after ? { limit: 100, after } : { limit: 100 })
    if (error) {
      console.error('[cron/field-notes] broadcasts.list:', error.message)
      return Response.json({ reason: 'resend-error', detail: error.name }, { status: 502 })
    }
    for (const b of data.data) names.add(b.name)
    if (!data.has_more || !data.data.length) break
    after = data.data[data.data.length - 1].id
  }

  const today = todayIST()
  const due = publishedPosts().filter((p) => {
    if (!p.notify || p.date < newsletter.since || p.date > today) return false
    if (daysBetween(p.date, today) >= MAX_AGE_DAYS) return false
    return !names.has(`${PREFIX}${p.slug}`)
  })

  const sent: string[] = []
  const failed: { slug: string; reason: string }[] = []
  // Oldest first, so two notes on the same morning arrive in reading order.
  for (const post of [...due].reverse()) {
    const mail = fieldNoteEmail({
      title: post.title,
      description: post.description,
      takeaways: post.takeaways,
      path: `/writing/${post.slug}`,
      postal: env.postal,
    })
    const { error } = await resend.broadcasts.create({
      name: `${PREFIX}${post.slug}`,
      segmentId: env.segmentId,
      topicId: env.topics.notes,
      from: env.from,
      replyTo: env.replyTo,
      subject: mail.subject,
      previewText: mail.previewText,
      html: mail.html,
      text: mail.text,
      send: true,
    })
    if (error) {
      console.error(`[cron/field-notes] broadcasts.create(${post.slug}):`, error.message)
      failed.push({ slug: post.slug, reason: error.name })
    } else {
      sent.push(post.slug)
    }
  }

  return Response.json({ sent, failed, checked: today }, { status: failed.length && !sent.length ? 502 : 200 })
}
