'use client'

import { useEffect } from 'react'
import { damp, subscribe } from './loop'
import { isFinePointer, isReducedMotion } from '@/components/layout/motionPref'

const PULL = 0.22 // fraction of the pointer offset the element follows
const MAX = 8 // px

/**
 * The site's only pointer effect: elements with [data-magnetic] lean toward a fine pointer
 * (CSS `translate`, so it composes with the press transform). One delegated listener for
 * the whole document; a loop subscriber runs only while an element is moving.
 */
export function Magnetic() {
  useEffect(() => {
    let el: HTMLElement | null = null
    let target = { x: 0, y: 0 }
    let cur = { x: 0, y: 0 }
    let unsub: (() => void) | null = null
    const live = new Map<HTMLElement, { x: number; y: number }>()

    const write = (node: HTMLElement, x: number, y: number) => {
      node.style.setProperty('--mx', `${x.toFixed(2)}px`)
      node.style.setProperty('--my', `${y.toFixed(2)}px`)
    }

    const run = () => {
      unsub ??= subscribe((_t, dt) => {
        if (el) {
          cur = { x: damp(cur.x, target.x, 14, dt), y: damp(cur.y, target.y, 14, dt) }
          live.set(el, cur)
          write(el, cur.x, cur.y)
        }
        // Elements the pointer has left spring back to rest.
        for (const [node, v] of live) {
          if (node === el) continue
          v.x = damp(v.x, 0, 10, dt)
          v.y = damp(v.y, 0, 10, dt)
          if (Math.abs(v.x) < 0.05 && Math.abs(v.y) < 0.05) {
            node.style.removeProperty('--mx')
            node.style.removeProperty('--my')
            live.delete(node)
          } else write(node, v.x, v.y)
        }
        if (!el && !live.size) {
          unsub?.()
          unsub = null
        }
      })
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || isReducedMotion() || !isFinePointer()) return
      const hit = (e.target as Element | null)?.closest?.<HTMLElement>('[data-magnetic]') ?? null
      if (hit !== el) {
        if (el) live.set(el, { ...cur })
        el = hit
        cur = hit ? (live.get(hit) ?? { x: 0, y: 0 }) : { x: 0, y: 0 }
      }
      if (!el) {
        target = { x: 0, y: 0 }
        if (live.size) run()
        return
      }
      const r = el.getBoundingClientRect()
      const dx = (e.clientX - (r.left + r.width / 2)) * PULL
      const dy = (e.clientY - (r.top + r.height / 2)) * PULL
      target = { x: Math.max(-MAX, Math.min(MAX, dx)), y: Math.max(-MAX, Math.min(MAX, dy)) }
      run()
    }
    const onLeave = () => {
      if (el) live.set(el, { ...cur })
      el = null
      if (live.size) run()
    }

    document.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      unsub?.()
      for (const node of live.keys()) {
        node.style.removeProperty('--mx')
        node.style.removeProperty('--my')
      }
    }
  }, [])

  return null
}
