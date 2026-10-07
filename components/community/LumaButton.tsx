'use client'

import { track } from '@vercel/analytics'
import type { SiteEvent } from '@/lib/site'
import { eventHref } from '@/lib/events'
import { buttonClass, type ButtonVariant } from '@/components/ui/ButtonLink'
import { Icon } from '@/components/ui/Icon'

const SCRIPT_ID = 'luma-checkout'
const SCRIPT_SRC = 'https://embed.lu.ma/checkout-button.js'

/** Luma's checkout script, fetched once, only after a visitor shows intent (pointer or focus). */
function loadLuma() {
  if (typeof document === 'undefined' || document.getElementById(SCRIPT_ID)) return
  const s = document.createElement('script')
  s.id = SCRIPT_ID
  s.src = SCRIPT_SRC
  s.async = true
  document.body.appendChild(s)
}

/**
 * A plain link to the event's luma.com page, so it works with no JS and before the script
 * arrives. With a Luma event id, hovering or focusing it loads Luma's checkout script, which
 * then opens the checkout over the page on click. Zero third-party bytes at load.
 */
export function LumaButton({
  event,
  label,
  utmSource,
  variant = 'secondary',
}: {
  event: SiteEvent
  label: string
  utmSource: string
  variant?: ButtonVariant
}) {
  const luma = event.lumaEventId
  return (
    <a
      href={eventHref(event, utmSource)}
      className={buttonClass(variant, 'md')}
      data-luma-action={luma ? 'checkout' : undefined}
      data-luma-event-id={luma ?? undefined}
      onPointerEnter={luma ? loadLuma : undefined}
      onFocus={luma ? loadLuma : undefined}
      onTouchStart={luma ? loadLuma : undefined}
      onClick={() => track('event_register_click', { source: utmSource, event: event.id })}
      rel="noopener"
    >
      <span>{label}</span>
      <Icon name="arrow-up-right" size={16} />
    </a>
  )
}
