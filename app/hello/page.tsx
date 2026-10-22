import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import pottery from '@/assets/anurag/pottery.jpg'
import { directLine } from '@/lib/site'
import { HoldEmail, HoldStats } from './HoldFx'
import './hello.css'

const title = 'Anurag Gautam | Go-to-market, product design and content'
const description =
  'Hi, I’m Anurag. A product designer who ended up in go-to-market: Founding GTM Lead at VideoDB; co-founded Suggaa, founded Zecway and The Pipeline Lab.'

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: '/' },
  openGraph: { type: 'profile', url: '/', siteName: 'Anurag Gautam', title, description },
  twitter: { title, description },
}

const STATS = [
  { to: 2, prefix: '$', suffix: 'M', label: 'Raised for Suggaa' },
  { to: 4, prefix: '~$', suffix: 'M', label: 'When Suggaa’s app sold' },
  { to: 500, suffix: '+', label: 'Meetings booked for clients' },
  { to: 7, prefix: '$', suffix: 'M+', label: 'Revenue for clients' },
]

const WORK: { org: string; role: string; fact: string; now?: boolean; when?: string }[] = [
  { org: 'VideoDB', role: 'Founding GTM Lead', fact: 'Taking AI video infrastructure to market.', now: true },
  { org: 'The Pipeline Lab', role: 'Founder', fact: 'Built sales systems for 45–50 companies.' },
  { org: 'Zecway', role: 'Founder', fact: 'A marketing agency for content and inbound.' },
  { org: 'Suggaa', role: 'Co-founder, CMO and designer', fact: 'Designed the apps, then ran the launch.', when: 'Until 2024' },
  { org: 'My first company', role: 'Founder', fact: 'A marketing agency. Ran it for about a year.' },
]

const DOES = ['Go-to-market', 'Product design', 'Content strategy', 'Websites & landing pages', 'PLG flows', 'Marketing', 'Sales']

/**
 * The holding page (lib/holding.ts): casual and personal. Who Anurag is, what he does, where
 * to say hi. Served at "/" by proxy.ts while the full site waits behind it.
 */
export default function Hello() {
  let i = 0
  const d = () => ({ '--d': `${i++ * 80 + 520}ms` }) as CSSProperties
  const hello = 'Hi, I’m Anurag'
  return (
    <main className="hold" id="main">
      <div className="hold-photo">
        <Image
          src={pottery}
          alt="Anurag Gautam painting a pottery dog at a café"
          priority
          fill
          sizes="(min-width: 64rem) 48vw, 100vw"
          className="hold-img"
          placeholder="blur"
        />
        <p className="hold-tag" aria-hidden="true">
          Painting a pottery dog.
          <br />
          Very serious business.
        </p>
      </div>

      <div className="hold-text">
        <p className="hold-kicker hold-in" style={{ '--d': '200ms' } as CSSProperties}>
          Anurag Gautam · Bengaluru
        </p>
        <h1 className="hold-name" aria-label="Hi, I’m Anurag.">
          <span className="hold-name-line" aria-hidden="true">
            {hello.split(' ').map((word, wi, all) => {
              const start = all.slice(0, wi).join(' ').length + (wi ? 1 : 0)
              return (
                <span key={word} className="hold-word">
                  {word.split('').map((ch, k) => (
                    <span key={k} className="hold-ch" style={{ '--c': start + k } as CSSProperties}>
                      {ch}
                    </span>
                  ))}
                  {wi === all.length - 1 ? <span className="hold-dot">.</span> : null}
                  {wi < all.length - 1 ? ' ' : null}
                </span>
              )
            })}
          </span>
        </h1>
        <p className="hold-lead hold-in" style={d()}>
          I take new technology to market.
        </p>
        <p className="hold-body hold-in" style={d()}>
          I’m a product designer who ended up in go-to-market. Along the way I’ve done design, content, marketing and
          sales, so now I do the whole thing, end to end.
        </p>

        <section className="hold-block hold-in" style={d()} aria-labelledby="hold-nums">
          <h2 id="hold-nums" className="hold-h">
            A few numbers I’m proud of
          </h2>
          <HoldStats stats={STATS} />
        </section>

        <section className="hold-block hold-in" style={d()} aria-labelledby="hold-work">
          <h2 id="hold-work" className="hold-h">
            Where I’ve been
          </h2>
          <ol className="hold-work">
            {WORK.map((w) => (
              <li key={w.org}>
                <span className="hold-org">
                  {w.org}
                  {w.now ? <span className="hold-now">Now</span> : null}
                </span>
                <span className="hold-role">
                  {w.role}
                  {w.when ? <span className="hold-when"> · {w.when}</span> : null}
                </span>
                <span className="hold-fact">{w.fact}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="hold-block hold-in" style={d()} aria-labelledby="hold-does">
          <h2 id="hold-does" className="hold-h">
            What I do
          </h2>
          {/* A slow marquee of the work; the list is the content (static under reduced motion). */}
          <div className="hold-marquee">
            <ul className="hold-does">
              {DOES.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <ul className="hold-does" aria-hidden="true">
              {DOES.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="hold-block hold-in" style={d()} aria-labelledby="hold-reach">
          <h2 id="hold-reach" className="hold-h">
            Say hi
          </h2>
          <p className="hold-links">
            <HoldEmail user="anuraggautamsharma" domain="gmail.com" />
            <a className="hold-link" href={directLine.url} rel="me">
              LinkedIn
            </a>
          </p>
        </section>

        <p className="hold-foot hold-in" style={d()}>
          © {new Date().getFullYear()} Anurag Gautam. The full site is on its way.
        </p>
      </div>
    </main>
  )
}
