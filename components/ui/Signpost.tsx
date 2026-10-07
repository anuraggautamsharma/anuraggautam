import clsx from 'clsx'
import type { CSSProperties, ReactNode } from 'react'
import { CountUp, type CountFormat } from './CountUp'

/**
 * A timber trail post carrying stat signs. Signs point right (`dir="r"`, post on the left)
 * or left. The signs wipe out from the post when the post scrolls in (RevealObserver).
 */
export function Signpost({
  label,
  dir = 'r',
  className,
  children,
}: {
  label?: string
  dir?: 'r' | 'l'
  className?: string
  children: ReactNode
}) {
  return (
    <ul className={clsx('signpost', className)} data-dir={dir} aria-label={label}>
      {children}
    </ul>
  )
}

/** One sign on a Signpost: a big figure and its mono label. Ink on every colour (≥ 5.85:1). */
export function Sign({
  value,
  label,
  countTo,
  format = 'plain',
  c = 'sunrise',
  i,
}: {
  value: string
  label: string
  countTo?: number
  format?: CountFormat
  c?: 'sunrise' | 'paper' | 'dawn' | 'sand' | 'ice'
  /** Stagger index; defaults to CSS nth-child timing. */
  i?: number
}) {
  return (
    <li className="sign" data-c={c === 'sunrise' ? undefined : c} style={i != null ? ({ '--i': i } as CSSProperties) : undefined}>
      <span className="t-num">{countTo != null ? <CountUp to={countTo} final={value} format={format} /> : value}</span>
      <span className="t-label">{label}</span>
    </li>
  )
}
