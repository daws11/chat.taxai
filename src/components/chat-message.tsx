'use client';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  return (
    <div
      className={cn(
        'chat-bubble',
        role === 'assistant' ? 'assistant animate-fade-in' : 'user animate-fade-in'
      )}
    >
      <div className={cn('flex size-8 shrink-0 select-none items-center justify-center rounded-md', 
        role === 'assistant' ? 'bg-primary text-primary-foreground' : 'bg-muted')}
        style={{ float: role === 'assistant' ? 'left' : 'right', marginRight: role === 'assistant' ? 12 : 0, marginLeft: role === 'user' ? 12 : 0 }}
      >
        {role === 'assistant' ? 'AI' : 'You'}
      </div>
      <div className="flex-1 space-y-2">
        <div className="prose prose-neutral dark:prose-invert break-words">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
        {timestamp && (
          <div className="text-xs text-muted-foreground">
            {new Date(timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}
