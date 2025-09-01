import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.redirect('https://ask.taxai.ae/login');
  response.cookies.set('next-auth.session-token', '', {
    maxAge: 0,
    path: '/',
  });
  return response;
} 