import { Fragment, type CSSProperties } from 'react'
import './MaskWords.css'

/**
 * Splits a headline into per-word masks for `.reveal-lines`. Words (not fixed lines) keep
 * the browser's own wrapping and `text-wrap: balance`, so the rise reads line by line at
 * every width without measuring. The text stays one run of real HTML for crawlers.
 */
export function MaskWords({ text }: { text: string }) {
  // Split on U+0020 only: a no-break space in the copy keeps its pair inside one mask.
  const words = text.split(' ').filter(Boolean)
  return (
    <>
      {words.map((word, i) => (
        <Fragment key={i}>
          <span className="mask mw">
            <span style={{ '--i': i } as CSSProperties}>{word}</span>
          </span>
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </>
  )
}
