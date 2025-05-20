'use client';
import { useState, useCallback, memo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { signOut } from 'next-auth/react';
import { PlusIcon, LogOutIcon, MessageSquareIcon } from 'lucide-react';

interface ChatSession {
  _id: string;
  title: string;
  updatedAt: string;
}

interface ChatSidebarProps {
  sessions: ChatSession[];
  onSessionSelect: (sessionId: string) => void;
  currentSessionId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  user?: { name?: string | null; email?: string | null };
}

function ChatSidebarComponent({ sessions, currentSessionId, open, onOpenChange, user }: ChatSidebarProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const isControlled = typeof open === 'boolean' && typeof onOpenChange === 'function';
  const sheetOpen = isControlled ? open : internalOpen;
  const setSheetOpen = isControlled ? onOpenChange! : setInternalOpen;
  const router = useRouter();

  // Memoize expensive function to improve performance
  const handleNewChat = useCallback(() => {
    setSheetOpen(false);
    router.push('/chat');
  }, [router, setSheetOpen]);

  // Get today's date and yesterday's date for relative time formatting
  const today = new Date().toDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = yesterday.toDateString();

  // Format date as relative time (Today, Yesterday, or actual date)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const dateStr = date.toDateString();
    
    if (dateStr === today) {
      return 'Today';
    } else if (dateStr === yesterdayString) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  };

  const visibleSessions = showAll ? sessions : sessions.slice(0, 10);

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        {/* <Button variant="outline" className="lg:hidden">
          Menu
        </Button> */}
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[300px] p-0 sidebar">
        <div className="flex flex-col h-full bg-[#202123] text-[#ECECF1]">
          {/* Header */}
          <div className="sidebar-header py-4 px-3">
            <SheetTitle className="text-sm font-medium text-[#ECECF1]">
              {user?.name || user?.email ? `${user.name || user.email}` : 'TaxAI Chat'}
            </SheetTitle>
          </div>
          
          {/* New Chat Button */}
          <div className="px-3 pb-2">
            <Button 
              onClick={handleNewChat} 
              className="w-full justify-start gap-2 bg-transparent hover:bg-[rgba(255,255,255,0.1)] text-[#ECECF1] border border-white/20"
            >
              <PlusIcon className="h-4 w-4" />
              <span>New chat</span>
            </Button>
          </div>
          
          {/* Chat History */}
          <div className="mt-4 px-3 text-xs font-medium text-[#8E8EA0] uppercase">
            Chat History
          </div>
          
          <ScrollArea className="flex-1 my-2">
            <div className="flex flex-col px-2">
              {visibleSessions.length > 0 ? (
                visibleSessions.map((session) => (
                  <Link
                    key={session._id}
                    href={`/chat/${session._id}`}
                    onClick={() => setSheetOpen(false)}
                    className={`chat-link ${session._id === currentSessionId ? 'active' : ''}`}
                  >
                    <MessageSquareIcon className="h-4 w-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{session.title}</div>
                      <div className="text-xs text-[#8E8EA0] truncate">
                        {formatDate(session.updatedAt)}
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-6 text-[#8E8EA0] text-sm">
                  No chat history yet
                </div>
              )}
              
              {sessions.length > 10 && (
                <div className="text-center py-2">
                  <button
                    className="text-[#8E8EA0] text-xs hover:text-[#ECECF1] transition-colors"
                    onClick={() => setShowAll(!showAll)}
                  >
                    {showAll ? 'Show less' : 'Show more'}
                  </button>
                </div>
              )}
            </div>
          </ScrollArea>
          
          {/* User Controls */}
          <div className="mt-auto p-3 border-t border-white/10">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 bg-transparent hover:bg-[rgba(255,255,255,0.1)] text-[#ECECF1] border border-white/20"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOutIcon className="h-4 w-4" />
              <span>Log out</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Use memo to prevent unnecessary re-renders
export const ChatSidebar = memo(ChatSidebarComponent);
