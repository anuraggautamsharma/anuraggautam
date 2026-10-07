'use client'

import { useEffect, useRef, useState } from 'react'

type Format = { key: string; label: string; text: string }

/**
 * Each citation line is its own block with a hanging indent at the start of its value
 * (`  title        = {` → the wrap continues under the value), so long BibTeX fields wrap
 * on a phone instead of running off the edge, and still read as aligned columns.
 */
function hang(line: string) {
  const m = /^\s*[\w-]+\s*=\s*\{?/.exec(line)
  return m ? m[0].length : line.length - line.trimStart().length
}

/**
 * "Cite this": APA and BibTeX, each with a copy button, plus a copy-link button.
 * The citation text is server-rendered in <pre>, so it is selectable without JS.
 */
export function CiteBlock({ formats, url, linkToast }: { formats: Format[]; url: string; linkToast: string }) {
  const [toast, setToast] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy(text: string, message: string) {
    let ok = false
    try {
      await navigator.clipboard.writeText(text)
      ok = true
    } catch {
      // Clipboard API blocked (insecure context, permissions): fall back to a hidden textarea.
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        ok = document.execCommand('copy')
      } catch {
        ok = false
      }
      ta.remove()
    }
    setToast(ok ? message : 'Copy failed. Select the text and copy it by hand.')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(''), 4000)
  }

  return (
    <div className="wr-cite">
      {formats.map((f) => (
        <div key={f.key} className="wr-cite-row" data-format={f.key}>
          <div className="wr-cite-head">
            <span className="t-label t-muted">{f.label}</span>
            <button type="button" className="wr-copy" onClick={() => copy(f.text, `${f.label} citation copied.`)}>
              Copy <span className="sr-only">{f.label} citation</span>
            </button>
          </div>
          <pre className="wr-cite-text" data-lenis-prevent tabIndex={0}>
            {f.text.split('\n').map((line, i) => (
              <span key={i} className="wr-cite-line" style={{ '--hang': `${hang(line)}ch` } as React.CSSProperties}>
                {line}
              </span>
            ))}
          </pre>
        </div>
      ))}
      <div className="wr-cite-link">
        <span className="t-label t-muted wr-cite-url">{url.replace(/^https:\/\//, '')}</span>
        <button type="button" className="wr-copy" onClick={() => copy(url, linkToast)}>
          Copy link
        </button>
      </div>
      <p className="wr-toast t-label" role="status" aria-live="polite" data-show={toast ? '' : undefined}>
        {toast}
      </p>
    </div>
  )
}
