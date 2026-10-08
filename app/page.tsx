import type { Metadata } from 'next'
import { pageAlternates } from '@/lib/meta'
import { ScrollFilm } from '@/components/film/ScrollFilm'
import { Basecamp } from '@/components/home/Basecamp'
import { Terrain } from '@/components/home/Terrain'
import { RouteSection } from '@/components/topo/RouteSection'
import { Guide } from '@/components/home/Guide'
import { Expeditions } from '@/components/home/Expeditions'
import { SummitCta } from '@/components/story/SummitCta'

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
 * Six screens, one idea each: arrival → where founders get stuck → the five steps → the guide →
 * proof → the summit. The mountain tells the story; the words stay plain.
 */
export default function Home() {
  return (
    <>
      {/* The ascent: one scroll-played cinematic flight behind basecamp and terrain. */}
      <ScrollFilm name="ascent" night="ascent-night" className="film-scrim">
        <Basecamp />
        <Terrain />
      </ScrollFilm>
      <RouteSection />
      <Guide />
      <Expeditions />
      {/* The ending: pinned while the camera rises past the summit into the sunrise. */}
      <ScrollFilm name="summit" className="film-pin" range={[0.02, 0.84]} cssProgress>
        <SummitCta n="08" />
      </ScrollFilm>
    </>
  )
}
