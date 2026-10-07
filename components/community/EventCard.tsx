import type { CSSProperties } from 'react'
import type { SiteEvent } from '@/lib/site'
import { pages } from '@/lib/site'
import { EVENT_KIND_LABEL, eventDate, eventPlace } from '@/lib/events'
import { Plate } from '@/components/ui/Plate'
import { LumaButton } from './LumaButton'

const copy = pages.community

/**
 * An upcoming event: a large date block, the format and place, a one-line hook and the
 * Luma registration link (the script loads on intent only). Phones stack the date above
 * the title. Rendered only from real entries in `events`.
 */
export function EventCard({ event, i = 0 }: { event: SiteEvent; i?: number }) {
  const d = eventDate(event.start)
  const end = eventDate(event.end)
  const place = event.place.online ? eventPlace(event) : [event.place.venue, event.place.city].filter(Boolean).join(', ')
  const time = d?.time ? `${d.time}${end?.time ? `–${end.time}` : ''}${d.zone ? ` ${d.zone}` : ''}` : null
  return (
    <article className="cm-ev reveal" style={{ '--i': i } as CSSProperties} aria-labelledby={`ev-${event.id}`}>
      {d ? (
        <time dateTime={event.start} className="cm-ev-date">
          <span className="cm-ev-day tnum">{d.day}</span>
          <span className="cm-ev-mon">
            {d.month} {d.year}
          </span>
          <span className="cm-ev-wd">{d.weekday}</span>
        </time>
      ) : null}
      <div className="cm-ev-body">
        <p className="t-label cm-ev-kind">
          {EVENT_KIND_LABEL[event.kind]} · {place}
        </p>
        <h3 id={`ev-${event.id}`} className="t-h3 cm-ev-title">
          {event.title}
        </h3>
        <p className="cm-ev-line">{event.line}</p>
        {time ? <p className="t-label tnum cm-ev-time">{time}</p> : null}
        <div className="cm-ev-cta">
          <LumaButton event={event} label={copy.register} utmSource="community" variant="secondary" />
        </div>
      </div>
      {event.photo ? (
        <div className="cm-ev-photo">
          <Plate id={event.photo} aspect="3/2" sizes="(min-width: 64rem) 30vw, 100vw" />
        </div>
      ) : null}
    </article>
  )
}

/** A past event: its photo (when there is one), the date and a link to the recap. */
export function PastEvent({ event }: { event: SiteEvent }) {
  const d = eventDate(event.start)
  return (
    <li className="cm-past">
      {event.photo ? <Plate id={event.photo} aspect="3/2" sizes="(min-width: 64rem) 25vw, 50vw" /> : null}
      <p className="t-label tnum">{d ? `${d.day} ${d.month} ${d.year}` : null}</p>
      <p className="cm-past-title">{event.title}</p>
      {event.recap ? (
        <a href={event.recap} className="link-go">
          {copy.recap}
        </a>
      ) : null}
    </li>
  )
}
