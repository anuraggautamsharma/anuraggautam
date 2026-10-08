import clsx from 'clsx'

/**
 * `▮ 01 / BASECAMP ——— ▲ 1,250 M`. Decorative wayfinding, so aria-hidden; the section's
 * <h2> carries the meaning. The altitude is excluded from the homepage word budget.
 */
/** `alt` is accepted but no longer shown: altitudes were one more thing to read. */
export function ChapterLabel({ n, name, className }: { n?: string; name: string; alt?: string; className?: string }) {
  return (
    <p className={clsx('chapter t-label', className)} aria-hidden="true">
      <span>{n ? `${n} / ${name}` : name}</span>
    </p>
  )
}
