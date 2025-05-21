"use client"

import React from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/ui/copy-button"

interface MarkdownRendererProps {
  children: string
  className?: string
}

interface CodeProps {
  children: string
  className?: string
}

export function MarkdownRenderer({ children, className }: MarkdownRendererProps) {
  return (
    <div className={cn("prose prose-gray dark:prose-invert max-w-none", className)}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
              {children}
            </h4>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-medium text-primary underline underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="my-6 ml-6 list-disc [&>li]:mt-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-6 ml-6 list-decimal [&>li]:mt-2">{children}</ol>
          ),
          li: ({ children }) => <li>{children}</li>,

          // Code blocks
          pre: ({ children }) => {
            const code = React.Children.toArray(children)[0] as React.ReactElement<CodeProps>
            const codeString = code.props.children
            // const language = code.props.className?.replace("language-", "") || "text"

            return (
              <div className="group relative my-6">
                <pre className="overflow-x-auto rounded-lg border bg-muted p-4">
                  <code className="text-sm">{codeString}</code>
                </pre>
                <div className="absolute right-4 top-4 opacity-0 transition-opacity group-hover:opacity-100">
                  <CopyButton content={codeString} />
                </div>
              </div>
            )
          },

          // Inline code
          code: ({ children, className }) => {
            if (!className) {
              return (
                <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                  {children}
                </code>
              )
            }
            return null
          },

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="mt-6 border-l-2 pl-6 italic">
              {children}
            </blockquote>
          ),

          // Tables
          table: ({ children }) => (
            <div className="my-6 w-full overflow-y-auto">
              <table className="w-full">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b bg-muted/50">{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b transition-colors hover:bg-muted/50">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right">
              {children}
            </td>
          ),

          // Paragraphs
          p: ({ children }) => <p className="leading-7 [&:not(:first-child)]:mt-6">{children}</p>,

          // Horizontal rule
          hr: () => <hr className="my-8 border-t" />,
        }}
      >
        {children}
      </Markdown>
    </div>
  )
}

export default MarkdownRenderer 