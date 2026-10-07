import type { MetadataRoute } from 'next'
import { person } from '@/lib/site'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${person.name}: GTM for Complex Technology`,
    short_name: person.name,
    description: person.oneLiner,
    start_url: '/',
    scope: '/',
    display: 'browser',
    background_color: '#F7F2E8',
    theme_color: '#F7F2E8',
    icons: [
      { src: '/icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }
}
