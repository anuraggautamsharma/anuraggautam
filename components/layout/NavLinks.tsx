'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { nav } from '@/lib/site'

/** Section match: /writing is active on /writing/any-post. Hash links never claim the page. */
export function isActive(pathname: string, href: string) {
  if (href.includes('#')) return false
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function NavLinks() {
  const pathname = usePathname() ?? '/'
  return (
    <ul className="hd-links">
      {nav.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className="hd-link" aria-current={isActive(pathname, item.href) ? 'page' : undefined}>
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}
