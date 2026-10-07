import type { CSSProperties } from 'react'
import { Section } from '@/components/ui/Section'
import { FullBleedPhoto } from '@/components/ui/FullBleedPhoto'
import { ChapterLabel } from '@/components/ui/ChapterLabel'
import { photos } from '@/lib/photos'
import { chapters, hazards, home } from '@/lib/site'
import { InViewFlag } from './InViewFlag'
import './home.css'

// Hazard plates sit over the bright cloud sea (left, top as % of the section), desktop only.
const PLACES: readonly [string, string][] = [
  ['58%', '30%'],
  ['74%', '46%'],
  ['52%', '62%'],
  ['68%', '76%'],
  ['40%', '84%'],
]
// Each plate sways on its own period so the five never move in step.
const SWAY = ['9s', '11.5s', '10s', '13s', '12s']

/** Beat 02, the fog: uncharted terrain, and the five hazards waiting in it. */
export function Terrain() {
  const copy = home.terrain
  return (
    <Section
      id="terrain"
      tone="photo"
      alt={chapters.terrain.alt}
      labelledBy="terrain-title"
      className="tr photo-stage"
      style={{ '--photo-dominant': photos['terrain-fog'].dominant } as CSSProperties}
    >
      <FullBleedPhoto id="terrain-fog" sizes="100vw" drift className="tr-photo" />
      <InViewFlag />
      <div className="tr-fog" aria-hidden="true">
        <span className="fog-a" />
        <span className="fog-b" />
      </div>
      <div className="wrap cols tr-inner">
        <div className="tr-text">
          <ChapterLabel {...chapters.terrain} />
          <h2 id="terrain-title" className="t-h1 tr-title">
            {copy.h2}
          </h2>
          <p className="t-lead tr-line">{copy.line}</p>
        </div>
      </div>
      <ul className="tr-hazards" aria-label="Hazards on the way to market">
        {hazards.map((hazard, i) => (
          <li
            key={hazard}
            className="reveal"
            style={
              {
                '--i': i,
                '--x': PLACES[i]?.[0] ?? '50%',
                '--y': PLACES[i]?.[1] ?? '50%',
                '--sway': SWAY[i] ?? '11s',
              } as CSSProperties
            }
          >
            <span className="tr-sign t-label">{hazard}</span>
          </li>
        ))}
      </ul>
    </Section>
  )
}
