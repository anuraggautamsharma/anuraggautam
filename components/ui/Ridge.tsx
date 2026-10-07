import clsx from 'clsx'

/** The skyline every ridge divider shares (viewBox 0 0 1440 110, filled below the line). */
export const RIDGE =
  'M0 110 L0 78 L90 52 L160 66 L250 24 L320 48 L410 30 L470 8 L540 40 L640 34 L720 60 L800 28 L870 44 L960 14 L1040 46 L1120 38 L1200 64 L1290 36 L1370 56 L1440 42 L1440 110 Z'

/**
 * A horizon rising out of the section above. Put it first inside a `position: relative`
 * section: `.ridge` (globals.css) sits on the section's top edge and fills with its --bg.
 */
export function Ridge({ className }: { className?: string }) {
  return (
    <svg className={clsx('ridge', className)} viewBox="0 0 1440 110" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d={RIDGE} fill="currentColor" />
    </svg>
  )
}
