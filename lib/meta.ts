// Metadata helpers shared by the page segments.

/**
 * A page's `alternates`. Next replaces the root layout's `alternates` object instead of merging it,
 * so every page that sets a canonical re-adds the site-wide RSS autodiscovery link.
 */
export const pageAlternates = (canonical: string) => ({
  canonical,
  types: { 'application/rss+xml': '/rss.xml' },
})
