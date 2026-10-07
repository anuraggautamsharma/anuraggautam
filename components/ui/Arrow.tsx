// ← → are not in the latin font subset, so horizontal arrows are drawn.
export function Arrow({ dir = 'right', className }: { dir?: 'right' | 'left' | 'up' | 'down' | 'up-right'; className?: string }) {
  const rot = { right: 0, down: 90, left: 180, up: 270, 'up-right': -45 }[dir]
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 10 10"
      width="0.7em"
      height="0.7em"
      className={className}
      style={{ transform: `rotate(${rot}deg)`, display: 'inline-block', flex: 'none' }}
    >
      <path d="M0 5h9M5.5 1.5 9 5 5.5 8.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  )
}
