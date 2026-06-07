import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/onboarding', '/api/auth']

export function proxy(req: NextRequest) {
  const token = req.cookies.get('hotspot_token')?.value
  const { pathname } = req.nextUrl

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  // Injeta Authorization header nas chamadas para o backend
  if (pathname.startsWith('/api/v1/')) {
    const headers = new Headers(req.headers)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return NextResponse.next({ request: { headers } })
  }

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (token && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
