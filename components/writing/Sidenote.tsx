'use client'

import { useId, useState } from 'react'

/**
 * Tufte sidenote. The note sits inline in the paragraph (crawlers and screen readers read
 * it in flow). From 75rem it floats into the margin column; below that it is a numbered
 * toggle that opens the note under the line. Numbering is a CSS counter, so MDX authors
 * just write <Sidenote>…</Sidenote> mid-sentence.
 */
export function Sidenote({ children }: { children: React.ReactNode }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  return (
    // The wrapper carries the CSS counter, so the numeral matches whichever marker is visible.
    <span className="wr-sn-wrap">
      {/* Wide screens: a plain superscript numeral; the note is already visible in the margin. */}
      <span className="wr-sn-mark" aria-hidden="true" />
      <button
        type="button"
        className="wr-sn-ref"
        aria-expanded={open}
        aria-controls={id}
        aria-label="Sidenote"
        onClick={() => setOpen((o) => !o)}
      />
      <span id={id} className="sidenote wr-sn" data-open={open || undefined} role="note">
        {children}
      </span>
    </span>
  )
}
