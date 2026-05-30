import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  const isProtectedRoute = ['/', '/transactions', '/reports', '/notifications', '/settings'].some(
    path => pathname === path || pathname.startsWith(path + '/')
  );

  if (isProtectedRoute && !token && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/transactions',
    '/transactions/:path*',
    '/reports',
    '/reports/:path*',
    '/notifications',
    '/notifications/:path*',
    '/settings',
    '/settings/:path*',
    '/login',
  ],
};
