"use client";
import { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { AppNavbar } from '@/components/app-navbar';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarContent } from '@/components/ui/sidebar';

interface ChatSession {
  _id: string;
  title: string;
  updatedAt: string;
}

export default function NavbarWithSidebarClient({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentTitle, setCurrentTitle] = useState<string>('');
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    // Fetch chat sessions for sidebar
    const fetchSessions = () => {
      fetch('/api/chat/sessions')
        .then((res) => res.json())
        .then((data) => {
          setSessions(data.sessions || []);
          // Set current chat title if we're in a chat session
          if (params?.id) {
            const currentSession = data.sessions?.find((s: ChatSession) => s._id === params.id);
            if (currentSession) {
              setCurrentTitle(currentSession.title);
            }
          }
        });
    };
    fetchSessions();
    // Listen for custom event to refresh chat sessions
    const handler = () => fetchSessions();
    window.addEventListener('chat-session-updated', handler);
    return () => window.removeEventListener('chat-session-updated', handler);
  }, [params?.id]);

  const handleNewChat = () => {
    router.push('/chat');
    setCurrentTitle('');
  };

  return (
    <SidebarProvider defaultOpen>
      {/* Sidebar is a direct sibling to the main content area */}
      {/* The Sidebar component is the 'group' */}
      <Sidebar>
        <SidebarContent>
          <AppSidebar
            sessions={sessions}
            currentSessionId={params?.id as string}
            user={session?.user}
            onNewChat={handleNewChat}
            onSignOut={() => signOut()}
          />
        </SidebarContent>
      </Sidebar>

      {/* Main content area - this div is the 'peer' and takes remaining space */}
      {/* The 'peer' class allows the Sidebar to control its layout */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden peer">
        {/* Navbar */}
        <AppNavbar 
          title={currentTitle}
        />
        
        {/* Chat content area - takes remaining space and centers content */}
        {/* Use flex justify-center on the parent to center the child max-width div */}
        <div className="flex-1 overflow-y-auto flex justify-center w-full">
          {/* Content container with max width */}
          <div className="w-full max-w-4xl px-4 py-6">
            {children}
          </div>
        </div>
      </div>

      {/* Removed Sidebar Trigger - repositioning to Navbar */}

    </SidebarProvider>
  );
}
