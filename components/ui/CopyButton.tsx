'use client'

import { useEffect, useRef, useState } from 'react'

/** Copies a fixed string. Status is announced through a polite live region. */
export function CopyButton({
  text,
  label = 'Copy',
  done = 'Copied',
  className = 'btn btn-secondary btn-sm',
}: {
  text: string
  label?: string
  done?: string
  className?: string
}) {
  const [status, setStatus] = useState<'idle' | 'done' | 'failed'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setStatus('done')
    } catch {
      setStatus('failed')
    }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setStatus('idle'), 2400)
  }

  return (
    <>
      <button type="button" className={className} onClick={copy}>
        {status === 'done' ? done : label}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {status === 'done' ? done : status === 'failed' ? 'Copy failed. Select the text and copy it manually.' : ''}
      </span>
    </>
  )
}
