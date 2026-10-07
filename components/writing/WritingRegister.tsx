import { NoteCard } from './NoteCard'
import type { Post } from './posts'

/**
 * The notes on /writing and the topic hubs: the newest as a wide lead card, the rest as a
 * 1 / 2 / 3-column grid. Newest first, as given.
 */
export function WritingRegister({ posts, label }: { posts: Post[]; label: string }) {
  if (!posts.length) return null
  const [lead, ...rest] = posts
  return (
    <div className="wr-register">
      <NoteCard post={lead} size="lg" />
      {rest.length ? (
        <ol className="wr-grid" aria-label={label}>
          {rest.map((p) => (
            <li key={p.slug}>
              <NoteCard post={p} />
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}
