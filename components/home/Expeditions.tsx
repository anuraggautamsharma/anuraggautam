import { Section } from '@/components/ui/Section'
import { Ridge } from '@/components/ui/Ridge'
import { FullBleedPhoto } from '@/components/ui/FullBleedPhoto'
import { ChapterLabel } from '@/components/ui/ChapterLabel'
import { Signpost, Sign } from '@/components/ui/Signpost'
import { chapters, home, ventures } from '@/lib/site'
import { ExpeditionTrack } from './ExpeditionTrack'
import { LivingPhoto, type LivingScene } from '@/components/living/LivingPhoto'
import type { PhotoId } from '@/lib/photos'
import canyonDepth from '@/assets/nature/depth/expedition-canyon-depth.webp'
import auroraDepth from '@/assets/nature/depth/expedition-aurora-depth.webp'
import lakeDepth from '@/assets/nature/depth/expedition-alpine-lake-depth.webp'
import iceDepth from '@/assets/nature/depth/expedition-ice-cave-depth.webp'

/** Each card's photograph comes alive in its own way (components/living). */
const LIVING: Partial<Record<PhotoId, { depth: string; scene: LivingScene; skyCut: number; vanish: [number, number] }>> = {
  'expedition-canyon': { depth: canyonDepth.src, scene: 'canyon', skyCut: 0.03, vanish: [0.5, 0.45] },
  'expedition-aurora': { depth: auroraDepth.src, scene: 'aurora', skyCut: 0.08, vanish: [0.5, 0.7] },
  'expedition-alpine-lake': { depth: lakeDepth.src, scene: 'lake', skyCut: 0.03, vanish: [0.55, 0.55] },
  'expedition-ice-cave': { depth: iceDepth.src, scene: 'ice', skyCut: -1, vanish: [0.55, 0.6] },
}
import './home.css'

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Beat 05, the track record. The forest rises over the sand Guide on a ridge. Desktop with full motion: a pinned horizontal trail driven by
 * native vertical scroll. Mobile: a native snap scroller. Reduced motion / no JS: a 2×2
 * grid. All three are the same server-rendered cards; CSS picks the layout, so there is no
 * hydration flip. Cards hold no interactive elements.
 */
export function Expeditions() {
  const copy = home.expeditions
  const total = pad(ventures.length)
  return (
    <Section id="expeditions" tone="forest" alt={chapters.expeditions.alt} labelledBy="expeditions-title" className="ex">
      <Ridge />
      <ExpeditionTrack>
        <div className="ex-panel">
          <ChapterLabel {...chapters.expeditions} />
          <h2 id="expeditions-title" className="t-h2 ex-title">
            {copy.h2}
          </h2>
          <p className="t-lead ex-line">{copy.line}</p>
          <p className="t-label ex-count" aria-hidden="true" data-wb-exclude="">
            <span className="ex-num">
              <span data-ex-count="">01</span> / {total}
            </span>
            <span className="ex-bar">
              <span className="ex-bar-fill" data-ex-bar="" />
            </span>
          </p>
        </div>
        {/* Focusable where it scrolls (the mobile row; ExpeditionTrack drops it from the tab
            order on desktop). It never traps focus. */}
        <div className="ex-viewport" role="region" aria-label="Expeditions" tabIndex={0}>
          <ol className="ex-track">
            {ventures.map((v, i) => (
              <li key={v.id} className="ex-card photo-stage">
                <FullBleedPhoto
                  id={v.photo}
                  sizes="(min-width:64rem) 34vw, 82vw"
                  overlay={LIVING[v.photo] ? <LivingPhoto {...LIVING[v.photo]!} fx={0.5} fy={0.5} /> : null}
                />
                {v.stats.length > 0 ? (
                  <Signpost className="ex-signs">
                    {v.stats.map((s, j) => (
                      <Sign key={s.label} value={s.value} label={s.label} countTo={s.countTo} format={s.format} c="paper" i={j} />
                    ))}
                  </Signpost>
                ) : null}
                <div className="ex-body">
                  <p className="t-label ex-meta">
                    {pad(i + 1)}
                    {v.when ? ` · ${v.when}` : null}
                  </p>
                  <h3 className="t-h3 ex-name">{v.name}</h3>
                  <p className="t-label ex-role">{v.role}</p>
                  <p className="t-small ex-text">{v.line}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </ExpeditionTrack>
    </Section>
  )
}
