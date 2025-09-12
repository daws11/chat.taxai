'use client';

import { memo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Plus, MessageSquare, Settings, User, LogOut, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Progress } from '@/components/ui/progress';
import { useI18n } from './i18n-provider';
import { LanguageSwitcher } from '@/components/language-switcher';


interface ChatSession {
  _id: string;
  title: string;
  updatedAt: string;
}

interface AppSidebarProps {
  sessions: ChatSession[];
  currentSessionId?: string;
  user?: {
    name?: string | null;
    email?: string | null;
    subscription?: {
      remainingMessages?: number;
      messageLimit?: number;
    };
  };
  onNewChat: () => void;
  onSignOut?: () => void;
}

function AppSidebarComponent({ 
  sessions, 
  currentSessionId, 
  user,
  onNewChat,
  onSignOut 
}: AppSidebarProps) {
  const router = useRouter();
  const { data: session, update } = useSession();
  // const pathname = usePathname();
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { t } = useI18n();

  // Use session data if available, otherwise fallback to prop
  const currentUser = session?.user || user;

  // Listen for session updates
  useEffect(() => {
    const handleSessionUpdate = async () => {
      if (update) {
        try {
          await update();
          console.log('Sidebar: Session refreshed after chat update');
        } catch (error) {
          console.error('Sidebar: Failed to refresh session:', error);
        }
      }
    };

    window.addEventListener('chat-session-updated', handleSessionUpdate);
    return () => {
      window.removeEventListener('chat-session-updated', handleSessionUpdate);
    };
  }, [update]);

  const handleDeleteSession = async (session: ChatSession) => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/chat/sessions/${session._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete chat session');
      }

      // If we're deleting the current session, redirect to the chat page
      if (session._id === currentSessionId) {
        router.push('/chat');
      }

      // Trigger a refresh of the sessions list
      window.dispatchEvent(new Event('chat-session-updated'));
      toast.success('Chat session deleted successfully');
    } catch (error) {
      console.error('Error deleting chat session:', error);
      toast.error('Failed to delete chat session');
    } finally {
      setIsDeleting(false);
      setSessionToDelete(null);
    }
  };

  return (
    <>
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          <span className="font-semibold">{t('talk_with_atto')}</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={onNewChat}
            >
              <Plus className="h-4 w-4" />
              {t('new_chat')}
            </Button>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t('recent_chats')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sessions.map((session) => (
                <SidebarMenuItem key={session._id}>
                  <SidebarMenuButton
                    asChild
                    isActive={session._id === currentSessionId}
                    onClick={() => router.push(`/chat/${session._id}`)}
                  >
                    <button className="w-full">
                      <MessageSquare className="h-4 w-4" />
                      <span className="truncate">
                        {session.title || 'New Chat'}
                      </span>
                    </button>
                  </SidebarMenuButton>
                  <SidebarMenuAction>
                    <div
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:text-destructive",
                        isDeleting && "pointer-events-none opacity-50"
                      )}
                      onClick={(e) => {
                        if (isDeleting) return;
                        e.stopPropagation();
                        setSessionToDelete(session);
                      }}
                      onKeyDown={(e) => {
                        if (isDeleting) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSessionToDelete(session);
                        }
                      }}
                    >
                      <span className="sr-only">Delete chat</span>
                      <Trash2 className="h-4 w-4" />
                    </div>
                  </SidebarMenuAction>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex flex-col gap-4">
          <LanguageSwitcher />
          {/* Token Progress Bar */}
          {currentUser?.subscription && typeof currentUser.subscription.remainingMessages === 'number' && typeof currentUser.subscription.messageLimit === 'number' && (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-muted-foreground">{t('message_tokens')}</span>
                <span className="text-xs font-medium">{currentUser.subscription.remainingMessages} / {currentUser.subscription.messageLimit}</span>
              </div>
              <Progress value={currentUser.subscription.messageLimit === 0 ? 0 : (currentUser.subscription.remainingMessages / currentUser.subscription.messageLimit) * 100} />
              {/* Warning/Alert */}
              {currentUser.subscription.remainingMessages <= 10 && currentUser.subscription.remainingMessages > 0 && (
                <div className="mt-2 text-xs text-yellow-600 font-semibold">
                  {t('warning_tokens_low')}
                </div>
              )}
              {currentUser.subscription.remainingMessages === 0 && (
                <div className="mt-2 text-xs text-red-600 font-semibold">
                  {t('tokens_run_out')} <a href="https://dashboard.taxai.ae/dashboard/account?tab=Subscription" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">{t('upgrade_subscription')}</a> {t('to_continue_chatting')}
                </div>
              )}
            </div>
          )}
          {/* User Info */}
          {currentUser && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {currentUser.name || currentUser.email}
                </span>
                <span className="text-xs text-muted-foreground">
                  {currentUser.email}
                </span>
              </div>
            </div>
          )}
          <Separator />
          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={() => router.push('/settings')}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            {onSignOut && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                onClick={onSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </SidebarFooter>

      <AlertDialog open={!!sessionToDelete} onOpenChange={() => setSessionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat session? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sessionToDelete && handleDeleteSession(sessionToDelete)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export const AppSidebar = memo(AppSidebarComponent); 