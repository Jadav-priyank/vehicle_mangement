import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, verifySessionToken } from './lib/session';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. Allow Next internals, uploads, static assets, and login/auth status APIs
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/uploads') ||
    pathname === '/favicon.ico' ||
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/me'
  ) {
    return NextResponse.next();
  }

  // 2. Allow public vehicle search and viewing results without login
  if (pathname === '/') {
    return NextResponse.next();
  }
  if (pathname === '/api/vehicles' && request.method === 'GET') {
    return NextResponse.next();
  }

  // 3. Check session
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  const isAuthenticated = Boolean(session && session.username);

  // 4. Handle login page
  if (pathname === '/login') {
    if (isAuthenticated) {
      // Already logged in, redirect to home
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // 5. Protect all admin pages & restricted API routes
  if (!isAuthenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Redirect to login page
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('from', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files with extensions
     */
    '/((?!.*\\.[\\w]+$).*)',
  ],
};
