import type { Metadata } from 'next'
import { pageAlternates } from '@/lib/meta'
import { Basecamp } from '@/components/home/Basecamp'
import { Terrain } from '@/components/home/Terrain'
import { RouteSection } from '@/components/topo/RouteSection'
import { StackBand } from '@/components/home/StackBand'
import { Guide } from '@/components/home/Guide'
import { Expeditions } from '@/components/home/Expeditions'
import { FitBand } from '@/components/home/FitBand'
import { FieldNotes } from '@/components/home/FieldNotes'
import { SummitCta } from '@/components/story/SummitCta'
import { home } from '@/lib/site'

const title = 'Anurag Gautam | GTM Consultant for Complex Technology'
const description =
  'You built something the world hasn’t seen yet. I take it to market: end-to-end GTM for cutting-edge and deep tech founders, from AI to hardware.'

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: pageAlternates('/'),
  openGraph: { type: 'website', url: '/', siteName: 'Anurag Gautam', locale: 'en_US', title, description },
  twitter: { title, description },
}

// The next Campfire and the latest video come from data that changes without a deploy
// (an event ends, a video lands on the channel): re-render at most hourly.
export const revalidate = 3600

/**
 * The ascent: basecamp → terrain → route → stack → guide → track record → from the trail → fit → summit.
 * Proof is followed by thinking, then “is this you?”, then the ask.
 */
export default function Home() {
  return (
    <>
      <Basecamp />
      <Terrain />
      <RouteSection />
      <StackBand />
      <Guide />
      <Expeditions />
      <FieldNotes />
      <FitBand notFit={home.fit.no} notReady={home.fit.notReady} />
      <SummitCta n="08" />
    </>
  )
}
