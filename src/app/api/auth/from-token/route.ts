import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    // Verifikasi JWT
    const user = jwt.verify(token, process.env.NEXTAUTH_SECRET!);

    // Redirect ke halaman utama tanpa query token
    const url = new URL(req.url);
    url.searchParams.delete('token');
    const res = NextResponse.redirect(url);
    // Set session cookie on the response
    res.cookies.set('next-auth.session-token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 hari
    });
    return res;
  } catch (e) {
    // Token invalid/expired
    return NextResponse.redirect(new URL('/login', req.url));
  }
} 