import { NextResponse } from 'next/server';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { User } from '@/lib/models/user';
import { encode } from 'next-auth/jwt';

export async function POST(req: Request) {
  const { token } = await req.json();
  try {
    const payload = jwt.verify(token, process.env.NEXTAUTH_SECRET!);
    if (typeof payload !== 'object' || !('email' in payload)) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }
    const email = (payload as JwtPayload).email as string;
    // Cari user di database
    await import('@/lib/db').then(m => m.connectToDatabase && m.connectToDatabase());
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }
    // Buat session token NextAuth yang valid (menggunakan encode dari next-auth/jwt)
    const sessionPayload = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
    };
    const sessionToken = await encode({
      token: sessionPayload,
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: 60 * 60 * 24, // 1 hari
    });
    const response = NextResponse.json({ success: true });
    response.cookies.set('next-auth.session-token', sessionToken, {
      httpOnly: true,
      //secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 hari
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
} 