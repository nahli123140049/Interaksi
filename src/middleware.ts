import { NextResponse, type NextRequest } from 'next/server';

/**
 * INTERAKSI Security Middleware
 * 
 * 1. Route Obfuscation: Dihapus agar admin bisa akses lewat /admin normal
 * 2. Security header enforcement pada semua response
 */

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Lanjutkan request untuk rute lainnya
  const response = NextResponse.next();

  // Tambahkan header anti-indexing agar tidak masuk Google Search
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
}

// Konfigurasi rute mana saja yang diproses middleware
export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
  ]
};
