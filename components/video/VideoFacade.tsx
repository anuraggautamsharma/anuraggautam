'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { preconnect } from 'react-dom'
import { track } from '@vercel/analytics'
import { pages } from '@/lib/site'
import { Icon } from '@/components/ui/Icon'
import { getLenis, wake } from '@/components/motion/loop'
import { isReducedMotion } from '@/components/layout/motionPref'
import { PlayGlyph } from './PlayGlyph'
import './video.css'

const ORIGINS = ['https://www.youtube-nocookie.com', 'https://www.youtube.com', 'https://i.ytimg.com', 'https://www.google.com']

const watchUrl = (id: string, t = 0) => `https://www.youtube.com/watch?v=${id}${t ? `&t=${t}s` : ''}`

/**
 * The watch-page player, poster first (PLAN_V3 §5). Until the viewer asks, it is a poster
 * link to YouTube, so it works with no JS and loads no third party. Pointer or focus
 * preconnects; a click swaps in the privacy-enhanced iframe in the same 16:9 box (no
 * layout shift). Chapter links on the page (`a[data-seek][data-seek-for=<id>]`) start or
 * seek the player in place; without JS they open YouTube at that time.
 */
export function VideoFacade({
  youtubeId,
  title,
  poster,
  priority = false,
}: {
  youtubeId: string
  title: string
  poster: string
  priority?: boolean
}) {
  const [start, setStart] = useState<number | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const warmed = useRef(false)
  const copy = pages.watch

  function warm() {
    if (warmed.current) return
    warmed.current = true
    for (const o of ORIGINS) preconnect(o)
  }

  function play(t: number) {
    if (start === null) track('video_play', { source: 'watch' })
    if (start !== null && frame.current?.contentWindow) {
      // Already playing: seek in place (enablejsapi=1) instead of reloading the player.
      const send = (func: string, args: unknown[]) =>
        frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), 'https://www.youtube-nocookie.com')
      send('seekTo', [t, true])
      send('playVideo', [])
      return
    }
    setStart(t)
  }

  function onPosterClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    play(0)
  }

  // Chapter links anywhere on the page seek this player.
  useEffect(() => {
    function onClick(e: globalThis.MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>('a[data-seek]') : null
      if (!a || a.dataset.seekFor !== youtubeId) return
      const t = Number(a.dataset.seek)
      if (!Number.isFinite(t)) return
      e.preventDefault()
      warm()
      play(t)
      const el = box.current
      if (!el) return
      const lenis = getLenis()
      const offset = -(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 60) - 24
      if (lenis) {
        lenis.scrollTo(el, { offset, immediate: isReducedMotion() })
        wake()
      } else {
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: isReducedMotion() ? 'auto' : 'smooth' })
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  })

  // Hand keyboard focus to the player once it mounts, so Space/K control it straight away.
  useEffect(() => {
    if (start !== null) frame.current?.focus({ preventScroll: true })
  }, [start])

  const src =
    start === null
      ? null
      : `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&playsinline=1&rel=0&enablejsapi=1${start ? `&start=${start}` : ''}`

  return (
    <div className="vd-facade-wrap">
      <div ref={box} className="vd-facade" data-state={src ? 'playing' : 'poster'}>
        {src ? (
          <iframe
            ref={frame}
            src={src}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <a
            className="vd-facade-hit"
            href={watchUrl(youtubeId)}
            onClick={onPosterClick}
            onPointerEnter={warm}
            onFocus={warm}
            aria-label={`${copy.play}: ${title}`}
          >
            <Image
              src={poster}
              alt=""
              fill
              sizes="(min-width: 90rem) 1312px, 100vw"
              quality={60}
              {...(priority ? { preload: true, loading: 'eager' as const, fetchPriority: 'high' as const } : {})}
            />
            <span className="vd-facade-scrim" aria-hidden="true" />
            <span className="vd-facade-cta" aria-hidden="true">
              <PlayGlyph className="vd-facade-play" />
              <span className="t-label">{copy.play}</span>
            </span>
          </a>
        )}
      </div>
      <p className="vd-facade-alt t-label">
        <a href={watchUrl(youtubeId)} rel="noopener" className="vd-out">
          {copy.onYouTube}
          <Icon name="arrow-up-right" size={16} />
        </a>
      </p>
    </div>
  )
}
