'use client';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import type { ThreadMessage } from '@/lib/services/assistant-service';

interface ChatMessageProps extends ThreadMessage {}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isTyping = role === 'assistant' && !content;
  
  return (
    <div
      className={cn(
        'w-full py-4 px-4 md:px-6',
        role === 'assistant' ? 'bg-muted/50' : 'bg-background'
      )}
    >
      <div className="mx-auto max-w-3xl flex gap-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          {role === 'user' ? (
            <UserIcon className="w-4 h-4 text-primary" />
          ) : (
            <BotIcon className="w-4 h-4 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm mb-1">
            {role === 'user' ? 'You' : 'Atto  -  TaxAI Assistant'}
          </div>
          {isTyping ? (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : content ? (
            <div className="prose prose-sm prose-primary max-w-none dark:prose-invert">
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="mb-4 last:mb-0">
                      {children}
                    </p>
                  ),
                  a: ({ children, href }) => (
                    <a
                      href={href}
                      className="text-primary underline underline-offset-4 hover:text-primary/80"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-6 mb-4 space-y-1">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-6 mb-4 space-y-1">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="mb-1">
                      {children}
                    </li>
                  ),
                  code: ({ className, children }) => {
                    const isInline = !className?.includes('language-');
                    return isInline ? (
                      <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">
                        {children}
                      </code>
                    ) : (
                      <pre className="my-4 p-4 rounded-lg bg-muted overflow-x-auto">
                        <code className={`text-sm ${className || ''}`}>
                          {children}
                        </code>
                      </pre>
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function UserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function BotIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}
