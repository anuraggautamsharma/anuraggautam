import { aboutQa, pages } from '@/lib/site'
import { Section } from '@/components/ui/Section'
import { FaqList } from '@/components/method/FaqList'

export function AboutQa() {
  return (
    <Section id="answers" tone="paper" className="a-qa" labelledBy="a-qa-title">
      <div className="wrap cols a-qa-grid">
        <h2 id="a-qa-title" className="t-h2 a-qa-title reveal">
          {pages.about.qa.h2}
        </h2>
        <div className="a-qa-list">
          <FaqList items={aboutQa} idPrefix="qa" />
        </div>
      </div>
    </Section>
  )
}
