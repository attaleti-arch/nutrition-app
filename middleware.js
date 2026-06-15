import { NextResponse } from 'next/server'

export function middleware(request) {
  const hostname = request.nextUrl.hostname

  if (hostname === 'eti-attal.com' || hostname === 'www.eti-attal.com') {
    return NextResponse.redirect(new URL('/landing.html', request.url))
  }
}

export const config = {
  matcher: '/',
}
