"use client";
import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { ChatSidebar } from '@/components/chat-sidebar';
import { useSession } from 'next-auth/react';

interface ChatSession {
  _id: string;
  title: string;
  updatedAt: string;
}

export default function NavbarWithSidebarClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const { data: session } = useSession();

  useEffect(() => {
    // Fetch chat sessions for sidebar
    const fetchSessions = () => {
      fetch('/api/chat/sessions')
        .then((res) => res.json())
        .then((data) => setSessions(data.sessions || []));
    };
    fetchSessions();
    // Listen for custom event to refresh chat sessions
    const handler = () => fetchSessions();
    window.addEventListener('chat-session-updated', handler);
    return () => window.removeEventListener('chat-session-updated', handler);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <nav className="flex items-center justify-between px-4 py-2 border-b bg-background sticky top-0 z-30">
        <button
          className="inline-flex items-center justify-center rounded-md p-2 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring lg:ml-0"
          aria-label="Open menu"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center">
          <span className="font-bold text-lg">TaxAI Chat</span>
          {session?.user && (
            <span className="text-xs text-muted-foreground">{session.user.name || session.user.email}</span>
          )}
        </div>
        <div />
      </nav>
      <div className="flex-1 overflow-y-auto max-h-screen">
        <ChatSidebar
          key={sessions.length} // force re-render jika sessions berubah
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          sessions={sessions}
          onSessionSelect={() => {}}
          user={session?.user}
        />
      </div>
      <main className="flex-1">{children}</main>
    </div>
  );
}
