import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// Every search and AI crawler is welcome: being cited by assistants is a goal.
// Two disallows only: /api/ (the newsletter cron, never content) and /subscribe/confirm
// (one-person confirmation links; the page is noindex too). Never /_next/. No `host`:
// it is a non-standard Yandex directive. A crawler obeys only its most specific group,
// so the named group repeats the disallows.
const AI_AND_SEARCH_BOTS = [
  'Googlebot',
  'Google-Extended',
  'Bingbot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'GPTBot',
  'Claude-SearchBot',
  'Claude-User',
  'ClaudeBot',
  'PerplexityBot',
  'Perplexity-User',
  'Applebot',
  'Applebot-Extended',
  'CCBot',
  'DuckAssistBot',
  'Amazonbot',
  'Meta-ExternalAgent',
  'MistralAI-User',
]

const DISALLOW = ['/api/', '/subscribe/confirm']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_AND_SEARCH_BOTS, allow: '/', disallow: DISALLOW },
      { userAgent: '*', allow: '/', disallow: DISALLOW },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
