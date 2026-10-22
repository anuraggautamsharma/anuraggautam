import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import { portraitCutout } from '@/lib/photos'
import './hello.css'

const title = 'Anurag Gautam | Product designer and go-to-market for complex technology'
const description =
  'Anurag Gautam: product designer turned go-to-market leader. Founding GTM Lead at VideoDB; co-founded Suggaa, founded Zecway and The Pipeline Lab.'

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: '/' },
  openGraph: { type: 'profile', url: '/', siteName: 'Anurag Gautam', title, description },
  twitter: { title, description },
}

const WORK: { org: string; role: string; fact: string; when: string }[] = [
  { org: 'VideoDB', role: 'Founding GTM Lead', fact: 'Taking AI video infrastructure to market.', when: 'Now' },
  { org: 'The Pipeline Lab', role: 'Founder', fact: 'GTM for 45–50 companies. 500+ qualified meetings, $7M+ client revenue.', when: '' },
  { org: 'Zecway', role: 'Founder', fact: 'A marketing agency: inbound and content distribution.', when: '' },
  { org: 'Suggaa', role: 'Co-founder, CMO and design', fact: 'Raised $2M. The app sold for ~$4M.', when: 'Until 2024' },
  { org: 'First company', role: 'Founder', fact: 'A marketing agency. Ran it for about a year.', when: '' },
]

const DOES = ['Go-to-market', 'Product design', 'Websites and landing pages', 'PLG flows', 'Marketing', 'Sales']

/**
 * The holding page (lib/holding.ts): who Anurag is and what he does, nothing to click.
 * Served at "/" by proxy.ts while the full site waits behind it.
 */
export default function Hello() {
  let i = 0
  const d = () => ({ '--d': `${(i++ * 70) + 120}ms` }) as CSSProperties
  return (
    <main className="hold" id="main">
      <div className="hold-photo" aria-hidden="false">
        <div className="hold-panel" />
        <Image
          src={portraitCutout.src}
          alt={portraitCutout.alt}
          priority
          sizes="(min-width: 64rem) 42vw, 100vw"
          className="hold-cutout"
        />
      </div>

      <div className="hold-text">
        <p className="hold-kicker hold-in" style={d()}>
          Go-to-market · Product design
        </p>
        <h1 className="hold-name hold-in" style={d()}>
          Anurag
          <br />
          Gautam<span className="hold-dot">.</span>
        </h1>
        <p className="hold-lead hold-in" style={d()}>
          I take new technology to market.
        </p>
        <p className="hold-body hold-in" style={d()}>
          A product designer turned go-to-market leader. I’ve done every job between a product and its revenue:
          design, marketing, sales and GTM.
        </p>

        <section className="hold-block hold-in" style={d()} aria-labelledby="hold-work">
          <h2 id="hold-work" className="hold-h">Experience</h2>
          <ol className="hold-work">
            {WORK.map((w) => (
              <li key={w.org}>
                <span className="hold-org">
                  {w.org}
                  {w.when === 'Now' ? <span className="hold-now">Now</span> : null}
                </span>
                <span className="hold-role">
                  {w.role}
                  {w.when && w.when !== 'Now' ? ` · ${w.when}` : ''}
                </span>
                <span className="hold-fact">{w.fact}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="hold-block hold-in" style={d()} aria-labelledby="hold-edu">
          <h2 id="hold-edu" className="hold-h">Education</h2>
          <p className="hold-edu">
            <span className="hold-org">BIT Sindri</span>
            <span className="hold-role">Computer Science</span>
            <span className="hold-fact">Left in the second year to build companies.</span>
          </p>
        </section>

        <section className="hold-block hold-in" style={d()} aria-labelledby="hold-does">
          <h2 id="hold-does" className="hold-h">What I do</h2>
          <ul className="hold-does">
            {DOES.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>

        <p className="hold-foot hold-in" style={d()}>
          © {new Date().getFullYear()} Anurag Gautam · Bengaluru, India
        </p>
      </div>
    </main>
  )
}
