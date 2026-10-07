'use server'

import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { headers } from 'next/headers'
import { confirmToken, tokenMeta } from '@/lib/newsletter'

/**
 * The confirm button's POST (step 5). Link scanners only ever GET, so they never confirm.
 * Redirects back to the page with the outcome in `s`; the token leaves the URL on success.
 */
export async function confirmSubscription(fd: FormData): Promise<void> {
  const t = fd.get('t')
  const token = typeof t === 'string' ? t.trim() : ''
  const result = token ? await confirmToken(token) : 'invalid'

  if (result === 'confirmed') {
    const meta = tokenMeta(token)
    const h = await headers()
    after(async () => {
      try {
        const { track } = await import('@vercel/analytics/server')
        await track('subscribe_confirmed', { source: meta?.source ?? null, intent: meta?.intent ?? null }, { headers: h })
      } catch {
        /* analytics is best-effort */
      }
    })
    redirect('/subscribe/confirm?s=done')
  }
  if (result === 'unconfigured') redirect('/subscribe/confirm?s=paused')
  if (result === 'error') redirect(`/subscribe/confirm?t=${encodeURIComponent(token)}&s=error`)
  redirect('/subscribe/confirm?s=expired')
}
