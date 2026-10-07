'use client'

import { useActionState, useEffect, useId, useRef } from 'react'
import { subscribe, type SubscribeState } from '@/app/subscribe/actions'

export type SubscribeFormCopy = {
  label: string
  cta: string
  sending: string
  sent: string
  emailLabel: string
  placeholder: string
  roleLabel?: string
  roles?: string[]
  buildingLabel?: string
  buildingMax: number
  eventsLabel?: string
}

const INITIAL: SubscribeState = { status: 'idle' }

/**
 * The only client JS in the subscribe system (kept small: every string arrives as a prop, so
 * lib/site.ts never enters the bundle). A plain <form action> underneath, so it posts without JS.
 */
export function SubscribeForm({
  copy,
  intent,
  source,
  t0,
  btn,
}: {
  copy: SubscribeFormCopy
  intent: string
  source: string
  /** Server render time: the min-fill floor when JS never runs. Replaced by the visitor's clock on mount. */
  t0: number
  btn: string
}) {
  const [state, action, pending] = useActionState(subscribe, INITIAL)
  const uid = useId()
  const t0Ref = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const doneRef = useRef<HTMLParagraphElement>(null)
  const failed = state.status === 'invalid' || state.status === 'error' || state.status === 'unconfigured'

  useEffect(() => {
    if (t0Ref.current) t0Ref.current.value = String(Date.now())
  }, [])

  useEffect(() => {
    if (state.status === 'sent') doneRef.current?.focus()
    else if (state.status === 'invalid') emailRef.current?.focus()
  }, [state])

  if (state.status === 'sent') {
    return (
      <div className="sb-done">
        {/* A route line climbs left to right and plants a flag (CSS; reduced motion shows the end). */}
        <svg className="sb-trail" viewBox="0 0 240 44" aria-hidden="true" focusable="false">
          <path className="sb-trail-base" d="M2 40H238" />
          <path className="sb-trail-route" pathLength={1} d="M2 38 30 35 52 27 74 30 100 20 126 23 152 13 176 16 204 6" />
          <g className="sb-trail-flag">
            <path d="M204 6V-8" className="sb-trail-pole" />
            <path d="M204 -8 216 -4.5 204 -1z" className="sb-trail-cloth" />
          </g>
        </svg>
        <p ref={doneRef} tabIndex={-1} role="status" className="sb-done-msg">
          {state.message ?? copy.sent}
        </p>
      </div>
    )
  }

  const errId = `${uid}-err`
  const extras = Boolean(copy.roles || copy.buildingLabel)

  return (
    <form
      action={action}
      noValidate
      aria-label={copy.label}
      className="sb-form"
      onSubmit={(e) => {
        // Submit time on the same clock as t0, so a skewed visitor clock can't trip the time-trap.
        const t1 = e.currentTarget.elements.namedItem('t1')
        if (t1 instanceof HTMLInputElement) t1.value = String(Date.now())
      }}
    >
      <div className="sb-grid" data-extras={extras || undefined}>
        <input
          ref={emailRef}
          type="email"
          name="email"
          required
          defaultValue={state.email ?? ''}
          aria-label={copy.emailLabel}
          placeholder={copy.placeholder}
          autoComplete="email"
          inputMode="email"
          enterKeyHint="send"
          spellCheck={false}
          autoCapitalize="none"
          maxLength={254}
          aria-invalid={state.status === 'invalid' || undefined}
          aria-describedby={failed ? errId : undefined}
          className="sb-input sb-email"
        />
        {copy.roles ? (
          <select name="role" defaultValue="" aria-label={copy.roleLabel} className="sb-input sb-select" data-wb-exclude="">
            <option value="">{copy.roleLabel}</option>
            {copy.roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : null}
        {copy.buildingLabel ? (
          <input
            type="text"
            name="building"
            aria-label={copy.buildingLabel}
            placeholder={copy.buildingLabel}
            maxLength={copy.buildingMax}
            autoComplete="off"
            enterKeyHint="send"
            className="sb-input sb-building"
          />
        ) : null}
        <button type="submit" className={btn} disabled={pending} aria-disabled={pending || undefined}>
          <span>{pending ? copy.sending : copy.cta}</span>
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <path d="M3 12h17M14 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      {copy.eventsLabel ? (
        <label className="sb-check t-small">
          <input type="checkbox" name="events" />
          <span>{copy.eventsLabel}</span>
        </label>
      ) : null}

      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="source" value={source} />
      <input ref={t0Ref} type="hidden" name="t0" defaultValue={t0} />
      <input type="hidden" name="t1" defaultValue="" />
      <div className="sb-hp" aria-hidden="true" data-wb-exclude="">
        <label>
          Company website
          <input type="text" name="company_website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <p id={errId} role="alert" className="sb-msg t-small">
        {failed ? state.message : null}
      </p>
    </form>
  )
}
