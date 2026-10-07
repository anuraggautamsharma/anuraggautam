import { methodFaqs, pages } from '@/lib/site'
import { Section } from '@/components/ui/Section'
import { FaqList } from './FaqList'

export function MethodFaq() {
  return (
    <Section id="faq" tone="paper" className="m-faq" labelledBy="m-faq-title">
      <div className="wrap cols m-faq-grid">
        <h2 id="m-faq-title" className="t-h2 m-faq-title reveal">
          {pages.method.faq.h2}
        </h2>
        <div className="m-faq-list">
          <FaqList items={methodFaqs} idPrefix="faq" />
        </div>
      </div>
    </Section>
  )
}
