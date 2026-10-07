import data from './tools.data.json'
import type { CampId } from './site'

/**
 * The GTM stack shown on the site: official brand marks in /public/logos, unmodified
 * (colour versions; most brands forbid recolouring). Referential only: "the stack I build
 * with", never a partnership claim. HubSpot is deliberately absent: its trademark policy
 * needs written permission or partner status for logo use on a website.
 */
export type Tool = { slug: string; name: string; camp: CampId; role: string; src: string; ratio: number }

export const tools = data as Tool[]

export const toolsFor = (camp: CampId) => tools.filter((t) => t.camp === camp)

/** Brand-specific minimum rendered widths (n8n's guidelines: at least 100px). */
const MIN_W: Record<string, number> = { n8n: 100 }

/**
 * Optical sizing: equal visual area, not equal height, so a wide wordmark and a compact
 * mark read with the same weight. `base` is the height of a 3.6:1 lockup.
 */
export function logoSize(t: Tool, base: number) {
  const h = Math.round(base * Math.sqrt(3.6 / t.ratio))
  let w = Math.round(h * t.ratio)
  const min = MIN_W[t.slug]
  if (min && w < min) w = min
  return { w, h: Math.round(w / t.ratio) }
}
