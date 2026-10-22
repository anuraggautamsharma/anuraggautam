/**
 * Holding mode: anuraggautam.com shows a single landing page (app/hello) while the full site
 * stays built and deployed behind it. Every other page redirects home; feeds, machine files
 * and APIs keep working. Set to false to bring the full site back.
 *
 * Preview the full site while holding: visit /?preview=full (a 30-day cookie); /?preview=off ends it.
 */
export const HOLDING = true
export const PREVIEW_COOKIE = 'ag-full'
