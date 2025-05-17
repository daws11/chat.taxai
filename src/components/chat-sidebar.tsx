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
}

export function ChatSidebar({ sessions, currentSessionId, open, onOpenChange }: ChatSidebarProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof open === 'boolean' && typeof onOpenChange === 'function';
  const sheetOpen = isControlled ? open : internalOpen;
  const setSheetOpen = isControlled ? onOpenChange! : setInternalOpen;
  const router = useRouter();

  const handleNewChat = () => {
    setSheetOpen(false);
    router.push('/chat');
  };

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="lg:hidden">
          Menu
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="p-4">
          <SheetTitle>Your Chats</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-full">
          <Button onClick={handleNewChat} className="mx-4 mb-4">
            New Chat
          </Button>
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-2 p-4">
              {sessions.map((session) => (
                <Link
                  key={session._id}
                  href={`/chat/${session._id}`}
                  onClick={() => setSheetOpen(false)}
                >
                  <div
                    className={`p-3 rounded-lg hover:bg-muted transition-colors ${
                      session._id === currentSessionId ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="font-medium truncate">{session.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(session.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}
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
