"use client"

import { motion } from "framer-motion"
import Link from "next/link"

import { COPY } from "@/lib/copy"
import { cn } from "@/lib/utils"
import type { AppThread } from "@/types"

interface ThreadListProps {
  activeThreadId?: string | null
  onNavigate?: () => void
  threads: AppThread[]
}

function formatThreadTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return COPY.thread.justNow
  }

  const diffMinutes = Math.max(
    1,
    Math.round((Date.now() - date.getTime()) / (1000 * 60)),
  )

  if (diffMinutes < 60) {
    return `${diffMinutes}m lalu`
  }

  const diffHours = Math.round(diffMinutes / 60)

  if (diffHours < 24) {
    return `${diffHours}j lalu`
  }

  const diffDays = Math.round(diffHours / 24)
  return `${diffDays}h lalu`
}

export function ThreadList({
  activeThreadId,
  onNavigate,
  threads,
}: ThreadListProps) {
  if (!threads.length) {
    return (
      <div className="rounded-lg border border-dashed border-[#E4E4E4] p-4 text-sm leading-6 text-[#999999]">
        {COPY.sidebar.emptyThreads}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {threads.map((thread, index) => {
        const active = activeThreadId === thread.id

        return (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 10 }}
            key={thread.id}
            transition={{ delay: index * 0.04, duration: 0.22 }}
            whileHover={{ scale: 1.01 }}
          >
            <Link
              className={cn(
                "block rounded-lg border px-4 py-3 transition-colors",
                active
                  ? "border-[#D0D0D0] border-l-2 border-l-[#111111] bg-white"
                  : "border-[#E4E4E4] bg-white hover:bg-[#F8F8F8]",
              )}
              href={`/chat/${thread.id}`}
              onClick={onNavigate}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#111111]">
                    {thread.title}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs leading-5 text-[#999999]">
                    {thread.preview}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-[#999999]">
                  {formatThreadTime(thread.updatedAt)}
                </span>
              </div>
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
}
