import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.redirect('https://dashboard.taxai.ae/');
  response.cookies.set('next-auth.session-token', '', {
    maxAge: 0,
    path: '/',
  });
  return response;
} 