import Link from 'next/link'
import { ViewTransition } from 'react'
import { person } from '@/lib/site'
import { isoDate, longDate } from '@/lib/dates'
import { ContourTile } from './ContourTile'
import { NoBreakHyphens } from './NoBreak'
import { TOPICS, topicPath, type Post } from './posts'
import './note-card.css'

// Long titles step the H1 down one notch so they hold to four lines on a phone.
const LONG_TITLE = 56

export function ArticleHeader({ post }: { post: Post }) {
  const topic = TOPICS[post.topic].label
  const updated = post.updated && post.updated !== post.date ? post.updated : null

  return (
    <header className="wr-head">
      <div className="wrap wr-head-text">
        <nav aria-label="Breadcrumb" className="wr-crumbs t-label">
          <ol>
            <li>
              <span className="wr-crumbs-blaze" aria-hidden="true" />
              <Link href="/writing">Field Notes</Link>
            </li>
            <li>
              <Link href={topicPath(post.topic)}>{topic}</Link>
            </li>
          </ol>
        </nav>

        <h1 className="t-h1 wr-title" data-long={post.title.length > LONG_TITLE || undefined}>
          <NoBreakHyphens text={post.title} />
        </h1>
        <p className="wr-dek">{post.description}</p>

        <div className="wr-meta">
          <p className="wr-byline">
            By{' '}
            <Link rel="author" href="/about" className="link">
              {person.name}
            </Link>
          </p>
          <p className="t-label wr-meta-line">
            <time dateTime={isoDate(post.date)}>{longDate(post.date)}</time>
            {updated ? (
              <>
                <span aria-hidden="true"> · </span>
                <span>
                  Updated <time dateTime={isoDate(updated)}>{longDate(updated)}</time>
                </span>
              </>
            ) : null}
            <span aria-hidden="true"> · </span>
            <span>{post.readingMinutes} min read</span>
            {post.kind === 'paper' ? (
              <>
                <span aria-hidden="true"> · </span>
                <span>Paper</span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className="wrap wr-cover">
        <ViewTransition name={`note-${post.slug}`} share="wr-morph">
          <ContourTile post={post} aspect="21/9" variant="cover" />
        </ViewTransition>
      </div>
    </header>
  )
}

/** Sand panel with a 2px ink top rule: the article in three to five lines. */
export function KeyTakeaways({ items }: { items: string[] }) {
  return (
    <section className="wr-takeaways" aria-labelledby="key-takeaways">
      <h2 id="key-takeaways" className="t-label wr-takeaways-title">
        Key takeaways
      </h2>
      <ol>
        {items.map((t, i) => (
          <li key={i}>
            <span className="wr-takeaways-n" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span>{t}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
