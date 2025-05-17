'use client';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSubmit?: (message: string) => void;
  isLoading?: boolean;
  className?: string;
  sessionId?: string;
}

export function ChatInput({ onSubmit, isLoading, className, sessionId }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (textareaRef.current) {
      const message = textareaRef.current.value.trim();
      if (message && !isLoading) {
        if (onSubmit) {
          onSubmit(message);
        } else if (sessionId) {
          // fallback: submit to /api/chat with sessionId
          fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, sessionId }),
          });
        }
        textareaRef.current.value = '';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn('chat-input', className)}>
      <Textarea
        ref={textareaRef}
        placeholder="Type your message..."
        className="min-h-24 resize-none"
        onKeyDown={handleKeyDown}
        disabled={isLoading}
      />
      <Button
        onClick={handleSubmit}
        disabled={isLoading}
        className="mb-[3px]"
      >
        {isLoading ? (
          <span className="loader-dots"><span></span><span></span><span></span></span>
        ) : (
          'Send'
        )}
      </Button>
    </div>
  );
}
