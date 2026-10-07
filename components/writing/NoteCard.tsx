import Link from 'next/link'
import { ViewTransition } from 'react'
import { ContourTile } from './ContourTile'
import { NoBreakHyphens } from './NoBreak'
import { noteMeta, postPath, topicAccent, type Post } from './posts'
import './note-card.css'

/**
 * A field note on the homepage, the index and the topic hubs. No container: a contour
 * tile, a mono meta line and the title. The title link stretches over the whole card.
 * The tile shares `note-{slug}` with the article cover, so it morphs on navigation.
 */
export function NoteCard({
  post,
  size = 'md',
  headingLevel = 'h3',
}: {
  post: Post
  size?: 'lg' | 'md'
  headingLevel?: 'h3' | 'h4'
}) {
  const Heading = headingLevel
  return (
    <article
      className="note wr-note"
      data-size={size}
      style={{ '--note-accent': topicAccent(post.topic) } as React.CSSProperties}
    >
      <ViewTransition name={`note-${post.slug}`} share="wr-morph">
        <ContourTile post={post} aspect={size === 'lg' ? '21/9' : '3/2'} />
      </ViewTransition>
      <div className="wr-note-body">
        <p className="t-label wr-note-meta">
          <span className="wr-note-blaze" aria-hidden="true" />
          {noteMeta(post)}
        </p>
        <Heading className="note-title wr-note-title">
          <Link href={postPath(post.slug)} className="wr-note-link">
            <NoBreakHyphens text={post.title} />
          </Link>
        </Heading>
        {size === 'lg' ? <p className="wr-note-dek">{post.description}</p> : null}
      </div>
    </article>
  )
}
