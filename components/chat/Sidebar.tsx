"use client"

import { MessageSquarePlus } from "lucide-react"
import Link from "next/link"

import { ThreadList } from "@/components/chat/ThreadList"
import { COPY } from "@/lib/copy"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { AppThread } from "@/types"

interface SidebarProps {
  activeThreadId?: string | null
  className?: string
  onNavigate?: () => void
  threads: AppThread[]
}

export function Sidebar({
  activeThreadId,
  className,
  onNavigate,
  threads,
}: SidebarProps) {
  return (
    <aside
      className={className}
      data-slot="sidebar"
    >
      <div className="flex h-full flex-col border-r border-[#E4E4E4] bg-white px-4 pb-4 pt-5">
        <div className="space-y-4">
          <div className="px-2">
            <p className="text-xs font-semibold text-[#111111]">
              {COPY.brandName}
            </p>
          </div>

          <Link
            className="inline-flex h-9 w-full items-center justify-center rounded border border-transparent bg-[#111111] px-4 text-sm font-medium text-white transition-colors hover:bg-[#222222]"
            href="/"
            onClick={onNavigate}
          >
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            {COPY.sidebar.newThread}
          </Link>
        </div>

        <ScrollArea className="mt-6 flex-1 pr-1">
          <ThreadList
            activeThreadId={activeThreadId}
            onNavigate={onNavigate}
            threads={threads}
          />
        </ScrollArea>

        <div className="mt-4 rounded-lg border border-[#E4E4E4] p-3 text-xs leading-5 text-[#999999]">
          {COPY.sidebar.footer}
        </div>
      </div>
    </aside>
  )
}
