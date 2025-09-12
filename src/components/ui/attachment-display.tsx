"use client"

import React from "react"
import { motion } from "framer-motion"
import { FileIcon, Download, Eye } from "lucide-react"
import { cn } from "@/lib/utils"

interface AttachmentDisplayProps {
  files: File[]
  className?: string
}

export function AttachmentDisplay({ files, className }: AttachmentDisplayProps) {
  if (!files || files.length === 0) return null

  return (
    <div className={cn("mb-2 flex flex-wrap gap-2", className)}>
      {files.map((file, index) => (
        <motion.div
          key={`${file.name}-${file.lastModified}-${index}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className="group relative flex items-center gap-2 rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-2 text-sm hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30">
              <FileIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-blue-900 dark:text-blue-100 truncate max-w-[200px]">
                {file.name}
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400">
                {(file.size / 1024).toFixed(1)} KB
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="p-1 hover:bg-muted rounded"
              onClick={() => {
                const url = URL.createObjectURL(file)
                const a = document.createElement('a')
                a.href = url
                a.download = file.name
                a.click()
                URL.revokeObjectURL(url)
              }}
              title="Download file"
            >
              <Download className="h-3 w-3" />
            </button>
            <button
              className="p-1 hover:bg-muted rounded"
              onClick={() => {
                const url = URL.createObjectURL(file)
                window.open(url, '_blank')
                URL.revokeObjectURL(url)
              }}
              title="Preview file"
            >
              <Eye className="h-3 w-3" />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
