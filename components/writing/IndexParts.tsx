import Link from 'next/link'
import { chapters, footer, pages } from '@/lib/site'
import { ChapterLabel } from '@/components/ui/ChapterLabel'
import { Subscribe } from '@/components/subscribe/Subscribe'
import { topicPath, type Topic } from './posts'

type TopicCount = { topic: Topic; label: string; count: number }

/** Topic hubs as chips. On a hub, `current` marks its own chip and "All" leads back to the index. */
export function TopicLinks({
  topics,
  current,
  label = 'Topics',
}: {
  topics: TopicCount[]
  current?: Topic
  label?: string
}) {
  return (
    <nav className="wr-topics" aria-label={label}>
      <ul>
        <li>
          <Link href="/writing" className="chip wr-chip" aria-current={current ? undefined : 'page'}>
            All
          </Link>
        </li>
        {topics.map((t) => (
          <li key={t.topic}>
            <Link
              href={topicPath(t.topic)}
              className="chip wr-chip"
              aria-current={current === t.topic ? 'page' : undefined}
            >
              <span>{t.label}</span>
              <span className="wr-chip-n" aria-hidden="true">
                {String(t.count).padStart(2, '0')}
              </span>
              <span className="sr-only">
                , {t.count} {t.count === 1 ? 'note' : 'notes'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * Field Notes by email at the foot of the index and the hubs: the `card` sign-up in a paper
 * band (hairline above). The card carries the RSS link itself, and while email isn't
 * configured it shows the honest closed state with the feed instead of a form.
 */
export function SubscribeBlock() {
  return (
    <section data-tone="paper" data-nav="paper" data-alt={chapters.notes.alt} className="wr-sub" aria-labelledby="subscribe-title">
      <div className="wrap wr-sub-inner">
        <ChapterLabel name={footer.links.subscribe} alt={chapters.notes.alt} className="wr-sub-kicker" />
        <Subscribe variant="card" source="writing" id="subscribe" className="wr-sub-card" />
      </div>
    </section>
  )
}

/** Read | Watch: shown on /writing only once a real video exists. */
export function FormatChips({ current }: { current: 'read' | 'watch' }) {
  const { tabs } = pages.watch
  return (
    <nav className="wr-topics wr-formats" aria-label={pages.writing.breadcrumb}>
      <ul>
        <li>
          <Link href="/writing" className="chip wr-chip" aria-current={current === 'read' ? 'page' : undefined}>
            {tabs.read}
          </Link>
        </li>
        <li>
          <Link href="/watch" className="chip wr-chip" aria-current={current === 'watch' ? 'page' : undefined}>
            {tabs.watch}
          </Link>
        </li>
      </ul>
    </nav>
  )
}
