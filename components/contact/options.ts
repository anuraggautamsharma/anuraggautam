// Shared between the work-order form (client) and its Server Action.
import { pages } from '@/lib/site'

/** "What's this about?" (PLAN_V3 §6). Only `engagement` runs the fit/maybe/not-fit routing. */
export const TYPE_VALUES = ['engagement', 'workshop', 'speaking', 'other'] as const
export type WorkType = (typeof TYPE_VALUES)[number]
export const TYPE_LABELS: Record<WorkType, string> = {
  engagement: pages.contact.types.engagement,
  workshop: pages.contact.types.workshop,
  speaking: pages.contact.types.speaking,
  other: pages.contact.types.other,
}
export const isWorkType = (v: unknown): v is WorkType => typeof v === 'string' && (TYPE_VALUES as readonly string[]).includes(v)

/** `?source=` is a flat attribution slug (e.g. "community"); anything else is dropped. */
export const cleanSource = (v: unknown): string | null =>
  typeof v === 'string' && /^[a-z0-9][a-z0-9-]{0,31}$/.test(v) ? v : null

export const STUCK_VALUES = ['positioning', 'pricing', 'pipeline', 'pilots', 'workflows', 'team'] as const
export const STAGE_VALUES = ['pre-product', 'seed', 'series-a', 'series-b', 'bootstrapped'] as const
export const TIMELINE_VALUES = ['now', 'quarter', 'exploring'] as const

export type Stuck = (typeof STUCK_VALUES)[number]
export type Stage = (typeof STAGE_VALUES)[number]
export type Timeline = (typeof TIMELINE_VALUES)[number]

export const STUCK_LABELS: Record<Stuck, string> = {
  positioning: 'Positioning',
  pricing: 'Pricing',
  pipeline: 'Pipeline',
  pilots: 'Pilots won’t convert',
  workflows: 'Systems',
  team: 'Team',
}

export const STAGE_LABELS: Record<Stage, string> = {
  'pre-product': 'Pre-product',
  seed: 'Pre-seed/Seed',
  'series-a': 'Series A',
  'series-b': 'Series B+',
  bootstrapped: 'Bootstrapped, $1M+ revenue',
}

export const TIMELINE_LABELS: Record<Timeline, string> = {
  now: 'Now',
  quarter: 'This quarter',
  exploring: 'Just exploring',
}

export type Field = 'name' | 'email' | 'company_url' | 'sell' | 'stuck' | 'stage' | 'timeline'

/** Order used to move focus to the first invalid field. */
export const FIELD_ORDER: Field[] = ['name', 'email', 'company_url', 'sell', 'stuck', 'stage', 'timeline']

export type Route = 'fit' | 'maybe' | 'not-fit'

export type WorkOrderValues = {
  type?: string
  also_notes?: boolean
  name?: string
  email?: string
  company_url?: string
  sell?: string
  stage?: string
  timeline?: string
  stuck?: string[]
}

export type WorkOrderState =
  | { status: 'idle' }
  | { status: 'invalid'; errors: Partial<Record<Field, string>>; values: WorkOrderValues }
  /** Honeypot filled or submitted faster than a human can type. Nothing was sent. */
  | { status: 'blocked'; values: WorkOrderValues }
  /** Email delivery is not configured. Nothing was sent; `summary` is the text they can paste. */
  | { status: 'unsent'; route: Route; type: WorkType; summary: string }
  /** Delivery was attempted and failed. Nothing was sent. */
  | { status: 'failed'; values: WorkOrderValues }
  /** `route` is only meaningful for `engagement`; other types always read as received. */
  | { status: 'sent'; route: Route; type: WorkType }

export const isStuck = (v: unknown): v is Stuck => typeof v === 'string' && (STUCK_VALUES as readonly string[]).includes(v)

/** What the page reads from `?type`, `?stuck` and `?source` (validated; unknown values are dropped). */
export type Prefill = { type: WorkType; stuck: Stuck[]; source: string | null }
