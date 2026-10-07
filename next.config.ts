import type { NextConfig } from 'next'
import { withContentCollections } from '@content-collections/next'

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [60, 75],
    // SPEC_V2 §6: full-bleeds top out at 2400w (the source width); plates use 96 / 256 / 400.
    deviceSizes: [640, 828, 1080, 1440, 1920, 2400],
    imageSizes: [96, 256, 400],
    minimumCacheTTL: 2678400,
    // Video posters (PLAN_V3 §5): YouTube thumbnails only, no query strings.
    remotePatterns: [{ protocol: 'https', hostname: 'i.ytimg.com', pathname: '/vi/**', search: '' }],
  },
  async redirects() {
    // v1's /gtm is now /method. The browser keeps any #hash across the redirect.
    // Browsers and crawlers still ask for /favicon.ico; the generated 32px app/icon answers it.
    return [
      { source: '/gtm', destination: '/method', permanent: true },
      { source: '/favicon.ico', destination: '/icon/32', permanent: false },
    ]
  },
  async headers() {
    return [
      {
        source: '/textures/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ]
  },
}

// withContentCollections must be the outermost wrapper
export default withContentCollections(nextConfig)
