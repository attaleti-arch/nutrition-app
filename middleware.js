import { NextResponse } from 'next/server'

export function middleware(request) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname

  if (pathname === '/' && hostname.includes('eti-attal.com')) {
    return NextResponse.redirect(new URL('/landing.html', request.url))
  }
}

export const config = {
  matcher: '/',
}
