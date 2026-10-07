import clsx from 'clsx'

/**
 * The play mark: a cut ink square holding a paper triangle, with a sunrise blaze on its
 * leading edge (orange as a mark, never a block). Decorative; the link names the action.
 */
export function PlayGlyph({ className }: { className?: string }) {
  return (
    <span className={clsx('vd-play', className)} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M8 5.5v13l10.5-6.5z" />
      </svg>
    </span>
  )
}
