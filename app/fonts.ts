import { Archivo, Martian_Mono } from 'next/font/google'

// Display + UI + short body. One variable file (wght 100–900, wdth 62–125); the only preloaded font.
export const display = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--ff-display',
  display: 'swap',
})

// Stretched roles: Archivo first, then a metric-matched Arial face from globals.css.
// The real family name comes from next/font, since production may hash it.
const archivo = display.style.fontFamily.split(',')[0]
export const ffH1 = `${archivo}, 'Archivo H1 Fallback'`                                  // .t-h1   wght 800 / wdth 106
export const ffWide = `${archivo}, 'Archivo Display Fallback'`                           // .t-display wght 800 / wdth 112
export const ffMega = `${archivo}, 'Archivo Mega Fallback', 'Archivo Mega Fallback B'`   // .t-mega wght 900 / wdth 125

// Labels, coordinates, altitudes. Unchanged from v1 (keeps its per-platform metric fallbacks).
export const mono = Martian_Mono({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--ff-mono',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  fallback: ['MartianFbMac', 'MartianFbWin', 'MartianFbLinux'],
})

// Long-form reading (Newsreader) stays route-scoped in app/writing/fonts.ts, unchanged.
// Root layout: <html className={`${display.variable} ${mono.variable}`}
//   style={{ '--ff-h1': ffH1, '--ff-wide': ffWide, '--ff-mega': ffMega } as React.CSSProperties}>
// viewport: { themeColor: '#F7F2E8', colorScheme: 'light' }
