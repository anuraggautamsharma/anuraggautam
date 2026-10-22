import { NextResponse, type NextRequest } from 'next/server'
import { HOLDING, PREVIEW_COOKIE } from '@/lib/holding'

/**
 * Holding mode (lib/holding.ts): "/" serves the landing page, every other page redirects home.
 * Files with an extension, APIs and generated images are excluded by the matcher or below.
 */
export function proxy(req: NextRequest) {
  if (!HOLDING) return NextResponse.next()
  const url = req.nextUrl
  const preview = url.searchParams.get('preview')
  if (preview === 'full' || preview === 'off') {
    const clean = url.clone()
    clean.searchParams.delete('preview')
    const res = NextResponse.redirect(clean)
    if (preview === 'full') res.cookies.set(PREVIEW_COOKIE, '1', { maxAge: 60 * 60 * 24 * 30, path: '/', sameSite: 'lax' })
    else res.cookies.delete(PREVIEW_COOKIE)
    return res
  }
  if (req.cookies.get(PREVIEW_COOKIE)?.value === '1') return NextResponse.next()
  const p = url.pathname
  // Generated metadata images and machine-readable markdown stay reachable.
  if (/^\/(icon|apple-icon|opengraph-image|twitter-image)/.test(p) || p.endsWith('/opengraph-image') || p.startsWith('/md/')) return NextResponse.next()
  if (p === '/') return NextResponse.rewrite(new URL('/hello', req.url))
  return NextResponse.redirect(new URL('/', req.url), 307)
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
}
