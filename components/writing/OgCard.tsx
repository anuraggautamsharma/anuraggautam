import { ImageResponse } from 'next/og'
import { OG_SIZE, loadOgFonts, svgDataUri } from '@/lib/og'

// 1200×630 social card, drawn for ImageResponse (Satori): flexbox only, inline styles,
// every multi-child element is display:flex. The v2 light card: paper, the summit mark,
// a mono label, the big ink title, and a contour tile in the topic hue on the right.

/** Hex values mirror the v2 tokens (ImageResponse cannot read CSS variables). */
const C = {
  paper: '#F7F2E8',
  ink: '#0E1D15',
  muted: '#565D57',
  line: '#D8DAD3',
  sunrise: '#F86A00',
} as const

/** Contour-tile palettes, matching `.wr-tile[data-hue]`. */
export const OG_HUES = {
  glacier: { bg: '#006191', line: '#7FCDEF' },
  sunrise: { bg: '#F86A00', line: '#812803' },
  alpine: { bg: '#106C3E', line: '#99D390' },
  granite: { bg: '#404742', line: '#A4AAA1' },
} as const
export type OgHue = keyof typeof OG_HUES

export type OgCardProps = {
  label: string // e.g. 'ANURAGGAUTAM.COM · AG-E-001'
  meta?: string // right of the label, e.g. '2026.10.06'
  title: string
  subtitle?: string
  section?: string // footer right, e.g. 'PHYSICAL AI'
  hue?: OgHue // draws the contour tile; omitted → a plain paper card
  displayFont?: string
  monoFont?: string
}

export const OG_FOOTER = 'Anurag Gautam'
// Satori trims leading spaces in a flex child, so the gap before the dash is a no-break space.
export const OG_FOOTER_TAIL = ' · GTM for complex technology'

const MONO = 'Martian Mono'

/** Every string drawn in each face, so the Google Fonts subset covers it. */
export function ogText(p: Pick<OgCardProps, 'label' | 'meta' | 'title' | 'subtitle' | 'section'>) {
  return {
    display: [p.title, p.subtitle ?? '', OG_FOOTER, OG_FOOTER_TAIL].join(''),
    mono: [p.label, p.meta ?? '', p.section ?? ''].join(''),
  }
}

function titleSize(title: string, narrow: boolean) {
  const base = narrow ? 60 : 68
  if (title.length > 80) return base - 12
  if (title.length > 52) return base - 6
  return base
}

/** The summit mark: an ink triangle with the sunrise dot, as an SVG string. */
function summitMark(ink: string = C.ink, dot: string = C.sunrise) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 6 45 42H3Z" fill="${ink}"/><circle cx="35" cy="12" r="5" fill="${dot}"/></svg>`
}

/**
 * Closed contour rings around two summits, wobbled so they read as terrain, not targets.
 * Deterministic: the same title always draws the same land.
 */
function contourSvg(line: string, seed: number, w = 380, h = 630) {
  const rings: string[] = []
  const peaks = [
    { x: w * 0.58, y: h * 0.36, n: 11, step: 30 },
    { x: w * 0.22, y: h * 0.82, n: 6, step: 26 },
  ]
  peaks.forEach((pk, pi) => {
    for (let k = 1; k <= pk.n; k++) {
      const r = k * pk.step
      const pts: string[] = []
      for (let a = 0; a < 48; a++) {
        const t = (a / 48) * Math.PI * 2
        const wob = 1 + 0.12 * Math.sin(3 * t + seed + pi) + 0.07 * Math.sin(5 * t + k * 0.6 + seed * 1.7)
        pts.push(`${(pk.x + Math.cos(t) * r * wob * 1.15).toFixed(1)},${(pk.y + Math.sin(t) * r * wob * 0.85).toFixed(1)}`)
      }
      const major = k % 5 === 0
      rings.push(
        `<polygon points="${pts.join(' ')}" fill="none" stroke="${line}" stroke-width="${major ? 3 : 1.5}" stroke-opacity="${major ? 0.8 : 0.55}"/>`,
      )
    }
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${rings.join('')}</svg>`
}

const seedOf = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7) / 97

export function OgCard({ label, meta, title, subtitle, section, hue, displayFont, monoFont }: OgCardProps) {
  const display = displayFont ?? 'sans-serif'
  const mono = monoFont ?? 'monospace'
  const tile = hue ? OG_HUES[hue] : null
  const size = titleSize(title, !!tile)
  const monoStyle = { fontFamily: mono, fontSize: 17, letterSpacing: 2.2, color: C.muted, textTransform: 'uppercase' as const }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: C.paper, color: C.ink, fontFamily: display }}>
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, padding: '56px 64px 0' }}>
        {/* Label row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Satori draws <img>, not next/image */}
            <img src={svgDataUri(summitMark())} width={44} height={44} alt="" />
            <div style={monoStyle}>{label}</div>
          </div>
          {meta ? <div style={monoStyle}>{meta}</div> : null}
        </div>

        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', flexGrow: 1, paddingBottom: 44 }}>
          <div
            style={{
              display: 'flex',
              fontSize: size,
              fontWeight: 800,
              lineHeight: 0.98,
              letterSpacing: -0.03 * size,
              maxWidth: tile ? 700 : 1020,
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div style={{ display: 'flex', fontSize: 28, fontWeight: 500, lineHeight: 1.3, color: C.muted, marginTop: 22, maxWidth: tile ? 660 : 900 }}>
              {subtitle}
            </div>
          ) : null}
        </div>

        {/* Footer line: the one sunrise blaze */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            borderTop: `2px solid ${C.ink}`,
            height: 92,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 26, fontWeight: 800, letterSpacing: -0.3 }}>
            <div style={{ display: 'flex', width: 8, height: 26, background: C.sunrise, marginRight: 16 }} />
            <span>{OG_FOOTER}</span>
            <span style={{ color: C.muted, fontWeight: 500 }}>{OG_FOOTER_TAIL}</span>
          </div>
          {section ? <div style={monoStyle}>{section}</div> : null}
        </div>
      </div>

      {tile ? (
        <div style={{ display: 'flex', width: 380, height: '100%', background: tile.bg, position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori draws <img>, not next/image */}
          <img src={svgDataUri(contourSvg(tile.line, seedOf(title)))} width={380} height={630} alt="" />
          <div
            style={{
              position: 'absolute',
              left: 205,
              top: 210,
              width: 44,
              height: 44,
              borderRadius: 999,
              background: C.paper,
              border: `3px solid ${C.ink}`,
              display: 'flex',
            }}
          />
        </div>
      ) : null}
    </div>
  )
}

/** Render a card to a PNG response, with fonts when Google Fonts is reachable. */
export async function renderOgCard(card: Omit<OgCardProps, 'displayFont' | 'monoFont'>) {
  const fonts = await loadOgFonts(ogText(card))
  const mono = fonts.find((f) => f.name === MONO)?.name
  const display = fonts.find((f) => f.name !== MONO)?.name
  return new ImageResponse(<OgCard {...card} displayFont={display} monoFont={mono} />, {
    ...OG_SIZE,
    // An empty list would drop next/og's built-in fallback face, so pass undefined instead.
    fonts: fonts.length ? fonts : undefined,
  })
}
