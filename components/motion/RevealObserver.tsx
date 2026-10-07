'use client'

import { useEffect } from 'react'
import { isReducedMotion } from '@/components/layout/motionPref'

const SELECTOR = '.reveal, .reveal-lines, .wipe, .signpost'
const DEFAULT_AT = 0.15

/**
 * Adds .is-in to every reveal element the first time it scrolls into view, including
 * elements that mount later (client navigations, islands). Marks html[data-reveal-ready]
 * so the head script's 2.5s failsafe stands down. `data-reveal-at="0.35"` on an element
 * (or its closest [data-reveal-at] ancestor) sets its visibility threshold.
 */
export function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-reveal-ready', '')
    const observers = new Map<number, IntersectionObserver>()
    const seen = new WeakSet<Element>()
    // A .wipe starts fully clipped, and Chrome's IO applies the target's own clip-path, so
    // a clipped element never intersects. Watch its unclipped parent instead.
    const targetOf = new WeakMap<Element, Set<Element>>()

    const show = (el: Element) => el.classList.add('is-in')

    // Photos inside a wipe decode a viewport ahead, so the wipe/iris opens on the image, not its dominant colour.
    const preload = new IntersectionObserver(
      (entries, self) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          for (const img of e.target.querySelectorAll<HTMLImageElement>('img[loading="lazy"]')) img.loading = 'eager'
          self.unobserve(e.target)
        }
      },
      { rootMargin: '100% 0px' },
    )

    const observerFor = (at: number) => {
      let io = observers.get(at)
      if (!io) {
        io = new IntersectionObserver(
          (entries, self) => {
            for (const e of entries) {
              if (!e.isIntersecting) continue
              for (const el of targetOf.get(e.target) ?? [e.target]) show(el)
              self.unobserve(e.target)
            }
          },
          { threshold: at, rootMargin: '0px 0px -6% 0px' },
        )
        observers.set(at, io)
      }
      return io
    }

    const scan = (scope: ParentNode) => {
      const reduced = isReducedMotion()
      const list: Element[] = []
      if (scope instanceof Element && scope.matches(SELECTOR)) list.push(scope)
      list.push(...scope.querySelectorAll(SELECTOR))
      for (const el of list) {
        if (seen.has(el) || el.classList.contains('is-in')) continue
        seen.add(el)
        if (reduced) {
          show(el)
          continue
        }
        const raw = el.closest('[data-reveal-at]')?.getAttribute('data-reveal-at')
        const at = raw ? Math.min(1, Math.max(0, Number(raw) || DEFAULT_AT)) : DEFAULT_AT
        const watch = el.matches('.wipe') ? (el.parentElement ?? el) : el
        // Several wipes (or a reveal and its wipe child) can share one watched element.
        const group = targetOf.get(watch) ?? new Set<Element>()
        group.add(el)
        targetOf.set(watch, group)
        if (watch !== el) preload.observe(watch)
        observerFor(at).observe(watch)
      }
    }

    scan(document)

    let pending: Element[] = []
    let queued = false
    const mo = new MutationObserver((records) => {
      for (const r of records) for (const n of r.addedNodes) if (n instanceof Element) pending.push(n)
      if (queued || !pending.length) return
      queued = true
      queueMicrotask(() => {
        queued = false
        const batch = pending
        pending = []
        for (const el of batch) if (el.isConnected) scan(el)
      })
    })
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      mo.disconnect()
      for (const io of observers.values()) io.disconnect()
      preload.disconnect()
      root.removeAttribute('data-reveal-ready')
    }
  }, [])

  return null
}
