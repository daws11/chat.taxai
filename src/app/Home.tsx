"use client";
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      fetch('/api/auth/token-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            // Hapus token dari URL dan reload
            const url = new URL(window.location.href);
            url.searchParams.delete('token');
            window.location.href = url.pathname + url.search;
          }
        });
    } else {
      // Cek session via API (opsional, atau biarkan NextAuth handle di /chat)
      fetch('/api/auth/session')
        .then(res => res.json())
        .then(data => {
          if (data && data.user) {
            router.replace('/chat');
          } else {
            router.replace('/login');
          }
        });
    }
  }, [searchParams, router]);

  return null;
} 