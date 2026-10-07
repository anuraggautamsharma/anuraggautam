// Summit Route Scorecard maths (PLAN_V3 §6). Pure and dependency-free, so the client island
// stays small: it never imports lib/site (copy arrives as props from the server page).
// Ten statements, two per camp in camp order, each answered 0 / 1 / 2.

import type { CampId } from './site'

export type Answer = 0 | 1 | 2
export type CampState = 'stalled' | 'climbing' | 'clear'

/** Camp order on the route. Statement i belongs to CAMP_ORDER[i >> 1]. */
export const CAMP_ORDER: readonly CampId[] = ['position', 'price', 'market', 'systems', 'team']
export const QUESTION_COUNT = CAMP_ORDER.length * 2

/** The site's own altitude scale: basecamp to summit. */
export const ALT_MIN = 1250
export const ALT_MAX = 5600

/** Camp ids map to the work order's "where is it stuck?" values (components/contact/options.ts). */
export const STALL_TO_STUCK: Record<CampId, 'positioning' | 'pricing' | 'pipeline' | 'pilots' | 'team'> = {
  position: 'positioning',
  price: 'pricing',
  market: 'pipeline',
  systems: 'pilots',
  team: 'team',
}

/** 0–20 points → 1,250–5,600 M, linear, rounded to 10 M like an altimeter reads. */
export function altitudeFor(total: number): number {
  const t = Math.max(0, Math.min(QUESTION_COUNT * 2, total))
  return Math.round((ALT_MIN + ((ALT_MAX - ALT_MIN) * t) / (QUESTION_COUNT * 2)) / 10) * 10
}

/** Per-camp state from its 0–4 score: Stalled (0–1), Climbing (2–3), Clear (4). */
export function campState(score: number): CampState {
  return score >= 4 ? 'clear' : score >= 2 ? 'climbing' : 'stalled'
}

export function scoreAnswers(a: Answer[]): {
  total: number
  altitude: number
  camps: { id: CampId; score: number; state: CampState }[]
  /** The weakest camp; ties go to the earlier camp. */
  stall: CampId
  /** True when every camp is clear: there is no real stall to name. */
  summit: boolean
} {
  const camps = CAMP_ORDER.map((id, c) => {
    const score = (a[c * 2] ?? 0) + (a[c * 2 + 1] ?? 0)
    return { id, score, state: campState(score) }
  })
  const total = camps.reduce((s, c) => s + c.score, 0)
  // Strictly lower wins, so the earliest of equal scores is kept.
  const stall = camps.reduce((lo, c) => (c.score < lo.score ? c : lo), camps[0]).id
  return { total, altitude: altitudeFor(total), camps, stall, summit: camps.every((c) => c.state === 'clear') }
}

/** [2,1,0,2,…] → "2102…": one digit per statement, safe in a URL hash. */
export function encodeAnswers(a: Answer[]): string {
  return a.join('')
}

/** Only a complete, well-formed result decodes; anything else is null. */
export function decodeAnswers(s: string): Answer[] | null {
  const m = /^[012]{10}$/.exec(s.trim())
  return m ? (m[0].split('').map(Number) as Answer[]) : null
}
