"use client";
import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { ChatSidebar } from '@/components/chat-sidebar';

interface ChatSession {
  _id: string;
  title: string;
  updatedAt: string;
}

export default function NavbarWithSidebarClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    // Fetch chat sessions for sidebar
    fetch('/api/chat/sessions')
      .then((res) => res.json())
      .then((data) => setSessions(data.sessions || []));
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
        <span className="font-bold text-lg">TaxAI Chat</span>
        <div />
      </nav>
      <ChatSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        sessions={sessions}
        onSessionSelect={() => {}}
      />
      <main className="flex-1">{children}</main>
    </div>
  );
}
