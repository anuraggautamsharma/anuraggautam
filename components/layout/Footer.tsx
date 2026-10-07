import Link from 'next/link'
import type { CSSProperties } from 'react'
import { camps, chrome, footer, person, profiles, site } from '@/lib/site'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { RIDGE } from '@/components/ui/Ridge'
import { LocalTime } from '@/components/contact/LocalTime'
import { Subscribe } from '@/components/subscribe/Subscribe'
import { EventSign } from '@/components/community/EventSign'
import { nextEvent } from '@/lib/events'
import { hasVideos } from '@/lib/videos'
import { MotionToggle } from './MotionToggle'
import './chrome.css'

type FootLink = { label: string; href: string; page?: boolean; me?: boolean }

/** A profile link only when that profile really exists (lib/site `profiles` holds real ones only). */
const profileLink = (re: RegExp, label: string): FootLink[] => {
  const p = profiles.find((x) => re.test(x.url))
  return p ? [{ label, href: p.url, me: true }] : []
}

/**
 * Campfire (§3.3, PLAN_V3 §2): the only dark surface on the site, rising out of the page as a
 * ridge. Sign-off, then the campfire row (Field Notes by email; the next Campfire only when a
 * real one is scheduled), then the link columns. Watch, YouTube and Instagram appear only once
 * they exist. Machine-facing links (llms.txt) stay out of human view.
 */
export async function Footer() {
  const year = site.updated.slice(0, 4)
  const watch = await hasVideos()
  const event = nextEvent()
  const columns: { key: string; title: string; links: FootLink[] }[] = [
    {
      key: 'route',
      title: footer.cols.route,
      links: [
        { label: footer.links.summitRoute, href: '/method', page: true },
        ...camps.map((c) => ({ label: c.name, href: `/method#${c.id}`, page: true })),
        { label: footer.links.scorecard, href: footer.hrefs.scorecard, page: true },
        { label: footer.links.workshop, href: footer.hrefs.workshop, page: true },
      ],
    },
    {
      key: 'notes',
      title: footer.cols.notes,
      links: [
        { label: footer.links.allNotes, href: '/writing', page: true },
        ...(watch ? [{ label: footer.links.watch, href: footer.hrefs.watch, page: true }] : []),
        { label: footer.links.subscribe, href: footer.hrefs.subscribe, page: true },
        { label: footer.links.rss, href: '/rss.xml' },
      ],
    },
    {
      key: 'community',
      title: footer.cols.community,
      links: [
        { label: footer.links.community, href: footer.hrefs.community, page: true },
        { label: footer.links.campfires, href: footer.hrefs.campfires, page: true },
        { label: footer.links.fieldSchool, href: footer.hrefs.fieldSchool, page: true },
        { label: footer.links.start, href: footer.hrefs.start, page: true },
      ],
    },
    {
      key: 'about',
      title: footer.cols.about,
      links: [
        { label: footer.links.about, href: '/about', page: true },
        ...profileLink(/linkedin\.com/i, footer.links.linkedin),
        ...profileLink(/youtube\.com/i, footer.links.youtube),
        ...profileLink(/instagram\.com/i, footer.links.instagram),
        { label: footer.links.privacy, href: footer.hrefs.privacy, page: true },
      ],
    },
  ]

  return (
    <footer className="site-footer" data-tone="night" data-nav="deep">
      <svg className="ft-ridge" viewBox="0 0 1440 110" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d={RIDGE} fill="currentColor" />
      </svg>
      <div className="ft-body topo">
        <div className="wrap">
          {/* Hidden on pages that already end on a call to action (the Summit, the contact form). */}
          <div className="ft-signoff">
            <p className="t-h2" data-wb-exclude="">
              {footer.signoff}
            </p>
            <ButtonLink href="/contact" variant="primary" magnetic>
              {chrome.cta}
            </ButtonLink>
          </div>

          <div className="ft-camp" data-event={event ? '' : undefined}>
            <Subscribe variant="night" source="footer" headingLevel="h2" className="ft-sub" />
            {event ? (
              <div className="ft-event">
                <EventSign event={event} tone="night" />
              </div>
            ) : null}
          </div>

          <div className="ft-grid">
            <div className="ft-contact">
              <p className="t-label ft-col-title">{footer.contactLabel}</p>
              <a href={`mailto:${site.email}`} className="t-h4 ft-email">
                {site.email}
              </a>
              <p className="t-small ft-entity">{person.oneLiner}</p>
            </div>

            <nav className="ft-cols" aria-label="Footer">
              {columns.map((col) => (
                <div key={col.key} className={`ft-col ft-col-${col.key}`}>
                  <h2 className="t-label ft-col-title">{col.title}</h2>
                  <ul>
                    {col.links.map((l) =>
                      l.page ? (
                        <li key={l.href}>
                          <Link href={l.href} className="ft-link">
                            {l.label}
                          </Link>
                        </li>
                      ) : (
                        <li key={l.href}>
                          <a href={l.href} rel={l.me ? 'me' : undefined} className="ft-link">
                            {l.label}
                          </a>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </div>

        <div className="wrap fit ft-mega-wrap" aria-hidden="true">
          <p className="t-mega ft-mega" style={{ '--chars': 13, '--mega-adv': 0.897 } as CSSProperties}>
            {person.name}
          </p>
        </div>

        <div className="wrap">
          <div className="ft-base t-label">
            <p>
              © {year} {person.name}
            </p>
            <Link href="/credits" className="ft-link">
              {chrome.photoCredits}
            </Link>
            {site.timezone ? (
              <p>
                <LocalTime timeZone={site.timezone} />
              </p>
            ) : null}
            <MotionToggle />
          </div>
        </div>
      </div>
    </footer>
  )
}
