import Image from 'next/image'
import Link from 'next/link'
import { SITE_URL, footer, pages, person, profiles, summitRoute } from '@/lib/site'
import { portrait } from '@/lib/photos'
import { Arrow } from '@/components/ui/Arrow'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { monthMacro, monthName, yearOf } from '@/lib/dates'
import { CiteBlock } from './CiteBlock'
import { TOPICS, noteMeta, postPath, topicAccent, topicCamp, type Post, type Topic } from './posts'

/* ───────────── FAQ (visible twin of the FAQPage JSON-LD) ───────────── */

export function ArticleFaq({ items }: { items: Post['faqs'] }) {
  if (!items.length) return null
  return (
    <section className="wr-end" aria-labelledby="faq">
      <h2 id="faq" className="wr-end-title">
        <span className="t-label wr-end-n" aria-hidden="true">
          FAQ
        </span>
        Questions from the trail
      </h2>
      <div className="wr-faq">
        {items.map((f, i) => (
          <details key={i} className="wr-faq-item">
            <summary>
              <span className="wr-faq-q">{f.q}</span>
              <span className="wr-faq-icon" aria-hidden="true" />
            </summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

/* ───────────── References ───────────── */

export function References({ sources }: { sources: Post['sources'] }) {
  if (!sources.length) return null
  return (
    <section className="wr-end" aria-labelledby="references">
      <h2 id="references" className="wr-end-title">
        <span className="t-label wr-end-n" aria-hidden="true">
          REF
        </span>
        References
      </h2>
      <ol className="wr-refs">
        {sources.map((s, i) => (
          <li key={s.url} id={`ref-${i + 1}`}>
            <span className="wr-refs-n" aria-hidden="true">
              [{String(i + 1).padStart(2, '0')}]
            </span>
            <a href={s.url} rel="noopener" className="link">
              {s.title}
            </a>
            <span className="wr-refs-host">{new URL(s.url).hostname.replace(/^www\./, '')}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/* ───────────── Cite this ───────────── */

const bibEscape = (s: string) => s.replace(/([{}%&$#_])/g, '\\$1')

export function citations(post: Post) {
  const url = `${SITE_URL}${postPath(post.slug)}`
  const [given, ...rest] = person.name.split(' ')
  const family = rest.join(' ')
  const d = post.date
  const apa = `${family}, ${given[0]}. (${yearOf(d)}, ${monthName(d)} ${Number(d.slice(8, 10))}). ${post.title}${post.kind === 'paper' ? ' [Paper]' : ''}. ${person.name}. ${url}`
  const key = `${family.toLowerCase()}${yearOf(d)}${post.slug.split('-')[0]}`
  const bib = [
    `@${post.kind === 'paper' ? 'techreport' : 'misc'}{${key},`,
    `  author       = {${family}, ${given}},`,
    `  title        = {${bibEscape(post.title)}},`,
    `  year         = {${yearOf(d)}},`,
    `  month        = ${monthMacro(d)},`,
    post.kind === 'paper' ? `  institution  = {${person.name}},` : `  howpublished = {\\url{${url}}},`,
    `  note         = {${post.docNo}},`,
    `  url          = {${url}}`,
    `}`,
  ].join('\n')
  return { url, apa, bib }
}

// The toast after "Copy link" is a small joke, tuned to the article's topic.
const LINK_TOAST: Partial<Record<Topic, string>> = {
  'physical-ai': 'Link copied. Send it to someone stuck in pilot purgatory.',
  pricing: 'Link copied. Send it to whoever owns the price sheet.',
  positioning: 'Link copied. Send it to whoever writes the homepage.',
}

export function CiteThis({ post }: { post: Post }) {
  const { url, apa, bib } = citations(post)
  return (
    <section className="wr-end" aria-labelledby="cite">
      <h2 id="cite" className="wr-end-title">
        <span className="t-label wr-end-n" aria-hidden="true">
          CITE
        </span>
        Cite this
      </h2>
      <CiteBlock
        url={url}
        linkToast={LINK_TOAST[post.topic] ?? 'Link copied. Send it to someone who needs it.'}
        formats={[
          { key: 'apa', label: 'APA', text: apa },
          { key: 'bibtex', label: 'BibTeX', text: bib },
        ]}
      />
    </section>
  )
}

/* ───────────── Author box ───────────── */

export function AuthorBox() {
  return (
    <section className="wr-author" aria-labelledby="author">
      <div className="wr-author-mark">
        <Image src={portrait.src} alt={portrait.alt} sizes="180px" quality={75} placeholder="blur" className="wr-author-img" />
      </div>
      <div className="wr-author-head">
        <p className="t-label">Written by</p>
        <h2 id="author" className="t-h4 wr-author-name">
          {person.name}
        </h2>
      </div>
      <p className="wr-author-bio">{person.authorBio}</p>
      <p className="wr-author-links">
        <Link href="/about" rel="author" className="link-go">
          {footer.links.about} <Arrow />
        </Link>
        {profiles.map((p) => (
          <a key={p.url} href={p.url} rel="me noopener" className="link-go">
            {p.label} <Arrow dir="up-right" />
          </a>
        ))}
      </p>
    </section>
  )
}

/* ───────────── Contextual CTA: topic → its camp on the Summit Route ───────────── */

/** "See Camp 03: Pipeline" → /method#market, or "See the Summit Route" for cross-camp topics. */
export function campLink(topic: Topic): { href: string; label: string } {
  const camp = topicCamp(topic)
  const { contextCta } = pages.writing
  return camp
    ? { href: `/method#${camp.id}`, label: `${contextCta.camp} ${String(camp.n).padStart(2, '0')}: ${camp.name}` }
    : { href: '/method', label: contextCta.route }
}

export function ContextCta({ topic }: { topic: Topic }) {
  const camp = topicCamp(topic)
  const link = campLink(topic)
  return (
    <aside
      className="wr-cta"
      data-tone="sand"
      aria-label="Work with Anurag"
      style={{ '--cta-hue': topicAccent(topic) } as React.CSSProperties}
    >
      <p className="t-label wr-cta-label">
        <span className="wr-cta-blaze" aria-hidden="true" />
        {camp ? `Camp ${String(camp.n).padStart(2, '0')} · ${camp.name}` : summitRoute.name}
      </p>
      <p className="t-h4 wr-cta-line">{camp ? camp.line : summitRoute.short}</p>
      <div className="wr-cta-actions">
        <ButtonLink href="/contact" variant="primary" magnetic>
          {pages.writing.contextCta.climb}
        </ButtonLink>
        <Link href={link.href} className="link-go">
          {link.label} <Arrow />
        </Link>
      </div>
    </aside>
  )
}

/* ───────────── Previous / next ───────────── */

export function PrevNext({ prev, next }: { prev?: Post; next?: Post }) {
  if (!prev && !next) return null
  const card = (p: Post, dir: 'prev' | 'next') => (
    <Link
      href={postPath(p.slug)}
      className={`wr-pn-card wr-pn-${dir}`}
      rel={dir}
      style={{ '--pn-hue': topicAccent(p.topic) } as React.CSSProperties}
    >
      <span className="t-label wr-pn-label">
        {dir === 'prev' ? <Arrow dir="left" /> : null}
        {dir === 'prev' ? 'Previous note' : 'Next note'}
        {dir === 'next' ? <Arrow /> : null}
      </span>
      <span className="wr-pn-title">{p.title}</span>
      <span className="t-label wr-pn-meta">
        <span className="wr-pn-blaze" aria-hidden="true" />
        {TOPICS[p.topic].label} · {noteMeta(p)}
      </span>
    </Link>
  )
  return (
    <nav className="wr-pn" aria-label="More field notes">
      {prev ? card(prev, 'prev') : <span className="wr-pn-empty" aria-hidden="true" />}
      {next ? card(next, 'next') : <span className="wr-pn-empty" aria-hidden="true" />}
    </nav>
  )
}
