import type { Metadata } from 'next'
import Image from 'next/image'
import { photoList } from '@/lib/photos'
import { pageAlternates } from '@/lib/meta'
import { pageMeta, pages } from '@/lib/site'
import { Section } from '@/components/ui/Section'
import { Icon } from '@/components/ui/icons'
import './credits.css'

export const metadata: Metadata = {
  title: pageMeta.credits.title,
  description: 'Credits for the CC0 and public-domain landscape photographs used on this site.',
  alternates: pageAlternates('/credits'),
  robots: { index: false, follow: true },
}

// lib/photos.ts imports only the photos the site ships, so the spares never appear here.
const list = photoList

/**
 * Commons titles end in an upload ID, e.g. "(Unsplash abc123)" or "(48213)", and some keep a
 * sentence full stop ("The Stone Cairn."). Show the bare name: no ID, no trailing stop.
 */
const cleanTitle = (title: string) =>
  title.replace(/\s*\((?:Unsplash[^)]*|\d+)\)\s*$/, '').replace(/\.\s*$/, '')

export default function CreditsPage() {
  return (
    <Section tone="paper" className="cr" labelledBy="cr-title">
      <div className="wrap">
        <header className="cr-head">
          <h1 id="cr-title" className="t-h1">
            {pages.credits.h1}
          </h1>
          <p className="t-lead">{pages.credits.line}</p>
        </header>

        <div className="cr-table-wrap">
          <table className="cr-table">
            <caption className="sr-only">Photographs, their creators, licences and sources</caption>
            <thead>
              <tr className="t-label">
                <th scope="col">
                  <span className="sr-only">Thumbnail</span>
                </th>
                <th scope="col">Title</th>
                <th scope="col">Creator</th>
                <th scope="col">Licence</th>
                <th scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td className="cr-thumb">
                    <Image
                      src={p.src}
                      alt={p.alt}
                      sizes="96px"
                      quality={60}
                      placeholder="blur"
                      style={{ objectPosition: p.focal }}
                    />
                  </td>
                  <th scope="row" className="cr-title">
                    {cleanTitle(p.credit.title)}
                  </th>
                  <td>{p.credit.creator}</td>
                  <td className="t-label cr-lic">{p.credit.license}</td>
                  <td>
                    <a href={p.credit.sourcePage} className="link cr-src" title={p.credit.title}>
                      Wikimedia Commons
                      <span className="sr-only">: {p.credit.title}</span>
                      <Icon name="external" size={16} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Section>
  )
}
