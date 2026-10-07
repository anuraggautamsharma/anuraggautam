import { glance, pages } from '@/lib/site'

/** Mono keys, short values: the facts a skimmer wants, beside the bio. A ruled list, like every other. */
export function AtAGlance() {
  return (
    <aside className="a-glance" aria-labelledby="a-glance-title">
      <h3 id="a-glance-title" className="t-label a-glance-title">
        {pages.about.bio.glanceLabel}
      </h3>
      <ul className="rule-list a-glance-list">
        {glance.map((row) => (
          <li key={row.k}>
            <span className="a-glance-k">{row.k}</span>
            <span className="t-small a-glance-v">{row.v}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
