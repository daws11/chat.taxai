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
  sendMessage: (message: string, files?: File[]) => Promise<void>;
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
  const sendMessage = useCallback(async (message: string, files?: File[]) => {
    try {
      setIsLoading(true);
      setStatus('loading');
      setError(null);

      // Create optimistic UI update
      // Create messages array - if files exist, create separate bubbles
      const messagesToAdd: ThreadMessage[] = [];
      
      if (files && files.length > 0) {
        // First bubble: File attachment names
        const attachmentNames = files.map(file => file.name).join(', ');
        const attachmentMessage: ThreadMessage = {
          role: 'user',
          content: `📎 ${attachmentNames}`,
          timestamp: new Date(),
          attachments: files.map(file => ({
            name: file.name,
            type: file.type,
            size: file.size
          }))
        };
        messagesToAdd.push(attachmentMessage);
        
        // Second bubble: User text message (if not empty)
        if (message.trim()) {
          const textMessage: ThreadMessage = {
            role: 'user',
            content: message,
            timestamp: new Date()
          };
          messagesToAdd.push(textMessage);
        }
      } else {
        // Single bubble for text-only messages
        const userMessage: ThreadMessage = { 
          role: 'user', 
          content: message, 
          timestamp: new Date()
        };
        messagesToAdd.push(userMessage);
      }
      
      // Add assistant message
      const assistantMessage: ThreadMessage = { 
        role: 'assistant', 
        content: '', 
        timestamp: new Date() 
      };
      messagesToAdd.push(assistantMessage);
      
      setMessages((prev) => [...prev, ...messagesToAdd]);

      // Send API request with timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for complex queries
      
      try {
        let response;
        
        if (files && files.length > 0) {
          // Use FormData for file uploads
          const formData = new FormData();
          formData.append('message', message);
          formData.append('sessionId', sessionId);
          if (threadId) formData.append('threadId', threadId);
          
          // Append files
          files.forEach(file => {
            formData.append('files', file);
          });
          
          response = await fetch("/api/chat", {
            method: "POST",
            body: formData,
            signal: controller.signal
          });
        } else {
          // Use JSON for text-only messages
          response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              message, 
              sessionId, 
              threadId
            }),
            signal: controller.signal
          });
        }
        
        clearTimeout(timeoutId);
        
        const data = await response.json();
        console.log('API response data:', data);
        if (!response.ok) {
          if (data.message === 'Message quota exceeded') {
            setQuotaDialogOpen(true);
          }
          throw new Error(data.message || "Failed to send message");
        }
        
        // Multi-bubble support - handle multiple assistant messages properly
        if (data.messages && Array.isArray(data.messages)) {
          setMessages((prev) => {
            // Remove the empty assistant message from optimistic UI
            const newMessages = [...prev];
            while (newMessages.length && newMessages[newMessages.length - 1].role === 'assistant' && !newMessages[newMessages.length - 1].content) {
              newMessages.pop();
            }
            
            // Update the last user message with attachments if available
            if (data.userMessage && newMessages.length > 0) {
              // Find the last user message that has attachments (the file attachment bubble)
              const lastUserWithAttachmentsIndex = newMessages.findLastIndex(msg => 
                msg.role === 'user' && msg.attachments && msg.attachments.length > 0
              );
              
              if (lastUserWithAttachmentsIndex !== -1) {
                newMessages[lastUserWithAttachmentsIndex] = {
                  ...newMessages[lastUserWithAttachmentsIndex],
                  attachments: data.userMessage.attachments || []
                };
                console.log('Updated user message with attachments:', newMessages[lastUserWithAttachmentsIndex]);
              }
            }
            
            // Add all new messages, ensuring proper separation
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
            
            // Update the last user message with attachments if available
            if (data.userMessage && newMessages.length > 0) {
              // Find the last user message that has attachments (the file attachment bubble)
              const lastUserWithAttachmentsIndex = newMessages.findLastIndex(msg => 
                msg.role === 'user' && msg.attachments && msg.attachments.length > 0
              );
              
              if (lastUserWithAttachmentsIndex !== -1) {
                newMessages[lastUserWithAttachmentsIndex] = {
                  ...newMessages[lastUserWithAttachmentsIndex],
                  attachments: data.userMessage.attachments || []
                };
                console.log('Updated user message with attachments (else if):', newMessages[lastUserWithAttachmentsIndex]);
              }
            }
            
            // Find the last empty assistant message to replace
            const lastAssistantIdx = newMessages.findLastIndex(
              (m) => m.role === 'assistant' && !m.content
            );
            if (lastAssistantIdx !== -1) {
              newMessages[lastAssistantIdx] = {
                role: 'assistant',
                content: data.message.content,
                timestamp: new Date()
              };
            } else {
              // If no empty assistant message found, add a new one
              newMessages.push({
                role: 'assistant',
                content: data.message.content,
                timestamp: new Date()
              });
            }
            return newMessages;
          });
        }
        // Refresh user session for sidebar progress bar
        if (update) {
          try {
            await update();
            console.log('Session updated successfully');
          } catch (error) {
            console.error('Failed to update session:', error);
          }
        }
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