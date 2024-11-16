import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname

  // Define public paths that don't require authentication
  const isPublicPath = path === '/login' || path === '/signup'

  // Get the token from session cookies
  const token = request.cookies.get('session')?.value || ''

  // Redirect authenticated users away from public paths
  if (isPublicPath && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirect unauthenticated users to login
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
 
// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. /api (API routes)
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. /_vercel (Vercel internals)
     * 5. all files in /public (e.g. /favicon.ico)
     */
    '/((?!api|_next|_static|_vercel|[\\w-]+\\.\\w+).*)',
  ],
}
