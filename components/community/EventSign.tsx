import Link from 'next/link'
import clsx from 'clsx'
import type { SiteEvent } from '@/lib/site'
import { EVENT_KIND_LABEL, eventDate, eventPlace } from '@/lib/events'
import './event-sign.css'

/**
 * The next event as a trail sign: a date block, the event's name, and where and when.
 * Server-rendered, zero JS. It links to /community#campfires, where the full card and the
 * registration button live. Render it only from `nextEvent()`: it never shows a made-up date.
 * `paper` is a sand sign on light beats; `night` is a paper sign lit up against the footer.
 */
export function EventSign({ event, tone = 'paper' }: { event: SiteEvent; tone?: 'paper' | 'night' }) {
  const d = eventDate(event.start)
  if (!d) return <></>
  const when = [d.weekday, d.time && d.zone ? `${d.time} ${d.zone}` : d.time].filter(Boolean).join(' · ')
  return (
    <Link href="/community#campfires" className={clsx('ev-sign', tone === 'night' && 'ev-sign-night')}>
      <time dateTime={event.start} className="ev-sign-date">
        <span className="ev-sign-day tnum">{d.day}</span>
        <span className="ev-sign-mon">{d.month}</span>
      </time>
      <span className="ev-sign-body">
        <span className="ev-sign-kind">
          <span className="ev-sign-dot" aria-hidden="true" />
          Next {EVENT_KIND_LABEL[event.kind]} · {eventPlace(event)}
        </span>
        <span className="ev-sign-title">{event.title}</span>
        {when ? <span className="ev-sign-when tnum">{when}</span> : null}
      </span>
    </Link>
  )
}
