'use client';

import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface AppNavbarProps {
  title?: string;
  className?: string;
}

export function AppNavbar({ title, className }: AppNavbarProps) {
  const { data: session } = useSession();

  return (
    <nav className={cn(
      "flex items-center justify-between px-4 py-2 border-b bg-background sticky top-0 z-30",
      className
    )}>
      <SidebarTrigger className="lg:hidden" aria-label="Open sidebar"/>
      <div className="flex-1 text-center">
        <h1 className="text-lg font-semibold truncate">
          {title || 'Atto - Your Personal Tax Assistant'}
        </h1>
      </div>
      {session?.user && (
        <div className="hidden lg:flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium">
              {session.user.name || session.user.email}
            </span>
            <span className="text-xs text-muted-foreground">
              {session.user.email}
            </span>
          </div>
        </div>
      )}
    </nav>
  );
} 