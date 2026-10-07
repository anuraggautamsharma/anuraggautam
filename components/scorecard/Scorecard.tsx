'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode, type RefObject } from 'react'
import Link from 'next/link'
import { track } from '@vercel/analytics'
import type { CampId } from '@/lib/site'
import {
  ALT_MAX,
  ALT_MIN,
  QUESTION_COUNT,
  STALL_TO_STUCK,
  altitudeFor,
  decodeAnswers,
  encodeAnswers,
  scoreAnswers,
  type Answer,
  type CampState,
} from '@/lib/scorecard'
import { getLenis, subscribe as onFrame } from '@/components/motion/loop'
import { isReducedMotion } from '@/components/layout/motionPref'
import { Arrow } from '@/components/ui/Arrow'
import { CopyButton } from '@/components/ui/CopyButton'
import { CAMP_X, Profile } from './Profile'
import './scorecard.css'

/** Copy arrives as props (from lib/site via the page), so this island never bundles lib/site. */
export type ScorecardCopy = {
  scale: readonly string[]
  next: string
  back: string
  see: string
  progress: string
  resultH: string
  stallH: string
  states: Record<CampState, string>
  summit: string
  cta: string
  ctaLine: string
  campLink: string
  retake: string
  share: string
  copied: string
  privacy: string
}
export type ScorecardCamp = { id: CampId; n: number; name: string; hue: string; hazard: string; line: string }

type Props = {
  copy: ScorecardCopy
  questions: readonly { camp: CampId; q: string }[]
  camps: readonly ScorecardCamp[]
  /** Absolute /scorecard URL; the share link adds the #r= hash. */
  shareUrl: string
  /** The `row` subscribe form, rendered by the server and shown under the result. */
  subscribe?: ReactNode
}

const pad = (n: number) => String(n).padStart(2, '0')
const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
const ADVANCE_MS = 260

// The result lives in the URL hash (#r=2102120111). replaceState fires no event, so writes
// announce themselves; hashchange covers back/forward and pasted links.
const HASH_EVENT = 'sc-hash'
const onHash = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  window.addEventListener(HASH_EVENT, cb)
  return () => {
    window.removeEventListener('hashchange', cb)
    window.removeEventListener(HASH_EVENT, cb)
  }
}
const readHash = () => window.location.hash
const noHash = () => ''
function writeHash(hash: string) {
  history.replaceState(history.state, '', `${location.pathname}${location.search}${hash}`)
  window.dispatchEvent(new Event(HASH_EVENT))
}

/**
 * Keep the instrument framed: if the panel's top has left the upper half of the viewport,
 * bring it back under the header (through Lenis when it runs, so the two never fight).
 */
function frame(el: Element | null | undefined, force = false) {
  const panel = el?.closest('.sc-panel')
  if (!(panel instanceof HTMLElement)) return
  const top = panel.getBoundingClientRect().top
  const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 60
  if (!force && top >= nav && top < innerHeight * 0.5) return
  const offset = -(nav + 16)
  const instant = isReducedMotion()
  const lenis = getLenis()
  if (lenis) lenis.scrollTo(panel, { offset, immediate: instant })
  else window.scrollTo({ top: top + scrollY + offset, behavior: instant ? 'auto' : 'smooth' })
}

/** Answers given → where the walker stands: halfway to a camp after its first statement, at the pin after its second. */
const walkX = (n: number) => (n <= 2 ? n * 50 : n * 100 - 100)

/** Rolls a number up or down through the shared frame loop (no rAF of its own). */
function Ticker({ value, from = value }: { value: number; from?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const shown = useRef(from)
  // React renders the starting number once; after that only the loop writes the text.
  const [initial] = useState(() => fmt(from))
  useEffect(() => {
    const el = ref.current
    const start = shown.current
    if (!el || start === value) return
    if (isReducedMotion()) {
      shown.current = value
      el.textContent = fmt(value)
      return
    }
    const dur = Math.min(1400, 500 + Math.abs(value - start) / 4)
    let t0 = -1
    const stop = onFrame((t) => {
      if (t0 < 0) t0 = t
      const k = Math.min(1, (t - t0) / dur)
      shown.current = start + (value - start) * (1 - Math.pow(1 - k, 3))
      el.textContent = fmt(shown.current)
      if (k === 1) stop()
    })
    return stop
  }, [value])
  return (
    <span ref={ref} className="tnum">
      {initial}
    </span>
  )
}

function Pips({ score, max, hue }: { score: number; max: number; hue?: string }) {
  return (
    <span className="sc-pips" aria-hidden="true" style={hue ? ({ '--hue': hue } as CSSProperties) : undefined}>
      {Array.from({ length: max }, (_, i) => (
        <i key={i} data-on={i < score ? '' : undefined} />
      ))}
    </span>
  )
}

export function Scorecard({ copy, questions, camps, shareUrl, subscribe }: Props) {
  const hash = useSyncExternalStore(onHash, readHash, noHash)
  const shared = hash.startsWith('#r=') ? decodeAnswers(hash.slice(3)) : null

  const [answers, setAnswers] = useState<(Answer | null)[]>(() => Array(QUESTION_COUNT).fill(null))
  const [step, setStep] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const started = useRef(false)
  const focusTo = useRef<'step' | 'result' | null>(null)
  const stepHead = useRef<HTMLHeadingElement>(null)
  const resultHead = useRef<HTMLHeadingElement>(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  // Move focus with the view, so a screen reader hears each new statement (never on first load).
  useEffect(() => {
    const to = focusTo.current
    focusTo.current = null
    if (to === 'step') {
      stepHead.current?.focus({ preventScroll: true })
      frame(stepHead.current)
    }
    if (to === 'result') {
      resultHead.current?.focus({ preventScroll: true })
      frame(resultHead.current, true)
    }
  }, [step, shared])

  const goTo = (i: number) => {
    clearTimeout(timer.current)
    focusTo.current = 'step'
    setStep(i)
  }

  const finish = (a: Answer[]) => {
    const r = scoreAnswers(a)
    track('scorecard_complete', { source: 'scorecard', stall: r.summit ? 'none' : r.stall, altitude: r.altitude })
    focusTo.current = 'result'
    writeHash(`#r=${encodeAnswers(a)}`)
  }

  const answer = (v: Answer) => {
    if (!started.current) {
      started.current = true
      track('scorecard_start', { source: 'scorecard' })
    }
    const next = answers.map((a, i) => (i === step ? v : a))
    setAnswers(next)
    clearTimeout(timer.current)
    const advance = () => {
      if (step < QUESTION_COUNT - 1) goTo(step + 1)
      else if (next.every((x) => x !== null)) finish(next as Answer[])
    }
    if (isReducedMotion()) advance()
    else timer.current = setTimeout(advance, ADVANCE_MS)
  }

  const retake = () => {
    clearTimeout(timer.current)
    started.current = false
    setAnswers(Array(QUESTION_COUNT).fill(null))
    focusTo.current = 'step'
    setStep(0)
    writeHash('')
  }

  if (shared) {
    return <Result answers={shared} copy={copy} camps={camps} shareUrl={shareUrl} subscribe={subscribe} onRetake={retake} headRef={resultHead} />
  }

  const q = questions[step]
  const ci = step >> 1
  const camp = camps[ci]
  const current = answers[step]
  const answered = answers.filter((a) => a !== null).length
  const points = answers.reduce<number>((s, a) => s + (a ?? 0), 0)
  const isLast = step === QUESTION_COUNT - 1
  const nextLabel = isLast ? copy.see : step % 2 ? copy.next : copy.next.split(' ')[0]
  const pins = camps.map((c, i) => {
    const done = answers[i * 2] !== null && answers[i * 2 + 1] !== null
    return { id: c.id, n: c.n, hue: c.hue, state: i === ci ? 'here' : done ? 'done' : 'todo' }
  })

  return (
    <div className="sc-panel" data-view="steps" style={{ '--hue': camp.hue } as CSSProperties}>
      <div className="sc-bar">
        <p className="t-label sc-count">
          {copy.progress} <span className="tnum sc-count-n">{pad(step + 1)}</span>
          <span className="sc-count-of"> / {pad(QUESTION_COUNT)}</span>
        </p>
        <p className="t-label sc-alt" aria-hidden="true">
          <span className="sc-alt-k">Alt</span> <Ticker value={altitudeFor(points)} /> M
        </p>
      </div>

      <Profile walked={walkX(Math.min(step, answered))} pins={pins} marker={<span className="sc-you-dot" />} />

      <div className="sc-step" key={step}>
        <p className="t-label sc-camp">
          <span className="sc-camp-blaze" aria-hidden="true" />
          Camp {pad(camp.n)} · {camp.name}
        </p>
        <h2 id="sc-q" className="sc-q" tabIndex={-1} ref={stepHead}>
          {q.q}
        </h2>
        <div className="sc-scale" role="group" aria-labelledby="sc-q">
          {copy.scale.map((label, v) => (
            <button
              key={label}
              type="button"
              className="sc-opt"
              aria-pressed={current === v}
              onClick={() => answer(v as Answer)}
            >
              <Pips score={v} max={2} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sc-nav">
        <button type="button" className="sc-back" onClick={() => goTo(step - 1)} disabled={step === 0}>
          <Arrow dir="left" /> {copy.back}
        </button>
        {current !== null ? (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => (isLast ? finish(answers as Answer[]) : goTo(step + 1))}
          >
            <span>{nextLabel}</span>
            <Arrow />
          </button>
        ) : null}
      </div>
      <p className="t-label sc-privacy">{copy.privacy}</p>
    </div>
  )
}

function Result({
  answers,
  copy,
  camps,
  shareUrl,
  subscribe,
  onRetake,
  headRef,
}: {
  answers: Answer[]
  copy: ScorecardCopy
  camps: readonly ScorecardCamp[]
  shareUrl: string
  subscribe?: ReactNode
  onRetake: () => void
  headRef: RefObject<HTMLHeadingElement | null>
}) {
  const r = scoreAnswers(answers)
  const stall = camps.find((c) => c.id === r.stall)!
  const recon = `/contact?type=engagement${r.summit ? '' : `&stuck=${STALL_TO_STUCK[r.stall]}`}&source=scorecard`
  const walked = (CAMP_X[4] * r.total) / 20
  const pins = camps.map((c, i) => ({
    id: c.id,
    n: c.n,
    hue: c.hue,
    state: r.camps[i].state,
    tag: !r.summit && c.id === r.stall ? copy.stallH : undefined,
  }))

  return (
    <div className="sc-panel sc-result" data-view="result">
      <div className="sc-res-top">
        <div className="sc-res-alt">
          <h2 className="t-label sc-res-k" tabIndex={-1} ref={headRef}>
            {copy.resultH}
          </h2>
          <p className="sc-res-num">
            <Ticker value={r.altitude} from={ALT_MIN} />
            <span className="sc-res-unit">M</span>
          </p>
          <p className="t-label sc-res-of" aria-hidden="true">
            {fmt(ALT_MIN)} M · {fmt(ALT_MAX)} M
          </p>
        </div>

        <div className="sc-res-stall" style={{ '--hue': stall.hue } as CSSProperties}>
          {r.summit ? (
            <p className="t-h3 sc-res-name">{copy.summit}</p>
          ) : (
            <>
              <p className="t-label sc-res-k">{copy.stallH}</p>
              <p className="t-h3 sc-res-name">
                Camp {pad(stall.n)} · {stall.name}
              </p>
              <p className="sc-res-hazard">{stall.hazard}</p>
            </>
          )}
          <div className="sc-res-cta">
            {/* The page's lead action once there is a result: a plain primary button (no Icon import keeps the island small). */}
            <Link href={recon} className="btn btn-lg" data-magnetic="">
              <span>{copy.cta}</span>
              <Arrow />
            </Link>
            <p className="t-small sc-res-ctaline">{copy.ctaLine}</p>
          </div>
          {r.summit ? null : (
            <Link href={`/method#${stall.id}`} className="link-go">
              {copy.campLink} <Arrow />
            </Link>
          )}
        </div>
      </div>

      <div className="sc-res-map">
        <Profile
          walked={walked}
          pins={pins}
          marker={<span className="sc-you-dot" data-still="" />}
        />
        <ol className="sc-camps">
          {camps.map((c, i) => {
            const s = r.camps[i]
            return (
              <li
                key={c.id}
                className="sc-campres"
                data-state={s.state}
                data-stall={!r.summit && c.id === r.stall ? '' : undefined}
                style={{ '--hue': c.hue, '--i': i } as CSSProperties}
              >
                <span className="t-label sc-campres-k">
                  <span className="tnum">{pad(c.n)}</span> · {c.name}
                </span>
                <span className="sc-campres-state">{copy.states[s.state]}</span>
                <Pips score={s.score} max={4} />
                <span className="sr-only">
                  {s.score}/4
                </span>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="sc-tools">
        <CopyButton text={`${shareUrl}#r=${encodeAnswers(answers)}`} label={copy.share} done={copy.copied} />
        <button type="button" className="sc-back" onClick={onRetake}>
          <Arrow dir="left" /> {copy.retake}
        </button>
      </div>

      {subscribe ? <div className="sc-sub">{subscribe}</div> : null}
      <p className="t-label sc-privacy">{copy.privacy}</p>
    </div>
  )
}
