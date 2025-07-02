import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const token = url.searchParams.get('token');

  // Hanya jalankan pada halaman utama, bukan API/static
  const isApi = url.pathname.startsWith('/api');
  const isStatic = url.pathname.startsWith('/_next') || url.pathname.startsWith('/favicon.ico');
  if (isApi || isStatic) {
    return NextResponse.next();
  }

  if (token) {
    // Redirect ke API route untuk verifikasi dan pembuatan session
    const fromTokenUrl = new URL('/api/auth/from-token', req.url);
    fromTokenUrl.searchParams.set('token', token);
    return NextResponse.redirect(fromTokenUrl);
  }

  // Jika tidak ada token, biarkan NextAuth/session checker berjalan seperti biasa
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Proteksi semua route kecuali API, static, login, register
    '/((?!api|_next/static|_next/image|favicon.ico|login|register).*)',
  ],
}; 