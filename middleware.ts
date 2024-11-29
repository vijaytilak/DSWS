import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    // Get Firebase Auth ID token from cookie
    const sessionCookie = request.cookies.get('session')
    const isAuthPage = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/'

    if (sessionCookie && isAuthPage) {
      // If user has a session and is trying to access auth pages, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/', '/login']
}
