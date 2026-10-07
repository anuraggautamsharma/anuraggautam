'use client'

import { useSyncExternalStore } from 'react'
import { osReducedMotion, setMotion, subscribeMotionPref } from './motionPref'

type State = 'on' | 'off' | 'system'

function getSnapshot(): State {
  if (document.documentElement.dataset.motion === 'reduced') return 'off'
  return osReducedMotion() ? 'system' : 'on'
}
const getServerSnapshot = (): State => 'on'

/**
 * Footer switch "Motion: on / off". Writes html[data-motion="reduced"] and localStorage
 * 'ag-motion', then dispatches 'ag-motion-change' for the runtime. When the OS asks for
 * reduced motion the site already honours it, so the switch shows OFF · SYSTEM and stays put.
 */
export function MotionToggle({ className }: { className?: string }) {
  const state = useSyncExternalStore(subscribeMotionPref, getSnapshot, getServerSnapshot)
  const on = state === 'on'
  const locked = state === 'system'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-disabled={locked || undefined}
      aria-describedby={locked ? 'ft-motion-sys' : undefined}
      className={className ? `ft-toggle ${className}` : 'ft-toggle'}
      onClick={() => {
        if (!locked) setMotion(!on)
      }}
    >
      <span>Motion:</span>
      <span className="ft-opt" data-on={on ? '' : undefined} aria-hidden="true">
        on
      </span>
      <span aria-hidden="true">/</span>
      <span className="ft-opt" data-on={on ? undefined : ''} aria-hidden="true">
        off
      </span>
      {locked ? <span aria-hidden="true">· system</span> : null}
      {locked ? (
        <span id="ft-motion-sys" hidden>
          Reduced by your system setting
        </span>
      ) : null}
    </button>
  )
}
