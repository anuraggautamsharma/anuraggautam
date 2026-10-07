'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { chrome, nav, profiles } from '@/lib/site'
import { getLenis } from '@/components/motion/loop'
import { isActive } from './NavLinks'

const FOCUSABLE = 'a[href], button:not([disabled])'
const DESKTOP = '(min-width: 64rem)'

/** < 64rem: a 44px two-bar button and a full-screen forest sheet that wipes down from the top. */
export function MobileMenu() {
  const pathname = usePathname() ?? '/'
  const [open, setOpen] = useState(false)
  const [lastPath, setLastPath] = useState(pathname)
  const btnRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const firstLinkRef = useRef<HTMLAnchorElement>(null)
  const wasOpen = useRef(false)

  // Close on any route change (including back/forward), adjusted during render.
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setOpen(false)
  }

  useEffect(() => {
    const root = document.documentElement
    if (!open) {
      // Only hand focus back if the menu was actually open (not on first mount).
      if (wasOpen.current) btnRef.current?.focus({ preventScroll: true })
      wasOpen.current = false
      return
    }
    wasOpen.current = true

    const main = document.getElementById('main')
    const footer = document.querySelector<HTMLElement>('footer.site-footer')
    const prevOverflow = root.style.overflow
    root.style.overflow = 'hidden'
    root.setAttribute('data-menu-open', '')
    getLenis()?.stop()
    if (main) main.inert = true
    if (footer) footer.inert = true
    firstLinkRef.current?.focus({ preventScroll: true })

    // The trap spans the toggle button (in the bar) and the sheet.
    const scope = () => [btnRef.current, ...(sheetRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter(Boolean) as HTMLElement[]
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        return
      }
      if (e.key !== 'Tab') return
      const items = scope()
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement as HTMLElement | null
      const inside = !!active && items.includes(active)
      if (e.shiftKey && (active === first || !inside)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !inside)) {
        e.preventDefault()
        first.focus()
      }
    }
    // Growing past the breakpoint hides the button, so close rather than strand the user.
    const mq = window.matchMedia(DESKTOP)
    const onMq = () => mq.matches && setOpen(false)

    document.addEventListener('keydown', onKey)
    mq.addEventListener('change', onMq)
    return () => {
      document.removeEventListener('keydown', onKey)
      mq.removeEventListener('change', onMq)
      root.style.overflow = prevOverflow
      root.removeAttribute('data-menu-open')
      getLenis()?.start()
      if (main) main.inert = false
      if (footer) footer.inert = false
    }
  }, [open])

  const close = () => setOpen(false)
  const items = [...nav, { label: chrome.cta, href: '/contact' }]

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="hd-menu-btn"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? 'Close menu' : 'Menu'}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="hd-menu-bars" aria-hidden="true" />
      </button>

      <div
        ref={sheetRef}
        id="mobile-menu"
        className="mm-sheet topo"
        data-tone="forest"
        data-open={open ? '' : undefined}
        inert={!open}
        data-lenis-prevent=""
      >
        <div className="wrap mm-inner">
          <nav aria-label="Menu">
            <ol className="mm-list">
              {items.map((item, i) => (
                <li key={item.href} style={{ '--i': i } as React.CSSProperties}>
                  <Link
                    ref={i === 0 ? firstLinkRef : undefined}
                    href={item.href}
                    className="mm-link"
                    aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                    onClick={close}
                  >
                    <span className="mm-num t-label" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="mm-word">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mm-foot t-label">
            {/* Real profiles only: YouTube and Instagram join once their handles are set in lib/site. */}
            {profiles.map((p) => (
              <a key={p.url} href={p.url} rel="me" className="link">
                {p.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
