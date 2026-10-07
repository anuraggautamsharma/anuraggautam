import type { StaticImageData } from 'next/image'

// Static imports give width, height and blurDataURL at build time. Three spares in
// assets/nature stay unimported, so they never ship. v3 promotes three: spare-terrain-golden
// ('guide-ridge' and 'community-golden'), spare-hero-matterhorn ('start-matterhorn') and
// spare-market-panorama ('scorecard-panorama').
import basecampHero from '@/assets/nature/basecamp-hero.jpg'
import basecampHeroM from '@/assets/nature/m/basecamp-hero-m.jpg'
import terrainFog from '@/assets/nature/terrain-fog.jpg'
import terrainFogM from '@/assets/nature/m/terrain-fog-m.jpg'
import routeValley from '@/assets/nature/route-valley.jpg'
import guideTrail from '@/assets/nature/guide-trail.jpg'
import guideRidge from '@/assets/nature/spare-terrain-golden.jpg'
import startMatterhorn from '@/assets/nature/spare-hero-matterhorn.jpg'
import scorecardPanorama from '@/assets/nature/spare-market-panorama.jpg'
import summitGolden from '@/assets/nature/summit-golden.jpg'
import summitGoldenM from '@/assets/nature/m/summit-golden-m.jpg'
import notesForestPath from '@/assets/nature/notes-forest-path.jpg'
import waypointPosition from '@/assets/nature/waypoint-position.jpg'
import waypointPrice from '@/assets/nature/waypoint-price.jpg'
import waypointMarket from '@/assets/nature/waypoint-market.jpg'
import waypointSystems from '@/assets/nature/waypoint-systems.jpg'
import waypointTeam from '@/assets/nature/waypoint-team.jpg'
import expeditionCanyon from '@/assets/nature/expedition-canyon.jpg'
import expeditionIceCave from '@/assets/nature/expedition-ice-cave.jpg'
import expeditionAurora from '@/assets/nature/expedition-aurora.jpg'
import expeditionAlpineLake from '@/assets/nature/expedition-alpine-lake.jpg'
import heroGtm from '@/assets/nature/hero-gtm.jpg'
import heroAbout from '@/assets/nature/hero-about.jpg'
import heroContact from '@/assets/nature/hero-contact.jpg'
import heroWriting from '@/assets/nature/hero-writing.jpg'
import hero404 from '@/assets/nature/hero-404.jpg'
// Anurag's own photos: graded, cropped and metadata-stripped copies. The originals folder is never imported.
import portraitSand from '@/assets/anurag/portrait-sand.jpg'
import portraitCutoutImg from '@/assets/anurag/portrait-cutout.png'
import plateHilltop from '@/assets/anurag/hilltop.jpg'
import plateBoat from '@/assets/anurag/boat.jpg'
import plateLighthouse from '@/assets/anurag/lighthouse.jpg'
import platePottery from '@/assets/anurag/pottery.jpg'

export type PhotoId =
  | 'basecamp-hero' | 'terrain-fog' | 'route-valley' | 'guide-trail' | 'guide-ridge' | 'summit-golden' | 'notes-forest-path'
  | 'waypoint-position' | 'waypoint-price' | 'waypoint-market' | 'waypoint-systems' | 'waypoint-team'
  | 'expedition-canyon' | 'expedition-ice-cave' | 'expedition-aurora' | 'expedition-alpine-lake'
  | 'hero-gtm' | 'hero-about' | 'hero-contact' | 'hero-writing' | 'hero-404'
  | 'community-golden' | 'start-matterhorn' | 'scorecard-panorama'

/** A rectangle in fractions of the image (0–1), where text is allowed to sit. */
export type Zone = { x: number; y: number; w: number; h: number }

/**
 * A local, eased scrim tinted with the photo's own shadow colour (never flat black).
 * 'left' darkens a left copy column on wide frames and becomes 'top' on the 4:5 crop.
 * `reach` stretches the fade (1 = it ends 82% of the way across; 1.25 ≈ the whole frame).
 * `aPortrait` / `reachPortrait` override both on the 4:5 crop, where text covers more of the frame.
 */
export type Scrim = {
  side: 'top' | 'bottom' | 'left'
  rgb: string /* "21 17 41" */
  a: number
  aPortrait?: number
  reach?: number
  reachPortrait?: number
}

export type NaturePhoto = {
  id: PhotoId
  src: StaticImageData
  /** 4:5 art-direction crop, served at (max-aspect-ratio: 4/5). */
  portrait?: StaticImageData
  /** Describes the scene. Never implies Anurag is shown or was there. */
  alt: string
  focal: string /* "58% 62%" */
  dominant: string /* hex, painted behind the photo while it decodes */
  tone: 'photo' | 'photo-light'
  scrim?: Scrim
  /** Paper veil (.veil-t) opacity for ink headings over mid-tone sky, photo-light only. */
  veil?: number
  zone: Zone
  zonePortrait?: Zone
  /** A bright top edge under the clear header: 'strong' raises its scrim from .42 to .62 (chrome.css). */
  headerScrim?: 'strong'
  credit: { creator: string; title: string; sourcePage: string; license: 'CC0 1.0' }
}

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`

// Default text zone for photos that only carry captions or nothing at all.
const NONE: Zone = { x: 0, y: 0, w: 0, h: 0 }

export const photos: Record<PhotoId, NaturePhoto> = {
  'basecamp-hero': {
    id: 'basecamp-hero',
    src: basecampHero,
    portrait: basecampHeroM,
    alt: 'The snow-covered Matterhorn under a streaked pink and violet sky',
    focal: '58% 62%',
    dominant: '#45365c',
    tone: 'photo',
    scrim: { side: 'top', rgb: '21 17 41', a: 0.42, aPortrait: 0.66, reachPortrait: 1.3 },
    zone: { x: 0.04, y: 0.1, w: 0.52, h: 0.42 },
    zonePortrait: { x: 0.05, y: 0.08, w: 0.9, h: 0.46 },
    credit: {
      creator: 'Sam Ferrara',
      title: 'Sunset over Matterhorn (Unsplash)',
      sourcePage: commons('Sunset_over_Matterhorn_%28Unsplash%29.jpg'),
      license: 'CC0 1.0',
    },
  },
  'terrain-fog': {
    id: 'terrain-fog',
    src: terrainFog,
    portrait: terrainFogM,
    alt: 'A dark ridge dropping into a golden, back-lit sea of cloud with teal shadows',
    focal: '24% 30%',
    dominant: '#153233',
    tone: 'photo',
    scrim: { side: 'top', rgb: '21 50 51', a: 0.6 },
    zone: { x: 0.04, y: 0.1, w: 0.46, h: 0.3 },
    zonePortrait: { x: 0.05, y: 0.08, w: 0.9, h: 0.32 },
    credit: {
      creator: 'Anton Repponen',
      title: 'Golden mountain (Unsplash)',
      sourcePage: commons('Golden_mountain_%28Unsplash%29.jpg'),
      license: 'CC0 1.0',
    },
  },
  'route-valley': {
    id: 'route-valley',
    src: routeValley,
    alt: 'A footpath winding through golden-green steppe toward the snow-capped towers of Torres del Paine',
    focal: '50% 50%',
    dominant: '#8c753d',
    tone: 'photo-light',
    veil: 0.4,
    zone: { x: 0.55, y: 0.06, w: 0.4, h: 0.24 },
    credit: {
      creator: 'Guillermo Riquelme',
      title: 'Parque Nacional Torres del Paine, Chile (Unsplash hFBwVNkEnWg)',
      sourcePage: commons('Parque_Nacional_Torres_del_Paine%2C_Chile_%28Unsplash_hFBwVNkEnWg%29.jpg'),
      license: 'CC0 1.0',
    },
  },
  'guide-trail': {
    id: 'guide-trail',
    src: guideTrail,
    alt: 'A wide alpine valley seen from a forested ridge, with snow-streaked peaks, a braided river and bright cumulus',
    focal: '50% 55%',
    dominant: '#36474a',
    tone: 'photo',
    zone: NONE,
    credit: {
      creator: 'Scott Webb',
      title: 'Green valley in the white mountains (Unsplash)',
      sourcePage: commons('Green_valley_in_the_white_mountains_%28Unsplash%29.jpg'),
      license: 'CC0 1.0',
    },
  },
  'guide-ridge': {
    id: 'guide-ridge',
    src: guideRidge,
    alt: 'Layered mountain ridges in orange haze under streaked evening cloud',
    focal: '55% 62%',
    dominant: '#a15011',
    tone: 'photo',
    zone: NONE,
    credit: {
      creator: 'Sergey Pesterev',
      title: 'Sunset in the mountains (Unsplash)',
      sourcePage: 'https://commons.wikimedia.org/wiki/File:Sunset_in_the_mountains_%28Unsplash%29.jpg',
      license: 'CC0 1.0',
    },
  },
  'summit-golden': {
    id: 'summit-golden',
    src: summitGolden,
    portrait: summitGoldenM,
    alt: 'A golden, snow-dusted ridge rising toward a blazing sunrise over a lake and cloud',
    focal: '30% 60%',
    dominant: '#e8cdb5', // the light sky, so the orange plate never sits on brown while decoding
    tone: 'photo-light',
    zone: { x: 0.04, y: 0.14, w: 0.88, h: 0.2 },
    zonePortrait: { x: 0.05, y: 0.08, w: 0.9, h: 0.26 },
    credit: {
      creator: 'Jingwei Ke',
      title: 'Sunrise at Roy’s Peak (Unsplash)',
      sourcePage: commons('Sunrise_at_Roy%27s_Peak_%28Unsplash%29.jpg'),
      license: 'CC0 1.0',
    },
  },
  'notes-forest-path': {
    id: 'notes-forest-path',
    src: notesForestPath,
    alt: 'A winding path through a sunlit pine forest with bronze autumn undergrowth',
    focal: '50% 72%', // keeps the path and drops most of the pale sky in wide bands
    dominant: '#4a422a',
    tone: 'photo',
    // v3: the /subscribe hero (copy bottom-left) and the /start "learn" door. Plates pass scrim={false}.
    scrim: { side: 'bottom', rgb: '30 28 16', a: 0.8, aPortrait: 0.84, reachPortrait: 1.3 },
    headerScrim: 'strong', // pale sky between the crowns under the wordmark
    zone: { x: 0.04, y: 0.6, w: 0.5, h: 0.32 },
    zonePortrait: { x: 0.05, y: 0.55, w: 0.9, h: 0.38 },
    credit: {
      creator: 'Josephine Wentholt',
      title: 'Twisting path in an autumn forest (Unsplash)',
      sourcePage: commons('Twisting_path_in_an_autumn_forest_%28Unsplash%29.jpg'),
      license: 'CC0 1.0',
    },
  },
  'waypoint-position': {
    id: 'waypoint-position',
    src: waypointPosition,
    alt: 'A small figure on a granite overlook above a deep-blue fjord under a sky full of cumulus',
    focal: '40% 45%',
    dominant: '#223c4a',
    tone: 'photo',
    zone: NONE,
    credit: {
      creator: 'Carl Cerstrand',
      title: 'Lysefjorden, Norway (Unsplash nyghAPuJQC8)',
      sourcePage: commons('Lysefjorden%2C_Norway_%28Unsplash_nyghAPuJQC8%29.jpg'),
      license: 'CC0 1.0',
    },
  },
  'waypoint-price': {
    id: 'waypoint-price',
    src: waypointPrice,
    alt: 'A stone cairn on a golden, sun-raked hillside under a deep-blue sky',
    focal: '38% 55%',
    dominant: '#6d4018',
    tone: 'photo',
    zone: NONE,
    credit: {
      creator: 'Bernard Spragg',
      title: 'The Stone Cairn. (15820921483)',
      sourcePage: commons('The_Stone_Cairn._%2815820921483%29.jpg'),
      license: 'CC0 1.0',
    },
  },
  'waypoint-market': {
    id: 'waypoint-market',
    src: waypointMarket,
    alt: 'Bands of yellow wildflowers across a wide green plain below banded hills',
    focal: '50% 60%',
    dominant: '#625732',
    tone: 'photo',
    zone: NONE,
    credit: {
      creator: 'Tim Mossholder',
      title: 'Painted Hills (Unsplash)',
      sourcePage: commons('Painted_Hills_%28Unsplash%29.jpg'),
      license: 'CC0 1.0',
    },
  },
  'waypoint-systems': {
    id: 'waypoint-systems',
    src: waypointSystems,
    alt: 'An aerial view of a branching glacier system with ice tongues, moraines and meltwater lakes',
    focal: '50% 55%',
    dominant: '#24394b',
    tone: 'photo',
    zone: NONE,
    credit: {
      creator: 'Forest Service Alaska Region, USDA',
      title: 'Glacier Bay National Park Aerial Survey La Perouse Glacier-Alaska',
      sourcePage: commons('Glacier_Bay_National_Park_Aerial_Survey_La_Perouse_Glacier-Alaska.jpg'),
      license: 'CC0 1.0',
    },
  },
  'waypoint-team': {
    id: 'waypoint-team',
    src: waypointTeam,
    alt: 'Two hikers, seen from behind, descending a rugged golden ridge into hazy blue valleys',
    focal: '45% 55%',
    dominant: '#846d4a',
    tone: 'photo',
    zone: NONE,
    credit: {
      creator: 'Galen Crout',
      title: 'Adventurous Mountain Hikes (Unsplash)',
      sourcePage: commons('Adventurous_Mountain_Hikes_%28Unsplash%29.jpg'),
      license: 'CC0 1.0',
    },
  },
  'expedition-canyon': {
    id: 'expedition-canyon',
    src: expeditionCanyon,
    alt: 'Coral and terracotta rock spires with green pines in a canyon',
    focal: '50% 45%',
    dominant: '#7c4332',
    tone: 'photo',
    scrim: { side: 'bottom', rgb: '4 83 49', a: 0.8 },
    zone: { x: 0.25, y: 0.64, w: 0.48, h: 0.32 },
    credit: {
      creator: 'Luca Bravo',
      title: 'Bryce Canyon National Park, United States (Unsplash ESus7wfHOas)',
      sourcePage: commons('Bryce_Canyon_National_Park%2C_United_States_%28Unsplash_ESus7wfHOas%29.jpg'),
      license: 'CC0 1.0',
    },
  },
  'expedition-ice-cave': {
    id: 'expedition-ice-cave',
    src: expeditionIceCave,
    alt: 'Inside a glacier ice cave with electric-blue scalloped walls',
    focal: '50% 50%',
    dominant: '#07252b',
    tone: 'photo',
    scrim: { side: 'bottom', rgb: '4 83 49', a: 0.8 },
    zone: { x: 0.25, y: 0.64, w: 0.48, h: 0.32 },
    credit: {
      creator: 'Steve Halama',
      title: 'Mendenhall Glacier, Juneau, United States (Unsplash)',
      sourcePage: commons('Mendenhall_Glacier%2C_Juneau%2C_United_States_%28Unsplash%29.jpg'),
      license: 'CC0 1.0',
    },
  },
  'expedition-aurora': {
    id: 'expedition-aurora',
    src: expeditionAurora,
    alt: 'Green and magenta aurora over an autumn forest line, mirrored in a still lake',
    focal: '50% 45%',
    dominant: '#503870',
    tone: 'photo',
    scrim: { side: 'bottom', rgb: '4 83 49', a: 0.8 },
    zone: { x: 0.25, y: 0.64, w: 0.48, h: 0.32 },
    credit: {
      creator: 'Alan Labisch',
      title: 'Colorful aurora borealis (Unsplash)',
      sourcePage: commons('Colorful_aurora_borealis_%28Unsplash%29.jpg'),
      license: 'CC0 1.0',
    },
  },
  'expedition-alpine-lake': {
    id: 'expedition-alpine-lake',
    src: expeditionAlpineLake,
    alt: 'The granite spires of Fitz Roy and a glacier above a turquoise alpine lake',
    focal: '50% 45%',
    dominant: '#0d2b39',
    tone: 'photo',
    scrim: { side: 'bottom', rgb: '4 83 49', a: 0.8 },
    zone: { x: 0.25, y: 0.64, w: 0.48, h: 0.32 },
    credit: {
      creator: 'Arto Marttinen',
      title: 'Fitz Roy (Unsplash)',
      sourcePage: commons('Fitz_Roy_%28Unsplash%29.jpg'),
      license: 'CC0 1.0',
    },
  },
  'hero-gtm': {
    id: 'hero-gtm',
    src: heroGtm,
    alt: 'A white line of snow and meltwater winding down from pale Dolomite peaks',
    focal: '50% 60%',
    dominant: '#857469',
    tone: 'photo',
    scrim: { side: 'left', rgb: '52 44 40', a: 0.9, aPortrait: 0.84, reach: 1.5, reachPortrait: 2.4 },
    zone: { x: 0.04, y: 0.28, w: 0.48, h: 0.52 },
    zonePortrait: { x: 0.04, y: 0.12, w: 0.92, h: 0.5 },
    credit: {
      creator: 'Raul Taciu',
      title: 'Passo Sella, Dolomites (Unsplash)',
      sourcePage: commons('Passo_Sella%2C_Dolomites_%28Unsplash%29.jpg'),
      license: 'CC0 1.0',
    },
  },
  'hero-about': {
    id: 'hero-about',
    src: heroAbout,
    alt: 'Cloud-wreathed peaks of Torres del Paine above a turquoise lake and golden steppe',
    focal: '50% 55%',
    dominant: '#79795e',
    tone: 'photo',
    scrim: { side: 'top', rgb: '36 42 34', a: 0.72, aPortrait: 0.7, reach: 1.5, reachPortrait: 2 },
    zone: { x: 0.04, y: 0.08, w: 0.46, h: 0.3 },
    zonePortrait: { x: 0.04, y: 0.12, w: 0.92, h: 0.5 },
    credit: {
      creator: 'Olga Stalska',
      title: 'Torres del Paine National Park, Chile (Unsplash)',
      sourcePage: commons('Torres_del_Paine_National_Park%2C_Chile_%28Unsplash%29.jpg'),
      license: 'CC0 1.0',
    },
  },
  'hero-contact': {
    id: 'hero-contact',
    src: heroContact,
    alt: 'A glowing green tent on a snowy mountaintop at night, with lights in the valley far below',
    focal: '50% 60%',
    dominant: '#101420',
    tone: 'photo',
    scrim: { side: 'top', rgb: '16 20 32', a: 0.25, aPortrait: 0.7, reachPortrait: 2 },
    zone: { x: 0.04, y: 0.08, w: 0.5, h: 0.3 },
    zonePortrait: { x: 0.04, y: 0.12, w: 0.92, h: 0.5 },
    credit: {
      creator: 'Sam X',
      title: 'Green tent on a snow covered mountain (Unsplash)',
      sourcePage: commons('Green_tent_on_a_snow_covered_mountain_%28Unsplash%29.jpg'),
      license: 'CC0 1.0',
    },
  },
  'hero-writing': {
    id: 'hero-writing',
    src: heroWriting,
    alt: 'A lone tree standing in a mirror-still lake under a violet and pink twilight sky',
    focal: '50% 100%', // wide frames keep the whole lake, so the copy sits on water below the tree
    dominant: '#5f61bf',
    tone: 'photo',
    scrim: { side: 'bottom', rgb: '47 40 90', a: 0.45 },
    zone: { x: 0.04, y: 0.62, w: 0.6, h: 0.3 },
    zonePortrait: { x: 0.04, y: 0.55, w: 0.92, h: 0.38 },
    credit: {
      creator: 'Ken Cheung',
      title: 'Wanaka, New Zealand (Unsplash KonWFWUaAuk)',
      sourcePage: commons('Wanaka%2C_New_Zealand_%28Unsplash_KonWFWUaAuk%29.jpg'),
      license: 'CC0 1.0',
    },
  },
  'hero-404': {
    id: 'hero-404',
    src: hero404,
    alt: 'Looking down white chalk cliffs into a wide, wind-textured cobalt sea',
    focal: '40% 50%',
    dominant: '#146082',
    tone: 'photo',
    scrim: { side: 'bottom', rgb: '0 73 115', a: 0.48, aPortrait: 0.56 },
    headerScrim: 'strong', // white chalk under the wordmark
    zone: { x: 0.48, y: 0.3, w: 0.46, h: 0.4 },
    zonePortrait: { x: 0.05, y: 0.6, w: 0.9, h: 0.32 },
    credit: {
      creator: 'Callum Wale',
      title: 'White Cliffs of Dover, United Kingdom (Unsplash R3C-jKN7vIU)',
      sourcePage: commons('White_Cliffs_of_Dover%2C_United_Kingdom_%28Unsplash_R3C-jKN7vIU%29.jpg'),
      license: 'CC0 1.0',
    },
  },
  'community-golden': {
    id: 'community-golden',
    src: guideRidge,
    alt: 'Layered mountain ridges in golden haze, with sun rays falling through evening cloud',
    focal: '55% 62%',
    dominant: '#a15011',
    tone: 'photo',
    scrim: { side: 'bottom', rgb: '58 26 8', a: 0.7, aPortrait: 0.8, reachPortrait: 1.3 },
    headerScrim: 'strong', // bright sky under the wordmark
    zone: { x: 0.04, y: 0.62, w: 0.56, h: 0.3 },
    zonePortrait: { x: 0.05, y: 0.55, w: 0.9, h: 0.38 },
    credit: {
      creator: 'Sergey Pesterev',
      title: 'Sunset in the mountains (Unsplash)',
      sourcePage: commons('Sunset_in_the_mountains_%28Unsplash%29.jpg'),
      license: 'CC0 1.0',
    },
  },
  'start-matterhorn': {
    id: 'start-matterhorn',
    src: startMatterhorn,
    alt: 'The Matterhorn wrapped in a cloud banner under a streaked pink and orange sky',
    focal: '42% 40%',
    dominant: '#3d3952',
    tone: 'photo',
    scrim: { side: 'top', rgb: '30 26 50', a: 0.6, aPortrait: 0.72, reachPortrait: 1.3 },
    zone: { x: 0.04, y: 0.08, w: 0.5, h: 0.28 },
    zonePortrait: { x: 0.05, y: 0.08, w: 0.9, h: 0.34 },
    credit: {
      creator: 'Sam Ferrara',
      title: 'Matterhorn sunset 2016 (Unsplash)',
      sourcePage: commons('Matterhorn_sunset_2016_%28Unsplash%29.jpg'),
      license: 'CC0 1.0',
    },
  },
  'scorecard-panorama': {
    id: 'scorecard-panorama',
    src: scorecardPanorama,
    alt: 'Banded rhyolite mountains above a wide green meadow in the Icelandic highlands, under a blue sky',
    focal: '45% 50%',
    dominant: '#796d40',
    tone: 'photo',
    scrim: { side: 'bottom', rgb: '34 40 14', a: 0.8, aPortrait: 0.82, reach: 1.25, reachPortrait: 1.3 },
    headerScrim: 'strong', // bright sky under the wordmark
    zone: { x: 0.04, y: 0.6, w: 0.5, h: 0.34 },
    zonePortrait: { x: 0.05, y: 0.55, w: 0.9, h: 0.38 },
    credit: {
      creator: 'Quinn Nietfeld',
      title: 'Meadow in the Icelandic mountains (Unsplash)',
      sourcePage: commons('Meadow_in_the_Icelandic_mountains_%28Unsplash%29.jpg'),
      license: 'CC0 1.0',
    },
  },
}

/** Every photo the site ships, in story order (for /credits). One row per file: two ids can share a source. */
export const photoList: readonly NaturePhoto[] = Object.values(photos).filter(
  (p, i, all) => all.findIndex((q) => q.src.src === p.src.src) === i,
)

/** Anurag's own portrait: the studio cutout on a sand square (1200×1200, head in the upper third). */
export const portrait: { src: StaticImageData; alt: string } = {
  src: portraitSand,
  alt: 'Portrait of Anurag Gautam',
}

/**
 * The same portrait as a transparent cutout (712×979, arms run off the bottom edge).
 * Place it on a flat panel colour (sand, alpine, glacier, paper or ink), bottom-aligned; focal 47% 25%.
 */
export const portraitCutout: { src: StaticImageData; alt: string } = {
  src: portraitCutoutImg,
  alt: 'Anurag Gautam, arms crossed, in a light grey T-shirt',
}

/** Public, unhashed copy of the sand portrait (byte-identical) for JSON-LD and other absolute URLs. */
export const PORTRAIT_URL = '/images/anurag-gautam.jpg'

export type FieldPlateId = 'hilltop' | 'boat' | 'lighthouse' | 'pottery'

export type FieldPlate = {
  id: FieldPlateId
  src: StaticImageData
  alt: string
  /** Plain and descriptive only: no invented places, years or stories. */
  caption?: string
  focal: string /* "52% 40%" */
  dominant: string /* hex, painted behind the photo while it decodes */
}

/** Anurag's own field photos for /about, all 4:5 (1600×2000) with one shared grade. */
export const fieldPlates: FieldPlate[] = [
  {
    id: 'hilltop',
    src: plateHilltop,
    alt: 'Anurag Gautam on a granite hilltop above a green valley',
    caption: 'On a granite hilltop.',
    focal: '52% 40%',
    dominant: '#b3ac9f',
  },
  {
    id: 'boat',
    src: plateBoat,
    alt: 'Anurag Gautam seated in a boat on a palm-lined river',
    caption: 'Backwaters, by boat.',
    focal: '51% 57%',
    dominant: '#8b8d81',
  },
  {
    id: 'lighthouse',
    src: plateLighthouse,
    alt: 'Anurag Gautam in front of a white lighthouse at night',
    caption: 'Lighthouse, after dark.',
    focal: '39% 56%',
    dominant: '#3a3a4a',
  },
  {
    id: 'pottery',
    src: platePottery,
    alt: 'Anurag Gautam painting a ceramic piece at a café table',
    caption: 'Painting pottery.',
    focal: '50% 50%',
    dominant: '#7c6b5e',
  },
]
