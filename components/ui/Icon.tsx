import type { JSX } from 'react'

export type IconName =
  | 'compass' | 'scale' | 'beacon' | 'carabiner' | 'rope'
  | 'arrow-right' | 'arrow-up-right' | 'chevron' | 'menu' | 'close'
  | 'pin' | 'flag' | 'mail' | 'rss' | 'external' | 'check'

// 24×24 line glyphs, 2px stroke, square caps and mitred joins: cut, not rounded.
const PATHS: Record<IconName, JSX.Element> = {
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5 13.4 13.4 8.5 15.5l2.1-4.9z" fill="currentColor" stroke="none" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
    </>
  ),
  scale: <path d="M12 3v18M7 21h10M4 7h16M4 7l-3 7h6zM20 7l-3 7h6z" />,
  beacon: <path d="M12 9v12M8 21h8M9.5 9h5l-1 4h-3zM12 2v3M5.5 4.5l2 2M18.5 4.5l-2 2M3 10h3M18 10h3" />,
  carabiner: <path d="M9 3h6l3 3v12l-3 3H9l-3-3V6zM10 7v10M14 7v4" />,
  rope: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 20v3" />
    </>
  ),
  'arrow-right': <path d="M3 12h17M14 6l6 6-6 6" />,
  'arrow-up-right': <path d="M6 18 18 6M8 6h10v10" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  menu: <path d="M3 8h18M3 16h18" />,
  close: <path d="m5 5 14 14M19 5 5 19" />,
  pin: (
    <>
      <path d="M12 22s-7-7.2-7-12a7 7 0 0 1 14 0c0 4.8-7 12-7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  flag: <path d="M5 22V3h13l-3 4.5 3 4.5H5" />,
  mail: <path d="M3 5h18v14H3zM3 5l9 8 9-8" />,
  rss: (
    <>
      <path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />,
  check: <path d="m4 12.5 5 5L20 6.5" />,
}

/** Decorative line icon. Always aria-hidden: give the control its own accessible name. */
export function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName
  size?: 16 | 20 | 24 | 32
  className?: string
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={className}
      style={{ flex: 'none' }}
    >
      {PATHS[name]}
    </svg>
  )
}
