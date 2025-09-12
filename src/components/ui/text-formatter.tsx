"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface TextFormatterProps {
  content: string
  className?: string
}

export function TextFormatter({ content, className }: TextFormatterProps) {
  // Split content into paragraphs and process each one
  const paragraphs = content
    .split(/\n\s*\n/) // Split on double line breaks
    .filter(p => p.trim().length > 0) // Remove empty paragraphs
    .map(p => p.trim()) // Trim whitespace

  return (
    <div className={cn("space-y-4", className)}>
      {paragraphs.map((paragraph, index) => {
        // Check if paragraph starts with a number and period (numbered list)
        const isNumberedList = /^\d+\.\s/.test(paragraph)
        
        // Check if paragraph starts with bullet points
        const isBulletList = /^[-*•]\s/.test(paragraph)
        
        if (isNumberedList) {
          // Handle numbered list items
          const items = paragraph.split(/\n(?=\d+\.\s)/).filter(item => item.trim())
          return (
            <ol key={index} className="space-y-2 ml-4">
              {items.map((item, itemIndex) => (
                <li key={itemIndex} className="leading-7">
                  {item.replace(/^\d+\.\s/, '')}
                </li>
              ))}
            </ol>
          )
        } else if (isBulletList) {
          // Handle bullet list items
          const items = paragraph.split(/\n(?=[-*•]\s)/).filter(item => item.trim())
          return (
            <ul key={index} className="space-y-2 ml-4">
              {items.map((item, itemIndex) => (
                <li key={itemIndex} className="leading-7">
                  {item.replace(/^[-*•]\s/, '')}
                </li>
              ))}
            </ul>
          )
        } else {
          // Regular paragraph
          return (
            <p key={index} className="leading-7">
              {paragraph}
            </p>
          )
        }
      })}
    </div>
  )
}
