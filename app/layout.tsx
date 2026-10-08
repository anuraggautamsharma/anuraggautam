import type { Metadata, Viewport } from 'next'
// Global tokens first, so component stylesheets imported below can override them.
import './globals.css'
import { ViewTransition } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { display, ffH1, ffMega, ffWide, mono } from './fonts'
import { SITE_URL } from '@/lib/site'
import { siteGraph } from '@/lib/schema'
import { JsonLd } from '@/components/ui/JsonLd'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { MotionRuntime } from '@/components/motion/MotionRuntime'
import { CursorLight } from '@/components/motion/CursorLight'
import { RevealObserver } from '@/components/motion/RevealObserver'
import { Magnetic } from '@/components/motion/Magnetic'
import { Parallax } from '@/components/motion/Parallax'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Anurag Gautam | GTM Consultant for Complex Technology', template: '%s | Anurag Gautam' },
  description:
    'You built something the world hasn’t seen yet. I take it to market: end-to-end GTM for cutting-edge and deep tech founders, from AI to hardware.',
  applicationName: 'Anurag Gautam',
  authors: [{ name: 'Anurag Gautam', url: `${SITE_URL}/about` }],
  creator: 'Anurag Gautam',
  // No canonical / openGraph.url here: children would inherit them.
  alternates: { types: { 'application/rss+xml': '/rss.xml' } },
  openGraph: { type: 'website', siteName: 'Anurag Gautam', locale: 'en_US' },
  twitter: { card: 'summary_large_image' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  verification: {
    google: process.env.GSC_VERIFICATION,
    other: process.env.BING_VERIFICATION ? { 'msvalidate.01': process.env.BING_VERIFICATION } : undefined,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F2E8' },
    { media: '(prefers-color-scheme: dark)', color: '#0A1410' },
  ],
  colorScheme: 'light dark',
}

// Runs before first paint (SPEC_V2 §3.1): gates JS reveals, sets the colour theme (the stored
// choice, else the visitor's own time of day: night from 7 pm to 6 am) so there is never a flash of the wrong one, restores the motion
// toggle, and releases every reveal after 2.5s if the RevealObserver never arrives.
const headScript = `(function(){var d=document.documentElement;try{var t=localStorage.getItem('ag-theme');
var h=new Date().getHours();d.setAttribute('data-theme',(t==='dark'||t==='light')?t:((h>=19||h<6)?'dark':'light'));}catch(e){d.setAttribute('data-theme','light')}
try{d.setAttribute('data-js','');
if(localStorage.getItem('ag-motion')==='off')d.setAttribute('data-motion','reduced');
setTimeout(function(){if(!d.hasAttribute('data-reveal-ready'))d.setAttribute('data-revealed','')},2500);}catch(e){}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${mono.variable}`}
      style={{ '--ff-h1': ffH1, '--ff-wide': ffWide, '--ff-mega': ffMega } as React.CSSProperties}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: headScript }} />
        <JsonLd data={siteGraph()} />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Header />
        <ViewTransition>
          <main id="main">{children}</main>
        </ViewTransition>
        <Footer />
        <MotionRuntime />
        <CursorLight />
        <RevealObserver />
        <Magnetic />
        <Parallax />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
