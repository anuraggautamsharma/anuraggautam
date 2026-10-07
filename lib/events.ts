// Events (PLAN_V3 §6). `events` in lib/site.ts is the only source: every events module renders
// from these helpers and nothing else, so an empty array means no event UI anywhere.
// Pages that show events export `revalidate = 3600`, so a past event drops off without a deploy.
import { events, type SiteEvent } from './site'

const t = (iso: string) => Date.parse(iso)

/** An event counts as upcoming until it ends. Unparseable dates are skipped, never guessed. */
export function upcomingEvents(now: number = Date.now()): SiteEvent[] {
  return events
    .filter((e) => Number.isFinite(t(e.start)) && Number.isFinite(t(e.end)) && t(e.end) > now)
    .sort((a, b) => t(a.start) - t(b.start))
}

/** Finished events, newest first. */
export function pastEvents(now: number = Date.now()): SiteEvent[] {
  return events
    .filter((e) => Number.isFinite(t(e.end)) && t(e.end) <= now)
    .sort((a, b) => t(b.start) - t(a.start))
}

export function nextEvent(now: number = Date.now()): SiteEvent | null {
  return upcomingEvents(now)[0] ?? null
}

// ── Display helpers ─────────────────────────────────────────────────────────────
// Dates are read straight from the ISO string, in the event's own offset (the time the
// host announced), so the server's timezone can never shift a day or an hour.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const ISO = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?/

/** Named zones for the offsets an event is likely to use; anything else prints as UTC±hh:mm. */
const ZONES: Record<string, string> = { '+05:30': 'IST', Z: 'UTC', '+00:00': 'UTC' }

export type EventDate = {
  /** '20' */
  day: string
  /** 'Nov' */
  month: string
  year: string
  /** 'Thu' */
  weekday: string
  /** '19:00' or null for a date-only string */
  time: string | null
  /** 'IST', 'UTC+01:00' or null */
  zone: string | null
}

export function eventDate(iso: string): EventDate | null {
  const m = ISO.exec(iso)
  if (!m) return null
  const [, y, mo, d, hh, mm, off] = m
  const weekday = DAYS[new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d))).getUTCDay()]
  const norm = off ? (off === 'Z' ? 'Z' : off.length === 5 ? `${off.slice(0, 3)}:${off.slice(3)}` : off) : null
  return {
    day: String(Number(d)),
    month: MONTHS[Number(mo) - 1] ?? '',
    year: y,
    weekday,
    time: hh && mm ? `${hh}:${mm}` : null,
    zone: norm ? (ZONES[norm] ?? `UTC${norm}`) : null,
  }
}

/** 'Online' or 'Bengaluru' (venue stays on the card, not in the short form). */
export function eventPlace(e: SiteEvent): string {
  return e.place.online ? 'Online' : e.place.city
}

/** The registration link with a flat utm_source, so Luma reports where the seat came from. */
export function eventHref(e: SiteEvent, utmSource: string): string {
  try {
    const u = new URL(e.url)
    if (!u.searchParams.has('utm_source')) u.searchParams.set('utm_source', utmSource)
    return u.href
  } catch {
    return e.url
  }
}

/** Human labels for the event kinds (the sign's mono line). */
export const EVENT_KIND_LABEL: Record<SiteEvent['kind'], string> = {
  campfire: 'Campfire',
  'summit-session': 'Summit Session',
  workshop: 'Workshop',
}
