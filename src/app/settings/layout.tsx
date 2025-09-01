'use client';

import { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { AppNavbar } from '@/components/app-navbar';
import { useSession, signOut } from 'next-auth/react';
import { SidebarProvider, Sidebar, SidebarContent } from '@/components/ui/sidebar';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

interface ChatSession {
  _id: string;
  title: string;
  updatedAt: string;
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }

    const fetchSessions = async () => {
      try {
        const response = await fetch('/api/chat/sessions');
        if (!response.ok) {
          throw new Error(`Failed to fetch sessions: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Sessions API response:', data); // Debug log
        
        // Ensure data is an array before setting it
        if (Array.isArray(data)) {
          setSessions(data);
        } else if (data && typeof data === 'object' && Array.isArray(data.sessions)) {
          // Handle case where API returns { sessions: [...] }
          setSessions(data.sessions);
        } else {
          console.error('Invalid sessions data format:', data);
          setSessions([]);
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
        setSessions([]);
      }
    };

    if (status === 'authenticated' && session?.user) {
      fetchSessions();
    }

  }, [session, status, router]);

  const handleNewChat = () => {
    window.location.href = '/chat';
  };

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  // Ensure sessions is always an array before passing to AppSidebar
  const safeSessions = Array.isArray(sessions) ? sessions : [];

  return (
    <SidebarProvider defaultOpen>
      <Sidebar>
        <SidebarContent>
          <AppSidebar
            sessions={safeSessions}
            user={session?.user}
            onNewChat={handleNewChat}
            onSignOut={() => signOut({ callbackUrl: 'https://ask.taxai.ae/login' })}
          />
        </SidebarContent>
      </Sidebar>

      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden peer">
        <AppNavbar title="Settings" />
        
        <div className="flex-1 overflow-y-auto flex justify-center w-full">
          <div className="w-full max-w-4xl px-4 py-6">
            {children}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
} 