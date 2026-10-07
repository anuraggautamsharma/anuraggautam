// Date helpers for frontmatter dates ('YYYY-MM-DD').
// Everything here is pure string work on the given date, so output is identical on
// every machine and timezone, and nothing ever reads the current clock.

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

type Parts = { y: number; m: number; d: number }

function parts(iso: string): Parts {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!match) throw new Error(`Expected an ISO date (YYYY-MM-DD), got "${iso}"`)
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** '2026-10-06' → '2026-10-06' (normalised, for <time dateTime>). */
export function isoDate(iso: string) {
  const { y, m, d } = parts(iso)
  return `${y}-${pad(m)}-${pad(d)}`
}

/** '2026-10-06' → '2026.10.06' (spec-sheet style). */
export function dotDate(iso: string) {
  const { y, m, d } = parts(iso)
  return `${y}.${pad(m)}.${pad(d)}`
}

/** '2026-10-06' → '6 October 2026'. */
export function longDate(iso: string) {
  const { y, m, d } = parts(iso)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

/** '2026-10-06' → '06 OCT' (register rows, where the year is the group heading). */
export function dayMonth(iso: string) {
  const { m, d } = parts(iso)
  return `${pad(d)} ${MONTHS[m - 1].slice(0, 3).toUpperCase()}`
}

/** '2026-10-06' → 2026. */
export function yearOf(iso: string) {
  return parts(iso).y
}

/** '2026-10-06' → 'October' (APA citations). */
export function monthName(iso: string) {
  return MONTHS[parts(iso).m - 1]
}

/** '2026-10-06' → 'oct' (BibTeX month macro). */
export function monthMacro(iso: string) {
  return MONTHS[parts(iso).m - 1].slice(0, 3).toLowerCase()
}

/** '2026-10-06' → '2026/10/06' (Highwire citation_publication_date). */
export function slashDate(iso: string) {
  const { y, m, d } = parts(iso)
  return `${y}/${pad(m)}/${pad(d)}`
}

/** '2026-10-06' → 'Tue, 06 Oct 2026 00:00:00 GMT' (RFC 822, for RSS). */
export function rfc822(iso: string) {
  const { y, m, d } = parts(iso)
  return new Date(Date.UTC(y, m - 1, d)).toUTCString()
}

/** Sort comparator: newest first. ISO strings sort lexically. */
export const newestFirst = (a: string, b: string) => (a < b ? 1 : a > b ? -1 : 0)
