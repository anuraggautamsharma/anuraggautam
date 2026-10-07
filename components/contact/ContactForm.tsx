'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef } from 'react'
import { track } from '@vercel/analytics'
import { submitWorkOrder } from '@/app/contact/actions'
import { pages } from '@/lib/site'
import { CopyButton } from '@/components/ui/CopyButton'
import {
  FIELD_ORDER,
  TYPE_LABELS,
  TYPE_VALUES,
  type Prefill,
  STAGE_LABELS,
  STAGE_VALUES,
  STUCK_LABELS,
  STUCK_VALUES,
  TIMELINE_LABELS,
  TIMELINE_VALUES,
  type Field,
  type Route,
  type Stage,
  type Stuck,
  type Timeline,
  type WorkOrderState,
  type WorkOrderValues,
} from './options'
import './contact.css'

export type Essay = { title: string; href: string; docNo?: string }

type Props = {
  email: string
  calLink: string | null
  essays: Essay[]
  /** Validated `?type`, `?stuck` and `?source` from the page. */
  prefill?: Prefill
  /** Show the optional "Also send me Field Notes" box (only when email sign-up actually works). */
  notesReady?: boolean
}

const NO_PREFILL: Prefill = { type: 'engagement', stuck: [], source: null }
const TYPES = pages.contact.types

const INITIAL: WorkOrderState = { status: 'idle' }

const COPY = {
  submit: pages.contact.submit.idle,
  pending: pages.contact.submit.pending,
  ...pages.contact.states,
}

const FIELD_NAMES: Record<Field, string> = {
  name: 'Your name',
  email: 'Work email',
  company_url: 'Company website',
  sell: 'What you built',
  stuck: 'Where the climb is stuck',
  stage: 'Stage',
  timeline: 'Timing',
}

const fieldId = (f: Field) => `wo-${f.replace('_', '-')}`
const describedBy = (...ids: (string | false | undefined)[]) => ids.filter(Boolean).join(' ') || undefined

/** Client-side copy of the answers for a failed send, so nothing typed is lost. */
function draftSummary(v: WorkOrderValues) {
  const label = <K extends string>(map: Record<K, string>, key?: string) =>
    key && key in map ? map[key as K] : key || 'Not specified'
  const stuck = (v.stuck ?? []).map((s) => label<Stuck>(STUCK_LABELS, s))
  return [
    `Name: ${v.name || ''}`,
    `Email: ${v.email || ''}`,
    `Company: ${v.company_url || ''}`,
    `Built: ${v.sell || ''}`,
    `Stuck: ${stuck.length ? stuck.join(', ') : 'Not specified'}`,
    `Stage: ${label<Stage>(STAGE_LABELS, v.stage)}`,
    `Timing: ${label<Timeline>(TIMELINE_LABELS, v.timeline)}`,
  ].join('\n')
}

/**
 * Six questions and a Server Action. Values survive a failed submission because the action
 * echoes them back and React resets the form to those defaults.
 */
export function ContactForm({ email, calLink, essays, prefill = NO_PREFILL, notesReady = false }: Props) {
  const [state, formAction, pending] = useActionState(submitWorkOrder, INITIAL)
  const formRef = useRef<HTMLFormElement>(null)
  const resultRef = useRef<HTMLHeadingElement>(null)
  const alertRef = useRef<HTMLDivElement>(null)

  // Move focus to whatever the submission produced.
  useEffect(() => {
    if (state.status === 'idle') return
    if (state.status === 'sent' || state.status === 'unsent') {
      if (state.status === 'sent') track('workorder_submitted', { source: prefill.source ?? 'contact', type: state.type })
      resultRef.current?.focus()
      return
    }
    if (state.status === 'invalid') {
      const first = FIELD_ORDER.find((f) => state.errors[f])
      const target = first ? formRef.current?.querySelector<HTMLElement>(`[data-focus="${first}"]`) : null
      target?.focus()
      return
    }
    alertRef.current?.focus()
  }, [state, prefill.source])

  if (state.status === 'sent' || state.status === 'unsent') {
    return <Result state={state} email={email} calLink={calLink} essays={essays} headingRef={resultRef} />
  }

  const values: WorkOrderValues = 'values' in state ? state.values : {}
  const type = values.type ?? prefill.type
  const stuckChecked = values.stuck ?? prefill.stuck
  const errors: Partial<Record<Field, string>> = state.status === 'invalid' ? state.errors : {}
  const errorFields = FIELD_ORDER.filter((f) => errors[f])
  const hasAlert = errorFields.length > 0 || state.status === 'blocked' || state.status === 'failed'

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      className="wo-form"
      onSubmit={(e) => {
        // Submit time on the same clock as t0, so a skewed visitor clock can't trip the time-trap.
        const t1 = e.currentTarget.elements.namedItem('t1')
        if (t1 instanceof HTMLInputElement) t1.value = String(Date.now())
      }}
    >
      <fieldset className="wo-q wo-type">
        <legend className="wo-head">
          <span className="field-label">{TYPES.label}</span>
        </legend>
        <div className="wo-chips wo-type-chips">
          {TYPE_VALUES.map((v) => (
            <label key={v} className="chip">
              <input type="radio" name="type" value={v} defaultChecked={type === v} />
              {TYPE_LABELS[v]}
            </label>
          ))}
        </div>
      </fieldset>
      {prefill.source ? <input type="hidden" name="source" value={prefill.source} /> : null}

      <p className="t-small wo-intro">
        All fields <span className="wo-eng-only">except 05 </span>are required.
      </p>

      <div
        id="wo-alert"
        ref={alertRef}
        tabIndex={-1}
        role="alert"
        className="wo-alert"
        data-show={hasAlert || undefined}
      >
        {errorFields.length > 0 ? (
          <>
            <p className="t-label">{errorFields.length === 1 ? 'One thing to fix' : `${errorFields.length} things to fix`}</p>
            <ul className="wo-alert-list t-small">
              {errorFields.map((f) => (
                <li key={f}>
                  <a href={`#${fieldId(f)}`} className="link">
                    {FIELD_NAMES[f]}
                  </a>
                  : {errors[f]}
                </li>
              ))}
            </ul>
          </>
        ) : state.status === 'blocked' ? (
          <p className="t-small">
            That was faster than a person types, so nothing was sent. Give it a few seconds and try again, or email{' '}
            <a href={`mailto:${email}`} className="link">
              {email}
            </a>
            .
          </p>
        ) : state.status === 'failed' ? (
          <>
            <p className="t-h4">{COPY.failed}</p>
            <div className="wo-actions">
              <a href={`mailto:${email}`} className="btn">
                Email me
              </a>
              <CopyButton
                text={draftSummary(state.values)}
                label="Copy answers"
                done="Answers copied"
                className="btn btn-secondary"
              />
            </div>
          </>
        ) : null}
      </div>

      <TextField
        n="01"
        field="name"
        label="Your name"
        hint="First name is fine."
        autoComplete="name"
        defaultValue={values.name}
        error={errors.name}
        maxLength={120}
      />
      <TextField
        n="02"
        field="email"
        label="Work email"
        type="email"
        inputMode="email"
        autoComplete="email"
        defaultValue={values.email}
        error={errors.email}
        maxLength={254}
      />
      <TextField
        n="03"
        field="company_url"
        label="Company website"
        inputMode="url"
        autoComplete="url"
        placeholder="e.g. yourcompany.ai"
        defaultValue={values.company_url}
        error={errors.company_url}
        maxLength={300}
      />
      <TextField
        n="04"
        field="sell"
        label={
          <>
            <span className="wo-eng-only">What did you build, in one line?</span>
            <span className="wo-other-only">What&rsquo;s it about, in one line?</span>
          </>
        }
        placeholder="e.g. Robots that unload trucks for 3PLs"
        defaultValue={values.sell}
        error={errors.sell}
        maxLength={280}
      />

      <fieldset
        id={fieldId('stuck')}
        className="wo-q wo-eng-only"
        aria-describedby={errors.stuck ? 'wo-stuck-err' : undefined}
      >
        <legend className="wo-head">
          <Num n="05" />
          <span className="field-label">
            Where&rsquo;s the climb stuck? <span className="wo-optional">(optional)</span>
          </span>
        </legend>
        <div className="wo-chips">
          {STUCK_VALUES.map((v, i) => (
            <label key={v} className="chip">
              <input
                type="checkbox"
                name="stuck"
                value={v}
                defaultChecked={stuckChecked.includes(v)}
                data-focus={i === 0 ? 'stuck' : undefined}
              />
              {STUCK_LABELS[v]}
            </label>
          ))}
        </div>
        {errors.stuck ? <ErrorLine id="wo-stuck-err" text={errors.stuck} /> : null}
      </fieldset>

      <div className="wo-q wo-eng-only" role="group" aria-labelledby="wo-06">
        <p id="wo-06" className="wo-head">
          <Num n="06" />
          <span className="field-label">Stage and timing</span>
        </p>
        <ChipRadios
          field="stage"
          legend="Stage"
          options={STAGE_VALUES.map((v) => ({ value: v, label: STAGE_LABELS[v] }))}
          checked={values.stage}
          error={errors.stage}
        />
        <ChipRadios
          field="timeline"
          legend="Timing"
          options={TIMELINE_VALUES.map((v) => ({ value: v, label: TIMELINE_LABELS[v] }))}
          checked={values.timeline}
          error={errors.timeline}
        />
      </div>

      {/* Bot traps: an off-screen honeypot and the time the form became interactive. */}
      <div className="wo-hp" aria-hidden="true">
        <label htmlFor="wo-hp">Company website (leave this empty)</label>
        <input id="wo-hp" type="text" name="company_website" tabIndex={-1} autoComplete="off" />
      </div>
      <input
        type="hidden"
        name="t0"
        ref={(el) => {
          if (el && !el.value) el.value = String(Date.now())
        }}
      />
      <input type="hidden" name="t1" />

      {notesReady ? (
        <label className="wo-notes">
          <input type="checkbox" name="also_notes" defaultChecked={values.also_notes === true} />
          <span className="wo-notes-box" aria-hidden="true" />
          <span className="wo-notes-text">{TYPES.alsoNotes}</span>
        </label>
      ) : null}

      <div className="wo-submit">
        <button
          type="submit"
          className="btn btn-lg"
          aria-disabled={pending || undefined}
          onClick={(e) => {
            if (pending) e.preventDefault()
          }}
        >
          {pending ? COPY.pending : COPY.submit}
          {pending ? null : <SubmitArrow />}
        </button>
        <span className="sr-only" role="status">
          {pending ? COPY.pending : ''}
        </span>
      </div>
    </form>
  )
}

function Num({ n }: { n: string }) {
  return (
    <span className="wo-num t-label tnum" aria-hidden="true">
      {n}
    </span>
  )
}

function SubmitArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  )
}

function ErrorLine({ id, text }: { id: string; text: string }) {
  return (
    <p id={id} className="field-error">
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path d="M8 1.5 15 14.5H1z" fill="currentColor" />
        <path d="M8 6v4M8 11.5v1.5" stroke="var(--danger-bg)" strokeWidth="1.6" />
      </svg>
      {text}
    </p>
  )
}

function TextField({
  n,
  field,
  label,
  type = 'text',
  inputMode,
  autoComplete,
  placeholder,
  hint,
  defaultValue,
  error,
  maxLength,
}: {
  n: string
  field: Exclude<Field, 'stuck' | 'stage' | 'timeline'>
  label: React.ReactNode
  type?: 'text' | 'email'
  inputMode?: 'text' | 'email' | 'url'
  autoComplete?: string
  placeholder?: string
  hint?: string
  defaultValue?: string
  error?: string
  maxLength?: number
}) {
  const id = fieldId(field)
  return (
    <div className="field wo-q">
      <label htmlFor={id} className="wo-head">
        <Num n={n} />
        <span className="field-label">{label}</span>
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
      <input
        id={id}
        name={field}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        defaultValue={defaultValue}
        maxLength={maxLength}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hint && `${id}-hint`, error && `${id}-err`)}
        className="input"
        data-focus={field}
        spellCheck={field === 'sell' || field === 'name' ? undefined : false}
        autoCapitalize={field === 'email' || field === 'company_url' ? 'none' : undefined}
      />
      {error ? <ErrorLine id={`${id}-err`} text={error} /> : null}
    </div>
  )
}

function ChipRadios({
  field,
  legend,
  options,
  checked,
  error,
}: {
  field: 'stage' | 'timeline'
  legend: string
  options: { value: string; label: string }[]
  checked?: string
  error?: string
}) {
  const id = fieldId(field)
  return (
    <fieldset
      id={id}
      className="wo-sub"
      role="radiogroup"
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-err` : undefined}
    >
      <legend className="t-label">{legend}</legend>
      <div className="wo-chips">
        {options.map((o, i) => (
          <label key={o.value} className="chip">
            <input
              type="radio"
              name={field}
              value={o.value}
              defaultChecked={checked === o.value}
              required
              data-focus={i === 0 ? field : undefined}
            />
            {o.label}
          </label>
        ))}
      </div>
      {error ? <ErrorLine id={`${id}-err`} text={error} /> : null}
    </fieldset>
  )
}

function calSrc(calLink: string) {
  const u = new URL(/^https?:\/\//.test(calLink) ? calLink : `https://cal.com/${calLink.replace(/^\//, '')}`)
  u.searchParams.set('embed', 'true')
  u.searchParams.set('theme', 'light')
  return u.href
}

function GoLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="link-go">
      {children}
      <SubmitArrow />
    </Link>
  )
}

function Result({
  state,
  email,
  calLink,
  essays,
  headingRef,
}: {
  state: Extract<WorkOrderState, { status: 'sent' } | { status: 'unsent' }>
  email: string
  calLink: string | null
  essays: Essay[]
  headingRef: React.RefObject<HTMLHeadingElement | null>
}) {
  const route: Route = state.route

  if (state.status === 'unsent') {
    return (
      <section className="wo-result" data-state="unsent" aria-labelledby="wo-result" role="alert">
        <p className="t-label wo-stamp">Not sent</p>
        <h2 id="wo-result" ref={headingRef} tabIndex={-1} className="t-h3">
          {COPY.failed}
        </h2>
        <pre className="wo-summary">{state.summary}</pre>
        <div className="wo-actions">
          <a href={`mailto:${email}`} className="btn">
            Email me
            <SubmitArrow />
          </a>
          <CopyButton text={state.summary} label="Copy answers" done="Answers copied" className="btn btn-secondary" />
        </div>
      </section>
    )
  }

  // Only a GTM engagement is routed; every other type is simply received.
  const isEngagement = state.type === 'engagement'
  const showCal = isEngagement && route === 'fit' && Boolean(calLink)
  const heading = !isEngagement ? COPY.fit : route === 'not-fit' ? COPY.notFit : route === 'maybe' ? COPY.maybe : COPY.fit

  return (
    <section className="wo-result" data-state={route} aria-labelledby="wo-result" role="status">
      <span className="wo-flag" aria-hidden="true" />
      <p className="t-label wo-stamp">{pages.contact.stamp}</p>
      <h2 id="wo-result" ref={headingRef} tabIndex={-1} className="t-h3">
        {heading}
      </h2>
      {!isEngagement ? null : route === 'not-fit' ? (
        <>
          <div className="wo-actions">
            <Link href="/community#join" className="btn">
              {COPY.notFitCta}
              <SubmitArrow />
            </Link>
          </div>
          {essays.length > 0 ? (
            <ul className="wo-essays">
              {essays.map((e) => (
                <li key={e.href}>
                  <Link href={e.href} className="wo-essay">
                    <span className="t-h4">{e.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <GoLink href="/subscribe">{COPY.notFitNotes}</GoLink>
        </>
      ) : route === 'maybe' ? (
        <GoLink href="/method">The Summit Route</GoLink>
      ) : showCal && calLink ? (
        <>
          <iframe className="wo-cal" src={calSrc(calLink)} title="Pick a time for the fit call" loading="lazy" />
          <p className="t-small">
            Calendar not loading?{' '}
            <a href={calSrc(calLink)} className="link">
              Open it on Cal.com
            </a>
            .
          </p>
        </>
      ) : null}
    </section>
  )
}
