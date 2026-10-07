import Link from 'next/link'
import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Icon } from './Icon'

export type ButtonVariant = 'primary' | 'secondary' | 'photo'
export type ButtonSize = 'sm' | 'md' | 'lg'

/** Class string for a design-system button, for <button> elements that can't use ButtonLink. */
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return clsx('btn', variant === 'secondary' && 'btn-secondary', variant === 'photo' && 'btn-photo', size === 'sm' && 'btn-sm', size === 'lg' && 'btn-lg', className)
}

/**
 * Square, heavy link-button. Internal paths use next/link; hashes, mailto and external
 * URLs render a plain <a>. `magnetic` opts into the pointer pull (components/motion/Magnetic).
 */
export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  magnetic,
  arrow = 'right',
  className,
  children,
  'aria-label': ariaLabel,
}: {
  href: string
  variant?: ButtonVariant
  size?: ButtonSize
  magnetic?: boolean
  arrow?: 'right' | 'up-right' | 'none'
  className?: string
  'aria-label'?: string
  children: ReactNode
}) {
  const props = {
    className: buttonClass(variant, size, className),
    'aria-label': ariaLabel,
    // Every primary action gets the same pull; other variants opt in. Pass magnetic={false} to opt out.
    'data-magnetic': (magnetic ?? variant === 'primary') ? '' : undefined,
  }
  const content = (
    <>
      <span>{children}</span>
      {arrow !== 'none' ? <Icon name={arrow === 'up-right' ? 'arrow-up-right' : 'arrow-right'} size={16} /> : null}
    </>
  )
  if (href.startsWith('/') && !href.startsWith('//')) {
    return (
      <Link href={href} {...props}>
        {content}
      </Link>
    )
  }
  return (
    <a href={href} {...props}>
      {content}
    </a>
  )
}
