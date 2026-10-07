import { Icon } from '@/components/ui/icons'
import './faq.css'

/**
 * Native <details> Q&A. Every answer is in the DOM (crawlable, and the same array feeds the
 * FAQPage JSON-LD). Only the marker turns and the answer fades in: no height animation.
 */
export function FaqList({ items, idPrefix }: { items: readonly { q: string; a: string }[]; idPrefix: string }) {
  return (
    <div className="faq">
      {items.map((f, i) => (
        <details key={f.q} className="faq-item" id={`${idPrefix}-${i + 1}`}>
          <summary className="faq-q">
            <span className="t-label tnum faq-n" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="t-h4 faq-qt">{f.q}</span>
            <span className="faq-mark" aria-hidden="true">
              <Icon name="chevron" size={20} />
            </span>
          </summary>
          <div className="faq-a">
            <p className="t-body">{f.a}</p>
          </div>
        </details>
      ))}
    </div>
  )
}
