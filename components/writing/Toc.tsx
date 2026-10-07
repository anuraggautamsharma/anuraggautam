'use client'

import { useEffect, useRef, useState } from 'react'

export type TocEntry = { id: string; text: string; n?: string }

/**
 * Sticky contents rail (≥80rem). The links are server-rendered; this island only moves
 * the orange tick to the section being read, via IntersectionObserver.
 */
export function Toc({ items }: { items: TocEntry[] }) {
  const [active, setActive] = useState<string | null>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const tickRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const headings = items.map((it) => document.getElementById(it.id)).filter((el): el is HTMLElement => !!el)
    if (!headings.length) return

    // The current section is the last heading at or above the 30% line. The observer only
    // signals that some heading crossed that line; geometry decides which one is current,
    // so the initial batch and fast jumps can't leave a stale or wrong item active.
    const io = new IntersectionObserver(
      () => {
        const line = window.innerHeight * 0.3
        let cur: string | null = null
        for (const h of headings) {
          if (h.getBoundingClientRect().top <= line) cur = h.id
          else break
        }
        setActive(cur)
      },
      { rootMargin: '0px 0px -70% 0px' },
    )
    headings.forEach((h) => io.observe(h))
    return () => io.disconnect()
  }, [items])

  useEffect(() => {
    const tick = tickRef.current
    const list = listRef.current
    if (!tick || !list) return
    const link = active ? list.querySelector<HTMLElement>(`a[href="#${CSS.escape(active)}"]`) : null
    if (!link) {
      tick.style.opacity = '0'
      return
    }
    const li = link.parentElement as HTMLElement
    tick.style.opacity = '1'
    tick.style.transform = `translateY(${li.offsetTop}px) scaleY(${li.offsetHeight})`
  }, [active])

  return (
    <nav className="wr-toc" aria-label="Contents">
      <p className="t-label wr-toc-title">Contents</p>
      <div className="wr-toc-rail">
        <span ref={tickRef} className="wr-toc-tick" aria-hidden="true" />
        <ol ref={listRef} className="wr-toc-list">
          {items.map((it) => (
            <li key={it.id}>
              <a href={`#${it.id}`} aria-current={active === it.id ? 'location' : undefined}>
                <span className="wr-toc-n" aria-hidden="true">
                  {it.n ?? ''}
                </span>
                <span>{it.text}</span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  )
}
