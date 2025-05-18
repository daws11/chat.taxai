'use client';
import { useState } from 'react';
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

// import { Separator } from '@/components/ui/separator';

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

export function ChatSidebar({ sessions, currentSessionId, open, onOpenChange, user }: ChatSidebarProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const isControlled = typeof open === 'boolean' && typeof onOpenChange === 'function';
  const sheetOpen = isControlled ? open : internalOpen;
  const setSheetOpen = isControlled ? onOpenChange! : setInternalOpen;
  const router = useRouter();

  const handleNewChat = () => {
    setSheetOpen(false);
    router.push('/chat');
  };

  const visibleSessions = showAll ? sessions : sessions.slice(0, 4);

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="lg:hidden bg-sidebar text-sidebar-foreground">
          Menu
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0 bg-sidebar text-sidebar-foreground sidebar">
        <SheetHeader className="p-4">
          <SheetTitle>
            {user?.name || user?.email ? `${user.name || user.email}'s Chats` : 'Your Chats'}
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-full">
          <Button onClick={handleNewChat} className="mx-4 mb-4 bg-primary text-primary-foreground">
            New Chat
          </Button>
          <ScrollArea className="flex-1 max-h-[60vh]">
            <div className="flex flex-col gap-2 p-4">
              {visibleSessions.map((session) => (
                <Link
                  key={session._id}
                  href={`/chat/${session._id}`}
                  onClick={() => setSheetOpen(false)}
                  className={`chat-link${session._id === currentSessionId ? ' active' : ''}`}
                >
                  <div>
                    <div className="font-medium truncate">{session.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(session.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}
              {sessions.length > 4 && !showAll && (
                <button
                  className="mt-2 text-primary underline text-sm hover:text-primary-foreground"
                  onClick={() => setShowAll(true)}
                >
                  Show more
                </button>
              )}
              {sessions.length > 4 && showAll && (
                <button
                  className="mt-2 text-muted-foreground underline text-sm hover:text-primary"
                  onClick={() => setShowAll(false)}
                >
                  Show less
                </button>
              )}
            </div>
          </ScrollArea>
          <div className="p-4 border-t mt-auto">
            <Button
              variant="destructive"
              className="w-full"
              onClick={() =>
                signOut({ callbackUrl: '/(auth)/login' })
              }
            >
              Logout
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
