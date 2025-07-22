'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ThreadMessage } from '@/lib/services/assistant-service';
import { useSession } from 'next-auth/react';
import { useState as useDialogState } from 'react';

interface UseAssistantReturn {
  messages: ThreadMessage[];
  isLoading: boolean;
  status: 'idle' | 'loading' | 'error' | 'success';
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  quotaDialogOpen: boolean;
  setQuotaDialogOpen: (open: boolean) => void;
}

export function useAssistant(sessionId: string): UseAssistantReturn {
  const { update } = useSession();
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [quotaDialogOpen, setQuotaDialogOpen] = useDialogState(false);
  const [threadId, setThreadId] = useState<string | null>(null);

  // Fetch messages on mount
  useEffect(() => {
    if (!sessionId) return;
    
    setStatus('loading');
    fetch(`/api/chat/sessions/${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch session');
        return res.json();
      })
      .then((data) => {
        if (data && data.messages) {
          setMessages(data.messages);
          setStatus('success');
        }
        if (data && data.threadId) {
          setThreadId(data.threadId);
        }
      })
      .catch((err) => {
        console.error('Error fetching messages:', err);
        setError('Failed to load messages. Please try refreshing the page.');
        setStatus('error');
      });
  }, [sessionId]);

  // Send message function
  const sendMessage = useCallback(async (message: string) => {
    try {
      setIsLoading(true);
      setStatus('loading');
      setError(null);

      // Create optimistic UI update
      const userMessage: ThreadMessage = { 
        role: 'user', 
        content: message, 
        timestamp: new Date() 
      };
      const assistantMessage: ThreadMessage = { 
        role: 'assistant', 
        content: '', 
        timestamp: new Date() 
      };
      
      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      // Send API request with timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, sessionId, threadId }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const data = await response.json();
        if (!response.ok) {
          if (data.message === 'Message quota exceeded') {
            setQuotaDialogOpen(true);
          }
          throw new Error(data.message || "Failed to send message");
        }
        
        // Multi-bubble support
        if (data.messages && Array.isArray(data.messages)) {
          setMessages((prev) => {
            // Hapus bubble assistant kosong terakhir (optimistic UI)
            let newMessages = [...prev];
            while (newMessages.length && newMessages[newMessages.length - 1].role === 'assistant' && !newMessages[newMessages.length - 1].content) {
              newMessages.pop();
            }
            // Tambahkan semua pesan assistant baru
            data.messages.forEach((msg: { role: 'user' | 'assistant'; content: string }) => {
              newMessages.push({
                role: msg.role,
                content: msg.content,
                timestamp: new Date()
              });
            });
            return newMessages;
          });
        } else if (data.message) {
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastAssistantIdx = newMessages.findLastIndex(
              (m, idx, arr) => m.role === 'assistant' && 
                            (idx === arr.length - 1 || arr[idx + 1]?.role !== 'assistant')
            );
            if (lastAssistantIdx !== -1) {
              newMessages[lastAssistantIdx] = {
                role: 'assistant',
                content: data.message.content,
                timestamp: new Date()
              };
            }
            return newMessages;
          });
        }
        // Refresh user session for sidebar progress bar
        if (update) await update();
        // Trigger sidebar refresh
        window.dispatchEvent(new Event('chat-session-updated'));
        setStatus('success');
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw err;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : "Something went wrong");
      setStatus('error');
      setMessages((prev) => {
        // Remove the last two messages (user + empty assistant)
        return prev.length >= 2 ? prev.slice(0, -2) : prev;
      });
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, threadId, update, setQuotaDialogOpen]);

  return {
    messages,
    isLoading,
    status,
    error,
    sendMessage,
    quotaDialogOpen,
    setQuotaDialogOpen,
  };
} 