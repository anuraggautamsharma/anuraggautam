'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { motion, subscribe } from '@/components/motion/loop'

type Mode = 'clear' | 'photo' | 'paper' | 'deep'

const LINE = 36 // px from the top: the section crossing this line sets the mode
const TOP = 24 // below this scrollY a photo-first page keeps the clear bar
const HIDE_AFTER = 120

/**
 * Drives the header: data-mode from the [data-nav] section under the bar, html[data-alt]
 * for the Altimeter, data-cta-off while another primary CTA is on screen, and hide-on-scroll (down hides, up returns; never while focus is in
 * the header or the menu is open).
 */
export function HeaderState() {
  const pathname = usePathname()

  useEffect(() => {
    const header = document.getElementById('site-header')
    if (!header) return
    const root = document.documentElement
    let current: HTMLElement | null = null
    let first: HTMLElement | null = null
    let io: IntersectionObserver | null = null
    const hits = new Set<HTMLElement>()

    const applyMode = () => {
      const nav = (current?.dataset.nav ?? 'paper') as Exclude<Mode, 'clear'>
      const clear = nav === 'photo' && current === first && window.scrollY < TOP
      const mode: Mode = clear ? 'clear' : nav
      if (header.dataset.mode !== mode) header.dataset.mode = mode
      // The band's tone tints the deep bar (glacier blue, night), see chrome.css.
      const under = current?.dataset.tone
      if (under) {
        if (header.dataset.under !== under) header.dataset.under = under
      } else delete header.dataset.under
    }

    const pick = () => {
      // The last section in document order that crosses the line is the one on top of it.
      let next: HTMLElement | null = null
      for (const el of hits) {
        if (!next || next.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) next = el
      }
      if (next && next !== current) {
        current = next
        const alt = next.dataset.alt
        if (alt) root.dataset.alt = alt
      }
      applyMode()
    }

    const observe = () => {
      io?.disconnect()
      hits.clear()
      const sections = Array.from(document.querySelectorAll<HTMLElement>('main [data-nav], footer[data-nav]'))
      first = sections[0] ?? null
      // A page with no altitude anywhere (404, /credits) clears the reading left by the last page.
      if (!sections.some((s) => s.dataset.alt)) delete root.dataset.alt
      // A 1px band at y = LINE. (A negative-height root, as in "-36px 0 -100% 0", never intersects.)
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            const el = e.target as HTMLElement
            if (e.isIntersecting) hits.add(el)
            else hits.delete(el)
          }
          pick()
        },
        { rootMargin: `-${LINE}px 0px -${Math.max(0, window.innerHeight - LINE - 1)}px 0px` },
      )
      sections.forEach((s) => io?.observe(s))
      if (!sections.length) {
        current = null
        delete root.dataset.alt
        applyMode()
      }
    }

    observe()

    // Orange is earned: while a beat with its own primary CTA (the Summit, an article's closing
    // plate, the footer sign-off, anything marked data-cta-owner) is on screen, the header's CTA steps back so only one shows per viewport.
    const owners = new Set<Element>()
    const ctaIO = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) owners.add(e.target)
          else owners.delete(e.target)
        }
        header.toggleAttribute('data-cta-off', owners.size > 0)
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    document.querySelectorAll('#summit, .wr-cta, .ft-signoff, [data-cta-owner]').forEach((el) => ctaIO.observe(el))

    let resizeTimer: ReturnType<typeof setTimeout> | undefined
    const onResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(observe, 150)
    }
    window.addEventListener('resize', onResize, { passive: true })

    // Hide on scroll, from the shared loop (it only runs while scrolling or animating).
    let hidden = false
    let lastY = window.scrollY
    let atTop = lastY < TOP
    const unsub = subscribe(() => {
      const y = motion.scrollY
      const dy = y - lastY
      lastY = y
      if (y < TOP !== atTop) {
        atTop = y < TOP
        applyMode()
      }
      const pinned = header.contains(document.activeElement) || root.hasAttribute('data-menu-open')
      let next = hidden
      if (pinned || y <= HIDE_AFTER) next = false
      else if (dy > 0.5) next = true
      else if (dy < -0.5) next = false
      if (next !== hidden) {
        hidden = next
        header.toggleAttribute('data-hidden', hidden)
      }
    })
    const onFocus = () => {
      if (hidden) {
        hidden = false
        header.removeAttribute('data-hidden')
      }
    }
    header.addEventListener('focusin', onFocus)

    return () => {
      io?.disconnect()
      ctaIO.disconnect()
      header.removeAttribute('data-cta-off')
      delete header.dataset.under
      unsub()
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
      header.removeEventListener('focusin', onFocus)
      header.removeAttribute('data-hidden')
    }
  }, [pathname])

  return null
}
