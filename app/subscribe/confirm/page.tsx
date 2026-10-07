import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { chapters, newsletter } from '@/lib/site'
import { peekToken, welcomeNotes } from '@/lib/newsletter'
import { PageHero } from '@/components/ui/PageHero'
import { Section } from '@/components/ui/Section'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { Icon } from '@/components/ui/Icon'
import { NoteCard } from '@/components/writing/NoteCard'
import { publishedPosts } from '@/components/writing/posts'
import { Subscribe } from '@/components/subscribe/Subscribe'
import { confirmSubscription } from './actions'
import '../subscribe-page.css'

export const metadata: Metadata = {
  title: newsletter.confirm.title.replace(/\.$/, ''),
  robots: { index: false, follow: false },
  // The token stays out of any Referer header sent from this page.
  referrer: 'no-referrer',
}

type View = 'ready' | 'retry' | 'done' | 'expired' | 'paused'

/** "Sentence one. Sentence two." → title + line, so a long state reads as a headline and a lead. */
function split(s: string): [string, string | undefined] {
  const i = s.indexOf('. ')
  return i === -1 ? [s, undefined] : [s.slice(0, i + 1), s.slice(i + 2)]
}

/**
 * /subscribe/confirm (noindex, no referrer). GET never confirms: Outlook Safe Links and Defender
 * pre-fetch links, so the page only shows a button, and the button POSTs (works without JS).
 */
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''
  const t = one(sp.t)
  const s = one(sp.s)
  const c = newsletter.confirm

  let view: View
  if (s === 'done') view = 'done'
  else if (s === 'paused') view = 'paused'
  else if (s === 'expired' || !t) view = 'expired'
  else {
    const peek = peekToken(t)
    view = peek === 'unconfigured' ? 'paused' : peek === 'valid' ? (s === 'error' ? 'retry' : 'ready') : 'expired'
  }

  const kicker = newsletter.variants.row.label
  const alt = chapters.notes.alt

  if (view === 'ready' || view === 'retry') {
    return (
      <PageHero
        photo="notes-forest-path"
        kicker={kicker}
        title={c.title}
        line={view === 'retry' ? newsletter.states.error : c.line}
        height="tall"
        align="bottom-left"
        alt={alt}
      >
        <form action={confirmSubscription} className="cf-form">
          <input type="hidden" name="t" value={t} />
          <button type="submit" className="btn btn-lg" data-magnetic="">
            <span>{c.cta}</span>
            <Icon name="arrow-right" size={16} />
          </button>
        </form>
      </PageHero>
    )
  }

  if (view === 'done') {
    const notes = welcomeNotes()
    const fallback = notes.length ? notes : publishedPosts().slice(0, 1)
    return (
      <>
        <PageHero photo="notes-forest-path" kicker={kicker} title={c.done} line={c.doneLine} height="tall" align="bottom-left" alt={alt}>
          <ButtonLink href="/writing" variant="photo" size="lg">
            {newsletter.email.notesCta}
          </ButtonLink>
        </PageHero>
        {fallback.length ? (
          <Section tone="paper" alt={alt} className="sp-latest" aria-label={c.doneLine}>
            <div className="wrap">
              <div className="sp-notes" data-count={fallback.length}>
                {fallback.map((post, i) => (
                  <div key={post.slug} className="reveal" style={{ '--i': i } as CSSProperties}>
                    <NoteCard post={post} size={fallback.length === 1 ? 'lg' : 'md'} headingLevel="h3" />
                  </div>
                ))}
              </div>
            </div>
          </Section>
        ) : null}
      </>
    )
  }

  // Expired / invalid, or confirmations paused (email not configured).
  const [title, line] = split(view === 'paused' ? c.paused : c.expired)
  return (
    <>
      <PageHero photo="notes-forest-path" kicker={kicker} title={title} line={line} height="mid" align="bottom-left" alt={alt} />
      {view === 'expired' ? (
        <Section tone="paper" topo alt={alt} className="sp-main" aria-label={newsletter.variants.row.label}>
          <div className="wrap">
            <Subscribe variant="row" source="subscribe" />
          </div>
        </Section>
      ) : null}
    </>
  )
}
