import Link from 'next/link'
import { Section } from '@/components/ui/Section'
import { ChapterLabel } from '@/components/ui/ChapterLabel'
import { Icon } from '@/components/ui/Icon'
import { Plate } from '@/components/ui/Plate'
import { NoteCard } from '@/components/writing/NoteCard'
import { publishedPosts, type Post } from '@/components/writing/posts'
import { Subscribe } from '@/components/subscribe/Subscribe'
import { VideoCard } from '@/components/video/VideoCard'
import { EventSign } from '@/components/community/EventSign'
import { latestVideos, type Video } from '@/lib/videos'
import { nextEvent } from '@/lib/events'
import { chapters, home } from '@/lib/site'
import './home.css'

type Item = { kind: 'note'; date: string; post: Post } | { kind: 'video'; date: string; video: Video }

const keyOf = (item: Item) => (item.kind === 'note' ? `note-${item.post.slug}` : `video-${item.video.href}`)

/**
 * Beat 06, from the trail. The head (label + H2) sits left and the line + index link right, on
 * one baseline. Below, from 64rem, the forest-path plate holds the left columns while the main
 * column runs right, in reading order: the newest item (a long-form video poster when
 * one is newest, else the newest note), the next two items, the Field Notes row and, only when
 * a real Campfire is scheduled, its sign. Nothing here is invented: with no video and no event
 * those slots simply don't render. Card titles sit outside the word budget.
 */
export async function FieldNotes() {
  const copy = home.notes
  const video = (await latestVideos({ kind: 'long', limit: 1 }))[0] ?? null
  const event = nextEvent()

  const items: Item[] = [
    ...(video ? [{ kind: 'video' as const, date: video.date, video }] : []),
    ...publishedPosts()
      .slice(0, 3)
      .map((post) => ({ kind: 'note' as const, date: post.date, post })),
  ]
    // Newest first; on a tie the video leads (it is the rarer, heavier piece).
    .sort((a, b) => b.date.localeCompare(a.date) || (a.kind === 'video' ? -1 : b.kind === 'video' ? 1 : 0))
    .slice(0, 3)
  const [lead, ...rest] = items

  return (
    <Section id="notes" tone="paper" alt={chapters.notes.alt} labelledBy="notes-title" className="fn">
      <div className="wrap cols fn-grid">
        <div className="fn-head">
          <ChapterLabel {...chapters.notes} />
          <h2 id="notes-title" className="t-h2 fn-title">
            {copy.h2}
          </h2>
        </div>
        <div className="fn-aside">
          <p className="t-lead fn-line">{video ? copy.lineVideo : copy.line}</p>
          <Link className="link-go fn-cta" href="/writing">
            {copy.cta}
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>

        {/* 64rem and up only: the plate fills the left columns and holds still while a long column scrolls. */}
        <div className="fn-plate" aria-hidden="true">
          <Plate id="notes-forest-path" aspect="4/5" sizes="(min-width: 100rem) 30rem, (min-width: 64rem) 30vw, 1px" wipe />
        </div>

        <div className="fn-main">
          {lead ? (
            <div className="fn-cards" data-count={items.length} data-wb-exclude="">
              {[lead, ...rest].map((item, i) => (
                <div key={keyOf(item)} className={i === 0 ? 'fn-lead' : 'fn-pair'}>
                  {item.kind === 'video' ? (
                    <VideoCard video={item.video} size={i === 0 ? 'lg' : 'md'} headingLevel="h3" />
                  ) : (
                    <NoteCard post={item.post} size={i === 0 ? 'lg' : 'md'} headingLevel="h3" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="t-label fn-empty">{copy.empty}</p>
          )}

          <Subscribe variant="row" source="home" headingLevel="h3" className="fn-subscribe" />

          {event ? (
            <div className="fn-event">
              <EventSign event={event} tone="paper" />
            </div>
          ) : null}
        </div>
      </div>
    </Section>
  )
}
