import { serif, serifItalic } from './fonts'
import '@/components/writing/writing.css'
import '@/components/writing/prose.css'

// /writing/** only: loads Newsreader and the writing stylesheets. Light only; the page
// heroes and article headers carry the section's identity, so there is no edition bar.
export default function WritingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${serif.variable} wr-root`} style={{ '--ff-serif-italic': serifItalic } as React.CSSProperties}>
      {children}
    </div>
  )
}
