import clsx from 'clsx'
import type { JSX } from 'react'
import { directLine, newsletter, type SubscribeIntent, type SubscribeSource, type SubscribeVariant } from '@/lib/site'
import { newsletterReady } from '@/lib/newsletter'
import { Icon } from '@/components/ui/Icon'
import { SubscribeForm, type SubscribeFormCopy } from './SubscribeForm'
import './subscribe.css'

/** Server render time for the form's min-fill floor (the visitor's clock replaces it once JS runs). */
const renderedAt = () => Date.now()

/**
 * Which button a placement gets (PLAN_V3 §4): primary only where subscribing is the page's lead
 * action; secondary wherever a Summit, ContextCta or Recon leads; ice outline in the footer.
 */
function isPrimary(variant: SubscribeVariant, source: SubscribeSource, intent: SubscribeIntent) {
  return variant === 'page'
    ? source === 'subscribe' || intent === 'community'
    : variant === 'row'
      ? source === 'start'
      : variant === 'card'
        ? source === 'writing'
        : false
}
function buttonFor(variant: SubscribeVariant, source: SubscribeSource, intent: SubscribeIntent) {
  if (variant === 'night') return 'btn sb-btn-ice'
  return clsx('btn', !isPrimary(variant, source, intent) && 'btn-secondary', variant === 'page' && 'btn-lg')
}

/**
 * Field Notes sign-up: the one component every placement uses (PLAN_V3 §4).
 *
 * - `row`: a mono caption, one line and the form in a band (home, /start).
 * - `card`: a sand panel with a heading, for the end of articles, /writing and /watch.
 * - `night`: ice on night with an ember dot, for the footer.
 * - `page`: the big instrument for /subscribe and the /community waitlists (`intent`).
 *
 * While email isn't configured it renders an honest closed state in the same footprint: no input,
 * "Email sign-up opens soon. Follow by RSS meanwhile." and the RSS feed (for a waitlist intent,
 * "The list opens soon…" and a plain mailto instead). Never a fake success.
 */
export function Subscribe({
  source,
  variant,
  intent = 'notes',
  eventsOptIn,
  headingLevel = 'h2',
  id,
  className,
}: {
  source: SubscribeSource
  variant: SubscribeVariant
  intent?: SubscribeIntent
  eventsOptIn?: boolean
  headingLevel?: 'h2' | 'h3'
  id?: string
  className?: string
}): JSX.Element {
  const n = newsletter
  const ready = newsletterReady()
  const ic = intent === 'notes' ? null : n.intents[intent]
  const Heading = headingLevel

  const caption = ic ? null : n.variants.row.label
  const heading = ic ? ic.h : variant === 'card' ? n.variants.card.h : variant === 'night' ? n.variants.night.h : null
  const line = ic
    ? null
    : variant === 'row'
      ? n.variants.row.line
      : variant === 'card'
        ? n.variants.card.line
        : variant === 'night'
          ? n.variants.night.line
          : null
  const cta = ic ? ic.cta : n.variants[variant].cta
  const btn = buttonFor(variant, source, intent)
  const headId = id ? `${id}-title` : undefined

  const copy: SubscribeFormCopy = {
    label: heading ?? caption ?? n.name,
    cta,
    sending: n.states.sending,
    sent: n.states.sent,
    emailLabel: n.emailLabel,
    placeholder: n.placeholder,
    buildingMax: n.buildingMax,
    ...(intent === 'community'
      ? { roleLabel: n.intents.community.role, roles: n.intents.community.roles, buildingLabel: n.intents.community.building }
      : intent === 'cohort'
        ? { buildingLabel: n.intents.cohort.building }
        : {}),
    ...(eventsOptIn && intent !== 'events' ? { eventsLabel: n.intents.events.checkbox } : {}),
  }

  return (
    <div
      id={id}
      className={clsx('sb', variant === 'card' && 'topo', className)}
      data-v={variant}
      data-tone={variant === 'card' ? 'sand' : undefined}
      data-ready={ready || undefined}
      // A live primary form owns the orange while it's on screen: the header CTA steps back (HeaderState).
      data-cta-owner={ready && variant !== 'night' && isPrimary(variant, source, intent) ? '' : undefined}
    >
      {/* .sb is the size container; .sb-in is what the container queries lay out. */}
      <div className="sb-in">
        {caption || heading || line ? (
          <div className="sb-head">
            {caption ? <p className="t-label sb-cap">{caption}</p> : null}
            {heading ? (
              <Heading id={headId} className="sb-h">
                {heading}
              </Heading>
            ) : null}
            {line ? <p className="sb-line">{line}</p> : null}
          </div>
        ) : null}

        <div className="sb-body">
          {ready ? (
            <>
              <SubscribeForm copy={copy} intent={intent} source={source} t0={renderedAt()} btn={btn} />
              {/* Consent fine print, like an input label: outside the visible-word budgets (SPEC_V2 §1). */}
              <p className="t-small sb-micro" data-wb-exclude="">
                {n.micro}{' '}
                <a href={n.privacyHref} className="link">
                  {n.privacy}
                </a>
                {variant === 'card' || (variant === 'page' && !ic) ? (
                  <>
                    <span aria-hidden="true"> · </span>
                    {/* A feed, not a page: plain anchor, no prefetch. */}
                    <a href="/rss.xml" className="link">
                      {n.states.rss}
                    </a>
                  </>
                ) : null}
              </p>
            </>
          ) : (
            <div className="sb-closed">
              <div className="sb-grid">
                <p className="sb-closed-line">
                  <span className="sb-closed-dot" aria-hidden="true" />
                  {ic ? n.states.unconfiguredList : n.states.unconfigured}
                </p>
                {ic ? (
                  // A waitlist can't live in a feed: until sign-up opens, a plain email holds the place.
                  <a
                    href={directLine.url}
                    className={clsx('btn', 'btn-secondary', 'sb-rss')}
                  >
                    <Icon name="mail" size={16} />
                    <span>{n.states.mail}</span>
                  </a>
                ) : (
                  /* A feed, not a page: plain anchor, no prefetch. */
                  <a href="/rss.xml" className={clsx('btn', variant === 'night' ? 'sb-btn-ice' : 'btn-secondary', 'sb-rss')}>
                    <Icon name="rss" size={16} />
                    <span>{n.states.rss}</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
