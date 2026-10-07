// Shared plumbing for ImageResponse (next/og) images: OG cards and icons.
// Fonts come from the Google Fonts CSS2 API, subset to exactly the glyphs drawn.
// ImageResponse rejects woff2, and a request without a browser user agent gets TTF
// back, so we pick the truetype/opentype URL out of the CSS. Any failure resolves to
// "no custom font": the image still renders in the built-in face and the build never fails.

import { SUMMIT_DOT, SUMMIT_PEAK } from '@/components/layout/SummitMark'

export const OG_SIZE = { width: 1200, height: 630 } as const

/**
 * The root card (app/opengraph-image.tsx). Pages that define their own `openGraph` replace the
 * parent's wholesale, images included, so they list it explicitly. Next copies openGraph.images
 * into twitter:image, so no `twitter` override is needed (one would also drop the root's card type).
 */
export const OG_DEFAULT_IMAGE = {
  url: '/opengraph-image',
  ...OG_SIZE,
  alt: 'Anurag Gautam: GTM consultant for complex technology',
}

/**
 * Mirrors the v2 tokens in app/globals.css (ImageResponse cannot read CSS variables).
 * The first seven keys keep their v1 names so existing cards keep compiling.
 */
export const OG = {
  bg: '#F7F2E8', // paper
  surface: '#FCFAF4',
  line: '#D8DAD3', // granite-200
  text: '#0E1D15', // ink
  muted: '#565D57', // granite-700
  faint: '#717871', // granite-600
  accent: '#F86A00', // sunrise-500: route and action only
  accentInk: '#AA3B00', // sunrise-700: small text in the accent hue
  night: '#06140E',
  sand: '#F4EAD5', // sand-100
  sand200: '#E7D7B8', // sand-200: the portrait panel (portrait-sand.jpg is painted in it)
  alpine: '#106C3E', // alpine-700
  forest: '#045331', // alpine-800
  glacier: '#006191', // glacier-700
  ice: '#D3F1FC', // glacier-100
  sunrise200: '#FFD3AC',
} as const

/** Camp hues in route order (the --camp-* tokens), for colour rows on cards. */
export const OG_CAMP_HUES = ['#006191', '#AA3B00', '#106C3E', '#404742', '#6E5635'] as const

/** Font family names registered by `loadOgFonts`. Check `fonts.some(f => f.name === OG_FONT.display)`. */
export const OG_FONT = { display: 'Archivo', mono: 'Martian Mono' } as const

type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
export type OgFont = { name: string; data: ArrayBuffer; weight: Weight; style: 'normal' }

const TIMEOUT_MS = 8000

async function fetchFontFile(cssUrl: string): Promise<ArrayBuffer | null> {
  const css = await fetch(cssUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) }).then((r) => (r.ok ? r.text() : ''))
  const src = /src:\s*url\(([^)]+)\)\s*format\(['"](?:truetype|opentype)['"]\)/.exec(css)?.[1]
  if (!src) return null
  const res = await fetch(src, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  return res.ok ? res.arrayBuffer() : null
}

/**
 * Load one Google font subset to `text`. `axes` are tried in order, e.g.
 * ['wdth,wght@112,800', 'wght@800'], so a rejected width falls back to the default width.
 */
export async function loadGoogleFont(family: string, axes: string[], text: string): Promise<ArrayBuffer | null> {
  const glyphs = [...new Set(text)].join('')
  if (!glyphs) return null
  for (const axis of axes) {
    try {
      const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:${axis}&text=${encodeURIComponent(glyphs)}`
      const data = await fetchFontFile(url)
      if (data) return data
    } catch {
      // Offline CI, timeout or API change: try the next axis spec, then give up quietly.
    }
  }
  return null
}

/** Archivo 112/800 for titles and Martian Mono 87.5/500 for labels, each subset to its own text. */
export async function loadOgFonts({ display, mono }: { display: string; mono: string }): Promise<OgFont[]> {
  const [d, m] = await Promise.all([
    loadGoogleFont(OG_FONT.display, ['wdth,wght@112,800', 'wght@800'], display),
    loadGoogleFont(OG_FONT.mono, ['wdth,wght@87.5,500', 'wght@500'], mono),
  ])
  const fonts: OgFont[] = []
  if (d) fonts.push({ name: OG_FONT.display, data: d, weight: 800, style: 'normal' })
  if (m) fonts.push({ name: OG_FONT.mono, data: m, weight: 500, style: 'normal' })
  return fonts
}

/**
 * The summit mark (header logo) as an SVG string: an ink peak with a sunrise dot, on an optional
 * square background. Geometry is shared with components/layout/SummitMark.tsx.
 * A data URI is the most reliable way to draw it inside ImageResponse.
 */
export function summitMarkSvg({ peak = OG.text, dot = OG.accent, bg }: { peak?: string; dot?: string; bg?: string } = {}) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">` +
    (bg ? `<rect width="32" height="32" fill="${bg}"/>` : '') +
    `<path d="${SUMMIT_PEAK}" fill="${peak}"/>` +
    `<circle cx="${SUMMIT_DOT.cx}" cy="${SUMMIT_DOT.cy}" r="${SUMMIT_DOT.r}" fill="${dot}"/>` +
    `</svg>`
  )
}

export const svgDataUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
