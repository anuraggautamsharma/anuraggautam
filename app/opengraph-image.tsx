import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { OG, OG_CAMP_HUES, OG_DEFAULT_IMAGE, OG_FONT, OG_SIZE, loadOgFonts, summitMarkSvg, svgDataUri } from '@/lib/og'
import { camps, home } from '@/lib/site'

// The root social card: paper on the left with the one headline, Anurag's portrait cutout on a
// sand panel on the right, and the five camps as a colour row. Satori rules: flexbox only, inline styles,
// every multi-child element is display:flex. Every asset read can fail without failing the build.

export const alt = OG_DEFAULT_IMAGE.alt
export const size = OG_SIZE
export const contentType = 'image/png'

const TITLE = home.basecamp.h1
const LINE = home.basecamp.kicker
const LABEL = 'ANURAGGAUTAM.COM'
const ROUTE = 'THE SUMMIT ROUTE'
const CAMP_LABELS = camps.map((c) => `${String(c.n).padStart(2, '0')} ${c.name.toUpperCase()}`)

const PHOTO_W = 500
const PAD = 64
// The cutout is 712×979 with ~3% headroom; bottom-aligned, the arms run off the panel's edge.
const CUT_W = 440
const CUT_H = Math.round((CUT_W * 979) / 712)

async function dataUri(rel: string, type: string, transform?: (s: string) => string): Promise<string | null> {
  try {
    const buf = await readFile(join(/*turbopackIgnore: true*/ process.cwd(), rel)) // build-time only: the route is prerendered
    const body = transform ? Buffer.from(transform(buf.toString('utf8'))) : buf
    return `data:${type};base64,${body.toString('base64')}`
  } catch {
    return null
  }
}

export default async function Image() {
  const [photo, topo, fonts] = await Promise.all([
    // Anurag's studio portrait, cut out and warm-corrected (metadata-free copy, never the original).
    dataUri('assets/anurag/portrait-cutout.png', 'image/png'),
    // The contour motif, re-inked in granite so it reads as a faint map on paper.
    dataUri('docs/design-system-v2/topo-a.svg', 'image/svg+xml', (s) => s.replace(/stroke="#000"/, `stroke="${OG.faint}"`)),
    loadOgFonts({ display: [TITLE, LINE].join(''), mono: [LABEL, ROUTE, ...CAMP_LABELS].join('') }),
  ])
  const has = (name: string) => fonts.some((f) => f.name === name)
  const display = has(OG_FONT.display) ? OG_FONT.display : 'sans-serif'
  const mono = has(OG_FONT.mono) ? OG_FONT.mono : 'monospace'
  const label = { fontFamily: mono, fontSize: 16, letterSpacing: 2.2, color: OG.muted } as const

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: OG.bg, color: OG.text, fontFamily: display }}>
        {/* Paper side */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', width: OG_SIZE.width - PHOTO_W, height: '100%', padding: PAD }}>
          {topo ? (
            // eslint-disable-next-line @next/next/no-img-element -- Satori draws <img>, not next/image
            <img src={topo} width={OG_SIZE.width - PHOTO_W} height={OG_SIZE.height} alt="" style={{ position: 'absolute', top: 0, left: 0, opacity: 0.16 }} />
          ) : null}

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Satori draws <img>, not next/image */}
            <img src={svgDataUri(summitMarkSvg())} width={40} height={40} alt="" />
            <div style={label}>{LABEL}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1 }}>
            <div style={{ display: 'flex', fontSize: 60, fontWeight: 800, lineHeight: 0.98, letterSpacing: -1.8, maxWidth: 600 }}>{TITLE}</div>
            <div style={{ display: 'flex', fontSize: 24, fontWeight: 800, lineHeight: 1.25, color: OG.muted, marginTop: 24, marginBottom: 32 }}>{LINE}</div>
          </div>

          {/* The five camps: a blaze in each camp hue, joined by the sunrise route line. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ ...label, fontSize: 14, color: OG.accentInk }}>{ROUTE}</div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {OG_CAMP_HUES.map((hue, i) => (
                <div key={hue} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ display: 'flex', width: 14, height: 34, background: hue }} />
                  {i < OG_CAMP_HUES.length - 1 ? <div style={{ display: 'flex', width: 98, height: 4, background: OG.accent }} /> : null}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 0 }}>
              {CAMP_LABELS.map((c) => (
                <div key={c} style={{ display: 'flex', width: 112, fontFamily: mono, fontSize: 11, letterSpacing: 1.2, color: OG.text }}>
                  {c}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Portrait side: the cutout on a flat sand panel, square corners, bottom-aligned. Falls back to plain sand. */}
        <div style={{ position: 'relative', display: 'flex', width: PHOTO_W, height: '100%', background: OG.sand200 }}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- Satori draws <img>, not next/image
            <img
              src={photo}
              width={CUT_W}
              height={CUT_H}
              alt=""
              style={{ position: 'absolute', bottom: 0, left: Math.round((PHOTO_W - CUT_W) / 2) }}
            />
          ) : null}
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      // An empty list would drop next/og's built-in fallback face, so pass undefined instead.
      fonts: fonts.length ? fonts : undefined,
    },
  )
}
