import 'server-only'
import { SITE_URL, newsletter, person, type SubscribeIntent } from '@/lib/site'

/*
 * Field Notes emails (PLAN_V3 §4). Plain HTML strings with inline styles: Resend's `react:` option
 * needs @react-email/render, which isn't installed. Paper background, ink text, 0 radius, and
 * sunrise orange only on the one button (ink on sunrise-500 is 5.85:1). Every email also has a
 * plain-text part. Table layout, because Outlook still renders with Word.
 */

const C = {
  paper: '#F7F2E8',
  surface: '#FCFAF4',
  ink: '#0E1D15',
  muted: '#565D57', // granite-700, 6.07:1 on paper
  line: '#D8DAD3', // granite-200
  sunrise: '#F86A00',
}
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const MONO = "'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace"

/**
 * The few lines that only exist inside an email. Kept here, beside the markup that uses them,
 * until they move into lib/site.ts `newsletter.email`.
 */
const LINES = {
  confirmExpiry: 'The link works for 3 days. Didn’t ask for this? Ignore this email and nothing happens.',
  intentLine: {
    notes: '',
    events: 'You asked for the Campfire invite.',
    community: 'You asked to join the Rope Team founding list.',
    cohort: 'You asked to join the Field School cohort waitlist.',
  } satisfies Record<SubscribeIntent, string>,
  signoff: 'Anurag',
  why: 'You get this because you subscribed to Field Notes at anuraggautam.com.',
  latest: 'Read the latest note',
}

export type Email = { subject: string; html: string; text: string; previewText?: string }

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const abs = (path: string, base = SITE_URL) => (/^https?:\/\//.test(path) ? path : `${base}${path}`)

function label(text: string) {
  return `<p style="margin:0 0 16px;font:500 11px/1.2 ${MONO};letter-spacing:.14em;text-transform:uppercase;color:${C.muted}">${esc(text)}</p>`
}
function h1(text: string) {
  return `<h1 style="margin:0 0 16px;font:800 30px/1.1 ${SANS};letter-spacing:-.02em;color:${C.ink}">${esc(text)}</h1>`
}
function p(text: string, opts: { muted?: boolean; size?: number } = {}) {
  return `<p style="margin:0 0 16px;font:400 ${opts.size ?? 17}px/1.55 ${SANS};color:${opts.muted ? C.muted : C.ink}">${esc(text)}</p>`
}
/** The one orange element in every email. */
function button(href: string, text: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px"><tr><td style="background:${C.sunrise};border-radius:0">
<a href="${esc(href)}" style="display:inline-block;padding:16px 24px;font:800 14px/1 ${SANS};letter-spacing:.06em;text-transform:uppercase;color:${C.ink};text-decoration:none;border-radius:0">${esc(text)} &rarr;</a>
</td></tr></table>`
}
const rule = `<hr style="border:0;border-top:2px solid ${C.ink};margin:8px 0 24px">`

/** The page shell: a 560px paper column with a mono masthead. */
function shell(body: string, { preview, footer }: { preview?: string; footer?: string }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"><title>${esc(newsletter.name)}</title></head>
<body style="margin:0;padding:0;background:${C.paper};color:${C.ink}">
${preview ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preview)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.paper}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
<tr><td style="padding:0 0 24px;border-bottom:1px solid ${C.line}">
<p style="margin:0;font:500 11px/1.2 ${MONO};letter-spacing:.14em;text-transform:uppercase;color:${C.ink}"><span style="display:inline-block;width:6px;height:14px;background:${C.ink};vertical-align:-2px;margin-right:10px"></span>${esc(person.name)} &middot; ${esc(newsletter.name)}</p>
</td></tr>
<tr><td style="padding:32px 0 8px">
${body}
</td></tr>
${footer ? `<tr><td style="padding:24px 0 0;border-top:1px solid ${C.line};font:400 13px/1.5 ${SANS};color:${C.muted}">${footer}</td></tr>` : ''}
</table>
</td></tr></table>
</body></html>`
}

// ---------------------------------------------------------------------------

/** Step 3 of the flow: one button that opens /subscribe/confirm (which itself confirms only on POST). */
export function confirmEmail({ url, intent }: { url: string; intent: SubscribeIntent }): Email {
  const c = newsletter.confirm
  const intentLine = LINES.intentLine[intent]
  const body = [
    label(newsletter.variants.row.label),
    h1(c.title),
    intentLine ? p(intentLine) : '',
    p(c.line),
    button(url, c.cta),
    p(LINES.confirmExpiry, { muted: true, size: 14 }),
  ].join('\n')
  const text = [c.title, '', intentLine, c.line, '', `${c.cta}: ${url}`, '', LINES.confirmExpiry]
    .filter((l, i, a) => l !== '' || a[i - 1] !== '')
    .join('\n')
  return { subject: newsletter.email.confirmSubject, html: shell(body, { preview: c.line }), text }
}

/** Sent instead of a confirm link when the address is already an active subscriber. */
export function alreadyEmail({ base = SITE_URL }: { base?: string } = {}): Email {
  const e = newsletter.email
  const url = abs('/writing', base)
  const body = [label(newsletter.variants.row.label), h1(e.alreadySubject), p(e.alreadyLine), button(url, LINES.latest)].join('\n')
  const text = [e.alreadySubject, '', e.alreadyLine, '', `${LINES.latest}: ${url}`].join('\n')
  return { subject: e.alreadySubject, html: shell(body, { preview: e.alreadyLine }), text }
}

/** After confirming: the best notes, the Scorecard, and the one question. */
export function welcomeEmail({
  notes,
  base = SITE_URL,
  postal,
}: {
  notes: { title: string; description: string; path: string }[]
  base?: string
  postal?: string | null
}): Email {
  const c = newsletter.confirm
  const e = newsletter.email
  const scorecard = abs('/scorecard', base)
  const list = notes.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border-top:2px solid ${C.ink}">${notes
        .map(
          (n, i) => `<tr><td valign="top" style="width:40px;padding:16px 0;border-bottom:1px solid ${C.line};font:500 11px/1.6 ${MONO};color:${C.muted}">${String(i + 1).padStart(2, '0')}</td>
<td style="padding:16px 0;border-bottom:1px solid ${C.line}"><a href="${esc(abs(n.path, base))}" style="font:700 18px/1.3 ${SANS};color:${C.ink};text-decoration:underline;text-decoration-color:${C.sunrise};text-underline-offset:3px">${esc(n.title)}</a>
<p style="margin:6px 0 0;font:400 15px/1.5 ${SANS};color:${C.muted}">${esc(n.description)}</p></td></tr>`,
        )
        .join('')}</table>`
    : ''
  const body = [
    label(newsletter.variants.row.label),
    h1(c.done),
    notes.length ? p(c.doneLine) : '',
    list,
    button(scorecard, e.scorecardCta),
    rule,
    p(e.welcomeAsk),
    p(`– ${LINES.signoff}`),
  ].join('\n')
  const text = [
    c.done,
    '',
    ...(notes.length ? [c.doneLine, '', ...notes.map((n, i) => `${i + 1}. ${n.title}\n   ${abs(n.path, base)}`), ''] : []),
    `${e.scorecardCta}: ${scorecard}`,
    '',
    e.welcomeAsk,
    '',
    `– ${LINES.signoff}`,
    ...(postal ? ['', '--', postal] : []),
  ].join('\n')
  const footer = [esc(LINES.why), postal ? esc(postal) : ''].filter(Boolean).join('<br>')
  return { subject: e.welcomeSubject, html: shell(body, { preview: e.welcomeAsk, footer }), text }
}

/**
 * The broadcast for a new note (sent by /api/cron/field-notes). `{{{RESEND_UNSUBSCRIBE_URL}}}` is
 * filled in by Resend per recipient; Broadcasts also add the List-Unsubscribe one-click headers.
 */
export function fieldNoteEmail({
  title,
  description,
  takeaways,
  path,
  postal,
  base = SITE_URL,
}: {
  title: string
  description: string
  takeaways: string[]
  path: string
  postal: string
  base?: string
}): Email {
  const e = newsletter.email
  const url = abs(path, base)
  const items = takeaways.slice(0, 5)
  const list = items.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;border-top:2px solid ${C.ink}">${items
        .map(
          (t, i) => `<tr><td valign="top" style="width:40px;padding:14px 0;border-bottom:1px solid ${C.line};font:500 11px/1.9 ${MONO};color:${C.muted}">${String(i + 1).padStart(2, '0')}</td>
<td style="padding:14px 0;border-bottom:1px solid ${C.line};font:400 16px/1.55 ${SANS};color:${C.ink}">${esc(t)}</td></tr>`,
        )
        .join('')}</table>`
    : ''
  const body = [label(newsletter.name), h1(title), p(description, { muted: true }), list, button(url, e.readCta), p(`– ${LINES.signoff}`)].join('\n')
  const footer = [
    esc(LINES.why),
    esc(postal),
    `<a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:${C.muted};text-decoration:underline">${esc(e.unsubscribe)}</a>`,
  ].join('<br>')
  const text = [
    title,
    '',
    description,
    '',
    ...items.map((t, i) => `${i + 1}. ${t}`),
    '',
    `${e.readCta}: ${url}`,
    '',
    `– ${LINES.signoff}`,
    '',
    '--',
    LINES.why,
    postal,
    `${e.unsubscribe}: {{{RESEND_UNSUBSCRIBE_URL}}}`,
  ].join('\n')
  return { subject: title, previewText: description, html: shell(body, { preview: description, footer }), text }
}
