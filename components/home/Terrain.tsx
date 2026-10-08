import type { CSSProperties } from 'react'
import { Section } from '@/components/ui/Section'
import { FullBleedPhoto } from '@/components/ui/FullBleedPhoto'
import { photos } from '@/lib/photos'
import { camps, home } from '@/lib/site'
import { Captions } from './Captions'
import { InViewFlag } from './InViewFlag'
import './home.css'

/**
 * Beat 02, into the clouds: one line, then the five places founders get stuck, arriving one at a
 * time like film captions while the flight carries on behind them.
 */
export function Terrain() {
  const copy = home.terrain
  return (
    <Section
      id="terrain"
      tone="photo"
      labelledBy="terrain-title"
      className="tr photo-stage"
      style={{ '--photo-dominant': photos['terrain-fog'].dominant } as CSSProperties}
    >
      <FullBleedPhoto id="terrain-fog" night="terrain-night" sizes="100vw" drift className="tr-photo" />
      <InViewFlag />
      <div className="tr-fog" aria-hidden="true">
        <span className="fog-a" />
        <span className="fog-b" />
      </div>
      <div className="wrap cols tr-inner">
        <div className="tr-text">
          <h2 id="terrain-title" className="t-h1 tr-title">
            {copy.h2}
          </h2>
          <p className="t-lead tr-line">{copy.line}</p>
        </div>
      </div>
      <div className="wrap tr-caps-wrap">
        <Captions className="tr-caps" lines={[...camps.map((c) => c.problem), 'Each one has a fix.']} />
      </div>
    </Section>
  )
}
