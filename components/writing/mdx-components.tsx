import Link from 'next/link'
import clsx from 'clsx'
import type { MDXComponents } from 'mdx/types'
import { Sidenote } from './Sidenote'

type TocItem = { depth: number; text: string; id: string }

const pad2 = (n: number) => String(n).padStart(2, '0')

/** "§ 03" for the nth H2 of an article (1-based), shared by the headings and the TOC. */
export const sectionLabel = (n: number) => `§ ${pad2(n)}`

// Numeric-looking cells (figures, money, ranges, percentages) right-align in tables.
const NUMERIC = /^[\s$€£₹~≈<>+\-−–—%.,:/×x\d]*\d[\s$€£₹~≈<>+\-−–—%.,:/×xkKmMbB\d]*$/
const isNumeric = (children: React.ReactNode) => typeof children === 'string' && NUMERIC.test(children.trim())

function Anchor({ href = '', children, ...rest }: React.ComponentPropsWithoutRef<'a'>) {
  if (href.startsWith('/')) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    )
  }
  if (href.startsWith('#')) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    )
  }
  return (
    <a href={href} rel="noopener" {...rest}>
      {children}
    </a>
  )
}

/** Wide pull quote with a 2px orange top rule. Usage: <PullQuote>Line.</PullQuote> */
export function PullQuote({ children, cite }: { children: React.ReactNode; cite?: string }) {
  return (
    <figure className="wide wr-pull">
      <blockquote>
        <p>{children}</p>
      </blockquote>
      {cite ? <figcaption className="t-label t-muted">{cite}</figcaption> : null}
    </figure>
  )
}

/** Figure on a surface panel with a "FIG. 0n ·" caption. Usage: <Figure caption="…" wide>…</Figure> */
export function Figure({
  children,
  caption,
  wide,
  full,
}: {
  children: React.ReactNode
  caption: string
  wide?: boolean
  full?: boolean
}) {
  return (
    <figure className={clsx('wr-fig', wide && 'wide', full && 'full')}>
      <div className="wr-fig-body">
        {children}
      </div>
      <figcaption className="wr-fig-cap">{caption}</figcaption>
    </figure>
  )
}

/** Boxed aside with a mono label. Usage: <Callout label="Mnemonic">…</Callout> */
export function Callout({ children, label = 'Note' }: { children: React.ReactNode; label?: string }) {
  return (
    <aside className="wr-callout" aria-label={label}>
      <p className="t-label wr-callout-label">{label}</p>
      <div className="wr-callout-body">{children}</div>
    </aside>
  )
}

/**
 * Element and component map for <MDXContent>. Built per article so each H2 gets its
 * "§ 0n" from the article's TOC (rehype-slug and the TOC share github-slugger ids).
 */
export function mdxComponents(toc: TocItem[]): MDXComponents {
  const h2Ids = toc.filter((t) => t.depth === 2).map((t) => t.id)
  let fallback = 0

  return {
    h2: ({ id, children, ...rest }: React.ComponentPropsWithoutRef<'h2'>) => {
      const i = id ? h2Ids.indexOf(id) : -1
      const n = i >= 0 ? i + 1 : h2Ids.length + ++fallback
      return (
        <h2 id={id} {...rest}>
          <span className="wr-h2-n" aria-hidden="true">
            {sectionLabel(n)}
          </span>
          {children}
        </h2>
      )
    },
    a: Anchor,
    pre: ({ children, ...rest }: React.ComponentPropsWithoutRef<'pre'>) => (
      <pre {...rest} data-lenis-prevent tabIndex={0}>
        {children}
      </pre>
    ),
    table: ({ children, ...rest }: React.ComponentPropsWithoutRef<'table'>) => (
      <div className="wr-table" role="region" aria-label="Table" tabIndex={0} data-lenis-prevent>
        <table {...rest}>{children}</table>
      </div>
    ),
    td: ({ children, className, ...rest }: React.ComponentPropsWithoutRef<'td'>) => (
      <td className={clsx(className, isNumeric(children) && 'wr-num') || undefined} {...rest}>
        {children}
      </td>
    ),
    img: ({ alt = '', ...rest }: React.ComponentPropsWithoutRef<'img'>) => (
      // eslint-disable-next-line @next/next/no-img-element -- MDX images have no known dimensions at build time
      <img alt={alt} loading="lazy" decoding="async" {...rest} />
    ),
    hr: () => <hr className="wr-hr" />,
    PullQuote,
    Figure,
    Callout,
    Sidenote,
  }
}
