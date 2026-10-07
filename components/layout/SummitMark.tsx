/**
 * The summit mark: an ink peak with a sunrise dot. The peak takes currentColor so it reads
 * paper over photos and the night footer; the dot is always sunrise-500.
 */
export const SUMMIT_PEAK = 'M1 29 16 3.5 31 29Z'
export const SUMMIT_DOT = { cx: 26, cy: 6.5, r: 3.5 }

export function SummitMark({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      style={{ flex: 'none' }}
    >
      <path d={SUMMIT_PEAK} fill="currentColor" />
      <circle {...SUMMIT_DOT} fill="var(--c-sunrise-500, #F86A00)" />
    </svg>
  )
}

/** Standalone SVG string (ink peak on transparent) for icons and OG images. */
export function summitMarkSvg(peak = '#0E1D15', dot = '#F86A00') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="${SUMMIT_PEAK}" fill="${peak}"/><circle cx="${SUMMIT_DOT.cx}" cy="${SUMMIT_DOT.cy}" r="${SUMMIT_DOT.r}" fill="${dot}"/></svg>`
}
